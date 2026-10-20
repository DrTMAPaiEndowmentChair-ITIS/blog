---
name: hardware-inference-tuning
description: Profile and optimize an existing inference workload for its actual CPU, GPU, or NPU, using hardware inventory, runtime capability checks, and reproducible benchmarks. Use for MLX and Mac Studio tuning, CPU SIMD dispatch, backend selection, quantization, and inference performance investigations.
---

# Hardware-aware inference tuning

Optimize the user's workload against a named latency, capacity, quality, or throughput target. Preserve a working baseline and compare one change at a time. A CPU feature or a device name is evidence to investigate a backend, not proof that a model can run on it.

## Establish the execution path

Run `python3 scripts/probe_hardware.py` from this skill directory. It reads local inventory without installing software, allocating model weights, running specialized instructions, or changing system settings. Keep unknown features unknown. On Linux, the intersection of exposed per-core flags is more conservative than the union; neither grants AMX tile-state permission.

Record the model revision, runtime version, weight representation, actual kernel arithmetic, context length, batch/concurrency, and cache state. A 4-bit checkpoint can use floating-point activations and accumulation. An installed Python package does not establish a usable accelerator backend.

- Apple silicon: distinguish MLX CPU/GPU execution, Metal/MPS, Accelerate/BNNS, and Core ML's permitted compute units. Unified memory removes some copies; it does not remove bandwidth, residency, synchronization, or working-set limits. Do not infer Neural Engine use from MLX or a Core ML `.all` setting; inspect placement.
- x86: verify instruction subsets and OS-managed vector state before selecting a specialized kernel. AMX needs hardware, kernel support, tile-state permission, suitable types/shapes, and a runtime implementation. Keep a baseline dispatch path.
- Arm and other CPUs: detect the implemented vector/matrix features; do not equate Arm with SVE/SME, RISC-V with RVV, or a processor family with every optional extension.
- GPU/NPU: check graph/operator support, layout, shapes, precision, memory placement, and fallbacks. Quantization metadata and packing conventions are part of backend compatibility.

## Measure the bottleneck

Separate model loading, prompt prefill, first-token latency, steady-state decode, tokenization/sampling, and request scheduling. Compare cold and warm cache states separately. Account for lazy/asynchronous execution at measurement boundaries, without synchronizing after every operation in the real serving loop.

Hold the prompt corpus, output length, sampling settings, and quality checks fixed. Warm up independently, collect repeated measurements, and record memory pressure and thermal conditions. Report the machine and workload with the result; do not extrapolate a synthetic matrix benchmark to end-to-end generation.

`scripts/summarize_benchmarks.py` accepts JSONL observations from any backend. Each line contains `backend`, `model`, `precision`, `cache`, `prompt_tokens`, `token_times_ms`, and `elapsed_ms`. Token timestamps are milliseconds relative to that request's start. Optional `concurrency` distinguishes different load settings. For example, collect actual timestamps from a streaming client rather than filling in illustrative numbers.

The report separates workloads and gives observed TTFT, end-to-end latency, and average decode gap distributions. It deliberately does not infer aggregate requests/second from independent per-request clocks. For aggregate throughput, measure a shared wall-clock interval around the complete concurrent workload.

## Make and verify the change

Pick the smallest intervention that addresses the measured limit: weight/KV representation or capacity, kernel coverage, prompt reuse, batching, scheduling, thread placement, layout/packing, or launch overhead. Verify output correctness and the target metric after each change. Profile partition boundaries before assuming that sending more work to an accelerator helps.

Do not silently enable CPU fallback during a backend comparison. Report fallback explicitly and time it. Avoid changing global power policy, OS memory limits, driver settings, or framework installations unless the user authorized those operations.

Return the baseline and candidate configurations, measured distributions, correctness results, and the reproducible command. If the change fails the objective, keep the baseline and explain the limiting observation.
