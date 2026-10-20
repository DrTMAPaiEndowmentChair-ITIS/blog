#!/usr/bin/env python3
"""Read hardware inventory; report candidates without executing specialized kernels."""

import importlib.metadata
import json
import os
import platform
import re
import shutil
import subprocess
from pathlib import Path


def command(arguments):
    if not shutil.which(arguments[0]):
        return None
    try:
        result = subprocess.run(arguments, capture_output=True, text=True, timeout=8, check=False)
        return result.stdout.strip() if result.returncode == 0 else None
    except (OSError, subprocess.TimeoutExpired):
        return None


def linux_cpu(text):
    cores = []
    model = None
    for block in text.strip().split("\n\n"):
        fields = dict(line.split(":", 1) for line in block.splitlines() if ":" in line)
        fields = {key.strip(): value.strip() for key, value in fields.items()}
        model = model or fields.get("model name") or fields.get("Hardware")
        feature_text = fields.get("flags", fields.get("Features"))
        if feature_text is not None:
            cores.append(set(feature_text.split()))
    common = set.intersection(*cores) if cores else set()
    union = set.union(*cores) if cores else set()
    return {"model": model, "reported_feature_sets": len(cores),
            "common_features": sorted(common), "features_on_some_cores": sorted(union - common)}


def read_text(path):
    try:
        return Path(path).read_text().strip()
    except (OSError, UnicodeError):
        return None


def linux_queue_engines(directory):
    root = Path(directory)
    if not root.exists():
        return []
    return [{"kind": "DSA" if node.name.startswith("dsa") else "IAA", "device": node.name}
            for node in sorted(root.iterdir()) if re.fullmatch(r"(?:dsa|iax)\d+", node.name)]


def collect():
    system = platform.system()
    result = {
        "schema_version": 1,
        "system": {"os": system, "release": platform.release(), "architecture": platform.machine()},
        "cpu": {"logical_cpus": os.cpu_count()},
        "accelerators": [],
        "installed_packages": {},
        "notes": [
            "Inventory is not a kernel execution test or a model-placement report.",
            "Missing information is unknown, not evidence that a feature is absent.",
        ],
    }
    if system == "Linux":
        cpuinfo = read_text("/proc/cpuinfo")
        if cpuinfo:
            result["cpu"].update(linux_cpu(cpuinfo))
        meminfo = read_text("/proc/meminfo") or ""
        for line in meminfo.splitlines():
            if line.startswith("MemTotal:"):
                result["system"]["memory_bytes"] = int(line.split()[1]) * 1024
        for kind, directory in [("GPU display/render device", "/sys/class/drm"),
                                ("accelerator device", "/sys/class/accel")]:
            root = Path(directory)
            if root.exists():
                for node in sorted(root.iterdir()):
                    if (node / "device/vendor").exists() and "-" not in node.name:
                        result["accelerators"].append({
                            "kind": kind, "device": node.name,
                            "pci_vendor": read_text(node / "device/vendor"),
                            "pci_device": read_text(node / "device/device"),
                        })
        result["accelerators"].extend(linux_queue_engines("/sys/bus/dsa/devices"))
        result["notes"].append("Linux CPU flags are kernel-exposed features; AMX permission and backend support remain separate checks.")
    elif system == "Darwin":
        queries = {"model": "machdep.cpu.brand_string", "memory_bytes": "hw.memsize",
                   "neon": "hw.optional.neon", "dot_product": "hw.optional.arm.FEAT_DotProd",
                   "i8mm": "hw.optional.arm.FEAT_I8MM", "bf16": "hw.optional.arm.FEAT_BF16",
                   "sve": "hw.optional.arm.FEAT_SVE", "sme": "hw.optional.arm.FEAT_SME",
                   "sme2": "hw.optional.arm.FEAT_SME2"}
        observed = {key: command(["sysctl", "-n", name]) for key, name in queries.items()}
        result["cpu"]["sysctl_observations"] = observed
        if observed["memory_bytes"] and observed["memory_bytes"].isdigit():
            result["system"]["memory_bytes"] = int(observed["memory_bytes"])
        result["notes"].append("Apple sysctl feature names vary with OS and processor. Core ML placement requires a separate model report.")
    elif system == "Windows":
        result["cpu"]["model"] = platform.processor() or None
        result["notes"].append("This portable probe does not establish Windows CPUID/XSTATE or DirectML/NPU availability. Use the runtime's capability report.")
    for name in ("mlx", "mlx-lm", "torch", "onnxruntime", "openvino", "llama-cpp-python"):
        try:
            result["installed_packages"][name] = importlib.metadata.version(name)
        except importlib.metadata.PackageNotFoundError:
            pass
    return result


if __name__ == "__main__":
    print(json.dumps(collect(), indent=2))
