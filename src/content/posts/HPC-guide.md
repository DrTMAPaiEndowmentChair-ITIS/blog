---
title: 'HPC Guide'
pubDate: '2025-09-10'
---

## Overview

This guide shows how to use Astral’s `uv` for fast, reproducible Python environments on HPC systems, install PyTorch with CUDA for NVIDIA A100 GPUs, tune performance (data loading, AMP/TF32, memory format, compile, CUDA Graphs, DDP), and monitor with `nvidia-smi`, `nvtop`, and NVIDIA Nsight tools.

Links you’ll use often:

- uv docs: [docs.astral.sh/uv](https://docs.astral.sh/uv/)
- PyTorch install matrix: [pytorch.org/get-started/locally](https://pytorch.org/get-started/locally/)
- PyTorch performance tuning: [pytorch.org/tutorials/recipes/recipes/tuning_guide.html](https://pytorch.org/tutorials/recipes/recipes/tuning_guide.html)

---

## Install uv (recommended)

uv is a fast package/project manager and Python launcher. It replaces `pip`, `virtualenv`, some `poetry` tasks, and even manages Python interpreters.

On Linux/macOS:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
uv --version
```

On Windows (PowerShell):

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
uv --version
```

If your cluster forbids curl-based installers, you can fall back to:

```bash
pip install --user uv
~/.local/bin/uv --version
```

---

## Manage Python versions with uv

Keep project-specific Python consistent to avoid ABI mismatches with CUDA.

- List installed Pythons:

```bash
uv python list
```

- Install specific versions (uses Python standalone builds):

```bash
uv python install 3.11 3.12
```

- Pin the project to a version (writes `.python-version`):

```bash
uv python pin 3.11
```

When running on shared clusters, ensure your job loads the same Python (via pinning) on login nodes and compute nodes.

---

## Create and use virtual environments (venvs)

Recommended: put a `.venv/` in the project root and commit `.venv/` to `.gitignore`.

- Create venv with pinned Python:

```bash
uv venv --python 3.11
```

- Activate (Linux/macOS):

```bash
source .venv/bin/activate
```

- Activate (Windows):

```powershell
.venv\Scripts\Activate
```

- Upgrade pip/setuptools/wheel inside the venv (uv provides a fast shim):

```bash
uv pip install -U pip setuptools wheel
```

- Freeze or export deps if you aren’t using `pyproject.toml` yet:

```bash
uv pip freeze > requirements.txt
```

Tip: uv can also manage project deps via `pyproject.toml` + `uv.lock` with `uv add` and `uv sync` if you prefer lockfiles.

---

## Install PyTorch with CUDA for A100

1) Confirm drivers and CUDA runtime on the node:

```bash
nvidia-smi
nvidia-smi topo -m   # NUMA / PCIe fabric view
```

Check the “CUDA Version” reported by `nvidia-smi` (this reflects the driver-supported CUDA runtime). On many A100 systems you’ll see CUDA 11.8 or 12.1+.

2) In your venv, install the matching PyTorch wheels. Use the official index URL for CUDA builds (replace cu118/cu121 with what you need):

```bash
# CUDA 11.8
uv pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# CUDA 12.1
uv pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

If your cluster uses modules, load them first (example):

```bash
module load cuda/12.1  # or the site-provided module that matches your drivers
```

3) Verify GPU visibility in Python:

```python
import torch
print(torch.__version__)
print(torch.version.cuda)
print(torch.cuda.is_available())
print(torch.cuda.get_device_name(0))
```

If `is_available()` is False, check that you’re on a GPU node, the right module is loaded, and your PyTorch wheels match the available CUDA runtime.

---

## Data loading: keep the GPU fed

The A100 is very fast; most training slowdowns are input-bound. Key `DataLoader` knobs:

- `num_workers`: parallel CPU workers. Start near the number of physical cores per GPU slice, then sweep.
- `pin_memory=True`: enables page-locked host buffers for faster H2D copies.
- `persistent_workers=True`: avoid worker teardown cost between epochs (when `num_workers>0`).
- `prefetch_factor`: number of batches preloaded by each worker (default 2). Increase if GPU starves.
- Use non-blocking transfers with pinned memory: `.to(device, non_blocking=True)`.

Example:

```python
import os
from torch.utils.data import DataLoader

num_cpu = os.cpu_count() or 8
loader = DataLoader(
    dataset,
    batch_size=64,
    shuffle=True,
    num_workers=min(8, num_cpu),
    pin_memory=True,
    persistent_workers=True,
    prefetch_factor=4,
)
```

Watch `GPU-Util` vs CPU load. If GPU < 90% while CPUs are busy, increase `prefetch_factor`/`num_workers`. If CPUs are idle and GPU is low-util, you may be I/O bound (optimize storage, caching, or preprocessing).

---

## Math throughput: AMP, TF32, memory formats

- Automatic Mixed Precision (AMP): use `torch.cuda.amp` for FP16/BF16 where safe.
- TF32 on A100: accelerates FP32 matmuls transparently; you can explicitly allow it.
- Channels-last memory format (NCHW → NHWC) helps convolution throughput on Ampere.

Minimal training loop sketch:

```python
import torch
from torch.cuda.amp import autocast, GradScaler

device = torch.device('cuda')
model = model.to(device)
model = model.to(memory_format=torch.channels_last)

# Enable cudnn autotuner (best algos per input shapes)
torch.backends.cudnn.benchmark = True

# Prefer higher TF32 throughput where numerically OK
torch.backends.cuda.matmul.allow_tf32 = True
torch.backends.cudnn.allow_tf32 = True

scaler = GradScaler()  # use torch.amp.GradScaler for BF16 on newer PyTorch

for images, targets in loader:
    images = images.to(device, non_blocking=True)
    images = images.to(memory_format=torch.channels_last)
    targets = targets.to(device, non_blocking=True)

    optimizer.zero_grad(set_to_none=True)
    with autocast():
        outputs = model(images)
        loss = criterion(outputs, targets)
    scaler.scale(loss).backward()
    scaler.step(optimizer)
    scaler.update()
```

Notes:

- Prefer BF16 on A100 when supported by your model for stability without scaling.
- Keep batch shapes stable to maximize `cudnn.benchmark` benefit.

---

## Compile and CUDA Graphs

- `torch.compile` (PyTorch 2.x) can fuse kernels and reduce Python overhead. Try safe modes first:

```python
compiled_model = torch.compile(model, mode='max-autotune')
```

- CUDA Graphs reduce per-iteration launch overhead when your step is shape-stable:

```python
import torch

static_inp = torch.empty_like(example_inp, device='cuda')
g = torch.cuda.CUDAGraph()

# warm-up allocations
_ = model(example_inp)

optimizer.zero_grad(set_to_none=True)
with torch.cuda.graph(g):
    out = model(static_inp)
    loss = criterion(out, static_target)
    loss.backward()
    optimizer.step()

for inp, tgt in loader:
    static_inp.copy_(inp.to('cuda', non_blocking=True))
    static_target.copy_(tgt.to('cuda', non_blocking=True))
    g.replay()
```

Both features benefit stable shapes and control flow; avoid random control paths inside the captured region.

---

## Multi-GPU on a single node (DDP)

Use Distributed Data Parallel (NCCL) to scale across A100s.

Launcher (single node, 8 GPUs):

```bash
torchrun --standalone --nproc_per_node=8 train.py --arg1 ...
```

Inside `train.py`:

```python
import os, torch, torch.distributed as dist
from torch.nn.parallel import DistributedDataParallel as DDP

dist.init_process_group('nccl')
rank = dist.get_rank()
torch.cuda.set_device(rank % torch.cuda.device_count())
device = torch.device('cuda', rank % torch.cuda.device_count())

model = model.to(device)
model = DDP(model, device_ids=[device.index])
```

Use `DistributedSampler` for datasets and call `sampler.set_epoch(epoch)` each epoch.

---

## CPU affinity, threads, and I/O

- Respect scheduler allocations: in SLURM, set `--cpus-per-task` to match `num_workers` and set threads:

```python
import os, torch
torch.set_num_threads(int(os.environ.get('SLURM_CPUS_PER_TASK', '4')))
torch.set_num_interop_threads(1)
```

- Prefer fast local storage (NVMe, node-local scratch). If reading from network storage, increase DataLoader prefetching and use binary formats (e.g., WebDataset/TFRecord) to reduce per-file overhead.

---

## Monitoring and profiling on A100

### Quick health and utilization

```bash
nvidia-smi                 # snapshot
watch -n 1 nvidia-smi      # live refresh
nvidia-smi dmon -s pucm    # per-GPU perf counters (Power/Util/Clock/Memory)
nvidia-smi topo -m         # topology (NVLink/PCIe/NUMA)
```

How to read:

- GPU-Util: aim for ~90%+ under steady-state training.
- Memory-Usage: match batch size to available FB memory with headroom (fragmentation, caches).
- Power/Thermals: A100 40GB/80GB will throttle if constrained; file an ops ticket if sustained throttling appears.

### nvtop (interactive GPU top)

```bash
sudo apt-get install nvtop  # Debian/Ubuntu
nvtop
```

Shows per-process SM/memory utilization and graphs. Useful to identify which PID is starving or leaking memory.

### PyTorch Profiler (CPU+CUDA)

```python
from torch.profiler import profile, record_function, ProfilerActivity

with profile(
    activities=[ProfilerActivity.CPU, ProfilerActivity.CUDA],
    record_shapes=True,
    profile_memory=True,
    with_stack=True,
) as prof:
    for step, (x, y) in enumerate(loader):
        if step == 100: break
        with record_function('train_step'):
            x = x.to('cuda', non_blocking=True)
            y = y.to('cuda', non_blocking=True)
            out = model(x)
            loss = criterion(out, y)
            loss.backward()
            optimizer.step(); optimizer.zero_grad(set_to_none=True)

print(prof.key_averages().table(sort_by='cuda_time_total', row_limit=15))
prof.export_chrome_trace('trace.json')
```

Open `trace.json` in Chrome’s tracing viewer or TensorBoard’s profiler plugin for timelines.

### Nsight Systems (end-to-end timeline)

```bash
nsys profile -o profile_report python train.py
```

Use the GUI to inspect kernel launches, H2D/D2H copies, CPU stalls, and NCCL collectives.

### Nsight Compute (kernel-level)

```bash
ncu --set full --target-processes all python train.py
```

Drill into specific kernels to see occupancy, memory throughput, and bottlenecks.

---

## Common pitfalls and fixes

- Mismatched CUDA: wheel suffix (e.g., `cu118`/`cu121`) must be compatible with your driver’s CUDA runtime. Reinstall with the right `--index-url`.
- Data starvation: increase `num_workers`, `prefetch_factor`, enable `pin_memory`, move preprocessing to workers.
- Unstable AMP: try BF16 first on A100, or lower LR, or disable AMP for sensitive ops.
- Irregular shapes: pad/pack batches to stabilize shapes; enables better autotuning, compile, and graphs.
- Multi-GPU under-utilization: check `nvidia-smi topo -m` for NVLink/PCIe topology, ensure NCCL is the backend, and avoid CPU oversubscription.

---

## Minimal end-to-end recipe (A100, CUDA 12.1)

```bash
# 0) (If needed) load site modules
module load cuda/12.1  # as required by your cluster

# 1) Install uv and create project venv
curl -LsSf https://astral.sh/uv/install.sh | sh
uv python install 3.11
uv python pin 3.11
uv venv --python 3.11
source .venv/bin/activate

# 2) Install PyTorch CUDA wheels
uv pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# 3) Sanity check
python - <<'PY'
import torch
print('Torch:', torch.__version__, 'CUDA:', torch.version.cuda)
print('GPU available:', torch.cuda.is_available())
print('Device:', torch.cuda.get_device_name(0))
PY
```

Then apply the loader/AMP/TF32/compile practices above and watch `nvidia-smi`/`nvtop` for sustained high utilization.

---

## References

- uv documentation: [docs.astral.sh/uv](https://docs.astral.sh/uv/)
- PyTorch install (CUDA wheels): [pytorch.org/get-started/locally](https://pytorch.org/get-started/locally/)
- PyTorch performance tuning: [pytorch.org/tutorials/recipes/recipes/tuning_guide.html](https://pytorch.org/tutorials/recipes/recipes/tuning_guide.html)
- Nsight Systems/Compute: [developer.nvidia.com](https://developer.nvidia.com/)
