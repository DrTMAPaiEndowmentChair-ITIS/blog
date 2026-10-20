#!/usr/bin/env python3
"""Summarize real request timings without conflating cache/workload configurations."""

import argparse
import json
import math
import statistics
from collections import defaultdict
from pathlib import Path


def finite_number(value, label):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValueError(f"{label} must be a finite number")
    return value


def percentile(values, fraction):
    values = sorted(values)
    position = (len(values) - 1) * fraction
    lower = math.floor(position)
    upper = math.ceil(position)
    return values[lower] + (values[upper] - values[lower]) * (position - lower)


def distribution(values):
    return {"samples": len(values), "p50_ms": statistics.median(values),
            "p95_ms": percentile(values, 0.95)} if values else None


def summarize(records):
    groups = defaultdict(list)
    for index, record in enumerate(records, 1):
        if not isinstance(record, dict):
            raise ValueError(f"record {index}: expected a JSON object")
        times = record.get("token_times_ms")
        if not isinstance(times, list) or not times:
            raise ValueError(f"record {index}: token_times_ms needs at least one observed token")
        times = [finite_number(value, f"record {index} token timestamp") for value in times]
        elapsed = finite_number(record.get("elapsed_ms"), f"record {index} elapsed_ms")
        if times[0] < 0 or any(b < a for a, b in zip(times, times[1:])) or elapsed < times[-1]:
            raise ValueError(f"record {index}: timestamps must be ordered request-relative milliseconds within elapsed_ms")
        prompt = record.get("prompt_tokens")
        concurrency = record.get("concurrency", 1)
        if type(prompt) is not int or prompt < 0 or type(concurrency) is not int or concurrency < 1:
            raise ValueError(f"record {index}: invalid prompt_tokens or concurrency")
        keys = ("backend", "model", "precision", "cache")
        if any(not isinstance(record.get(key), str) or not record[key] for key in keys):
            raise ValueError(f"record {index}: backend, model, precision, and cache must be nonempty strings")
        key = tuple(record[name] for name in keys) + (prompt, len(times), concurrency)
        groups[key].append({"ttft": times[0], "elapsed": elapsed,
                            "decode_gap": (times[-1] - times[0]) / (len(times) - 1) if len(times) > 1 else None})
    report = []
    for key, rows in sorted(groups.items()):
        backend, model, precision, cache, prompt, output, concurrency = key
        report.append({
            "workload": {"backend": backend, "model": model, "precision": precision, "cache": cache,
                         "prompt_tokens": prompt, "output_tokens": output, "concurrency": concurrency},
            "ttft": distribution([row["ttft"] for row in rows]),
            "end_to_end": distribution([row["elapsed"] for row in rows]),
            "mean_decode_gap": distribution([row["decode_gap"] for row in rows if row["decode_gap"] is not None]),
        })
    return {"schema_version": 1, "units": "milliseconds", "groups": report,
            "note": "Percentiles describe observed requests. Aggregate throughput requires a shared workload clock and is not inferred here."}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path, help="JSONL request observations")
    args = parser.parse_args()
    try:
        records = [json.loads(line) for line in args.input.read_text().splitlines() if line.strip()]
        if not records:
            raise ValueError("input contains no observations")
        print(json.dumps(summarize(records), indent=2, allow_nan=False))
    except (OSError, ValueError, TypeError) as error:
        parser.error(str(error))


if __name__ == "__main__":
    main()
