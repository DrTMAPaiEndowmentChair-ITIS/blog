import importlib.util
import sys
import unittest
from tempfile import TemporaryDirectory
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SCRIPTS = ROOT / "public/downloads/hardware-inference-tuning/scripts"
# The modules are public download assets; tests must not add bytecode beside them.
sys.dont_write_bytecode = True


def module(name):
    spec = importlib.util.spec_from_file_location(name, SCRIPTS / (name + ".py"))
    loaded = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(loaded)
    return loaded


probe = module("probe_hardware")
bench = module("summarize_benchmarks")


def observation(**overrides):
    return {"backend": "example", "model": "test-fixture", "precision": "fp16", "cache": "cold",
            "prompt_tokens": 128, "token_times_ms": [120, 140, 160, 180, 200],
            "elapsed_ms": 210, **overrides}


class HardwareInventoryTests(unittest.TestCase):
    def test_heterogeneous_cores_keep_common_and_partial_features_separate(self):
        result = probe.linux_cpu("processor: 0\nmodel name: Example\nflags: sse avx avx2\n\nprocessor: 1\nflags: sse avx\n")
        self.assertEqual(result["common_features"], ["avx", "sse"])
        self.assertEqual(result["features_on_some_cores"], ["avx2"])

    def test_missing_flags_remain_unknown(self):
        result = probe.linux_cpu("processor: 0\nmodel name: Example\n")
        self.assertEqual(result["reported_feature_sets"], 0)
        self.assertEqual(result["common_features"], [])

    def test_iaa_uses_dsa_bus_without_counting_work_queues_as_engines(self):
        with TemporaryDirectory() as directory:
            for name in ["dsa0", "iax1", "wq0.0", "engine0.0", "group0.0"]:
                (Path(directory) / name).mkdir()
            self.assertEqual(probe.linux_queue_engines(directory), [
                {"kind": "DSA", "device": "dsa0"}, {"kind": "IAA", "device": "iax1"}])


class TimingTests(unittest.TestCase):
    def test_first_token_is_counted_once(self):
        group = bench.summarize([observation()])["groups"][0]
        self.assertEqual(group["ttft"]["p50_ms"], 120)
        self.assertEqual(group["mean_decode_gap"]["p50_ms"], 20)
        self.assertEqual(group["end_to_end"]["p50_ms"], 210)

    def test_single_token_has_no_decode_gap(self):
        group = bench.summarize([observation(token_times_ms=[120], elapsed_ms=130)])["groups"][0]
        self.assertIsNone(group["mean_decode_gap"])

    def test_cache_and_concurrency_are_not_pooled(self):
        report = bench.summarize([observation(), observation(cache="warm"), observation(concurrency=2)])
        self.assertEqual(len(report["groups"]), 3)

    def test_invalid_timestamps_fail_instead_of_producing_a_speedup(self):
        for changes in [{"token_times_ms": [30, 20]}, {"token_times_ms": [-1]},
                        {"token_times_ms": [300]}, {"token_times_ms": [float("nan")]},
                        {"token_times_ms": [True]}]:
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                bench.summarize([observation(**changes)])

    def test_non_object_records_fail_clearly(self):
        with self.assertRaises(ValueError):
            bench.summarize([[]])

    def test_percentiles_use_observations(self):
        self.assertEqual(bench.percentile([10, 20, 30], 0.5), 20)
        self.assertAlmostEqual(bench.percentile([10, 20, 30], 0.95), 29)


if __name__ == "__main__":
    unittest.main()
