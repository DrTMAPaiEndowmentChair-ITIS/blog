import type { TopicVisualRegistry } from '../../types/topic-visuals'

export const acceleratorGuideVisuals: TopicVisualRegistry = {
  'modern-cpu-accelerator-map': {
    visuals: [
      {
        id: 'modern-cpu-accelerator-map-programming-contracts',
        kind: 'matrix',
        title: 'Different blocks accept different work',
        description: 'Classify the interface before asking whether an engine can run a model.',
        columns: ['Work accepted', 'Software route', 'Evidence needed'],
        rows: [
          {
            label: 'CPU vector or tile unit',
            cells: [
              'ISA operations on registers/state',
              'Compiler and runtime dispatch',
              'Kernel path and OS state'
            ]
          },
          {
            label: 'GPU or NPU',
            cells: [
              'Kernels or supported graphs',
              'Device runtime and compiler',
              'Actual graph placement'
            ]
          },
          {
            label: 'Codec or copy engine',
            cells: [
              'Bitstream or buffer descriptors',
              'Media API or device queues',
              'Engine completion and transfers'
            ]
          },
          {
            label: 'Memory infrastructure',
            cells: [
              'Feeds every execution path',
              'Allocation and placement policy',
              'Residency and traffic counters'
            ]
          }
        ],
        takeaway:
          'An instruction, a queued engine, and a cache have different programming contracts.',
        caveat: 'Representative classes. Optional engines and interfaces vary by processor and OS.',
        sources: [
          {
            label: 'Intel intrinsics',
            href: 'https://www.intel.com/content/www/us/en/docs/intrinsics-guide/index.html'
          },
          {
            label: 'Linux DMA mapping',
            href: 'https://docs.kernel.org/core-api/dma-api-howto.html'
          }
        ]
      },
      {
        id: 'modern-cpu-accelerator-map-evidence-chain',
        kind: 'flow',
        title: 'A device name starts an investigation',
        description: 'Each step establishes a narrower claim about the deployed workload.',
        steps: [
          { label: 'Inventory', detail: 'Find exposed CPU features and device identities.' },
          { label: 'Access', detail: 'Verify OS state, driver access, and runtime support.' },
          {
            label: 'Compile',
            detail: 'Check operators, shapes, layout, precision, and partitions.'
          },
          {
            label: 'Observe',
            detail: 'Trace actual kernels and transfers during a representative request.'
          },
          { label: 'Measure', detail: 'Compare correct outputs, latency, and resource usage.' }
        ],
        takeaway:
          'Usable acceleration is established by execution and measurement of the actual model.',
        caveat: 'A successful inventory or compilation does not by itself establish a speedup.',
        sources: [
          {
            label: 'Core ML compute units',
            href: 'https://developer.apple.com/documentation/coreml/mlcomputeunits'
          }
        ]
      }
    ]
  },
  'crypto-compression-copy-engines': {
    visuals: [
      {
        id: 'crypto-compression-copy-engines-interface-split',
        kind: 'compare',
        title: 'Registers and queued buffers have different costs',
        description:
          'Choose the path for the byte-processing operation, not the accelerator label.',
        columns: [
          {
            label: 'CPU instructions',
            points: [
              'AES, polynomial, SHA, and CRC operations execute in the calling thread.',
              'A library dispatches for supported features and implements the full algorithm.',
              'No device queue submission; CPU execution resources remain occupied.'
            ]
          },
          {
            label: 'Queued engines',
            points: [
              'QAT, DSA, and IAA accept supported jobs through distinct software stacks.',
              'Buffers and mappings must remain valid through completion.',
              'Batching can amortize overhead while changing latency and CPU usage.'
            ]
          }
        ],
        takeaway: 'Neither crypto instructions nor copy/compression devices implement tensor GEMM.',
        caveat: 'Supported algorithms, queue configuration, and translation modes vary by device.',
        sources: [
          {
            label: 'Intel SDM',
            href: 'https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html'
          },
          { label: 'Linux ENQCMD and SVA', href: 'https://docs.kernel.org/arch/x86/sva.html' }
        ]
      },
      {
        id: 'crypto-compression-copy-engines-crossover',
        kind: 'matrix',
        title: 'Fixed offload overhead creates a crossover',
        description:
          'Toy model: CPU 20 GB/s; engine 40 GB/s plus 5 microseconds per submission. Decimal bytes.',
        columns: ['CPU time', 'Offload time'],
        rows: [
          { label: '64,000 bytes', cells: ['3.2 microseconds', '6.6 microseconds'] },
          { label: '200,000 bytes', cells: ['10 microseconds', '10 microseconds'] },
          { label: '1,000,000 bytes', cells: ['50 microseconds', '30 microseconds'] }
        ],
        takeaway: 'Under these assumptions the offload path wins above 200,000 bytes.',
        caveat:
          'Illustrative arithmetic, not measured hardware. Excludes overlap, queueing, mapping, copies, and faults.'
      }
    ]
  },
  'npu-dsp-media-inference': {
    visuals: [
      {
        id: 'npu-dsp-media-inference-partition-cost',
        kind: 'bars',
        title: 'Faster arithmetic can produce a slower request',
        description:
          'Toy serial graph: CPU baseline 10 ms. Offload replaces a 6 ms subgraph with 2 ms, but adds 5 ms of boundary work.',
        unit: 'ms per illustrative request',
        rows: [
          { label: 'All CPU', value: 10, detail: '4 ms other work + 6 ms candidate subgraph' },
          {
            label: 'Offload without boundary cost',
            value: 6,
            detail: '4 ms other work + 2 ms device work'
          },
          {
            label: 'Offload with boundary cost',
            value: 11,
            detail: '4 + 2 + 5 ms transfers/conversions/synchronization'
          }
        ],
        takeaway: 'Compare whole-request time after graph partitioning and data conversion.',
        caveat: 'Invented timing example, not a benchmark. Overlap can change the serial sum.'
      },
      {
        id: 'npu-dsp-media-inference-coverage-gates',
        kind: 'sequence',
        title: 'An NPU graph passes several independent gates',
        description: 'A TOPS rating does not establish any of these deployment requirements.',
        steps: [
          {
            label: 'Target and software',
            detail: 'Match NPU generation, OS, driver, SDK, and runtime.'
          },
          {
            label: 'Graph contract',
            detail: 'Check operator attributes, shapes, state, layout, and precision.'
          },
          {
            label: 'Partition report',
            detail: 'Identify fallback operations and conversions at device boundaries.'
          },
          {
            label: 'Completed request',
            detail: 'Measure cold/warm behavior and verify quality on real inputs.'
          }
        ],
        takeaway:
          'Prove coverage and transfer cost for the exported graph before tuning engine settings.',
        caveat:
          'Supported shape and precision combinations are versioned; one model does not prove another.',
        sources: [
          {
            label: 'OpenVINO NPU constraints',
            href: 'https://docs.openvino.ai/2026/openvino-workflow/running-inference/inference-devices-and-modes/npu-device.html'
          },
          {
            label: 'Ryzen AI compatibility',
            href: 'https://ryzenai.docs.amd.com/projects/WinML/en/stable/relnotes.html'
          },
          {
            label: 'QNN model requirements',
            href: 'https://onnxruntime.ai/docs/execution-providers/QNN-ExecutionProvider.html'
          }
        ]
      }
    ]
  },
  'cpu-numa-inference-tuning': {
    visuals: [
      {
        id: 'cpu-numa-inference-tuning-weight-read-floor',
        kind: 'bars',
        title: 'Weight bytes set an illustrative decode floor',
        description:
          'Eight billion weights read once per token at an assumed 100 GB/s. Decimal units.',
        unit: 'ms of minimum weight-read time',
        rows: [
          { label: 'FP16 payload', value: 160, detail: '16 GB / 100 GB/s' },
          { label: 'Four-bit payload only', value: 40, detail: '4 GB / 100 GB/s' },
          {
            label: 'Four-bit plus toy scales',
            value: 45,
            detail: '4 GB + 0.5 GB for one FP16 scale per 32 weights'
          }
        ],
        takeaway: 'Count metadata bytes and the actual limiting memory boundary.',
        caveat:
          'A worked bound, not a measured rate. Excludes KV, activations, dequantization, compute, and imperfect access.',
        sources: [
          { label: 'Original Roofline paper', href: 'https://doi.org/10.1145/1498765.1498785' }
        ]
      },
      {
        id: 'cpu-numa-inference-tuning-placement',
        kind: 'compare',
        title: 'Thread placement and page placement are separate',
        description: 'Two candidate layouts trade memory capacity, locality, and channel use.',
        columns: [
          {
            label: 'Replica within a NUMA node',
            points: [
              'Bind execution and allocate weights/KV with the intended local policy.',
              'Check node capacity and actual residency, including file-backed pages.',
              'Replicas can duplicate model storage while avoiding some remote traffic.'
            ]
          },
          {
            label: 'Replica across NUMA nodes',
            points: [
              'More channels can serve a larger working set.',
              'Remote reads and activation exchange can consume interconnect bandwidth.',
              'Measure policy, locality, concurrency, and thread count together.'
            ]
          }
        ],
        takeaway: 'Pinning threads after allocation does not establish local memory residency.',
        caveat:
          'Neither layout is a universal winner. Memory policy and cache history affect observed placement.',
        sources: [
          {
            label: 'Linux NUMA memory policy',
            href: 'https://docs.kernel.org/admin-guide/mm/numa_memory_policy.html'
          },
          {
            label: 'numactl manual',
            href: 'https://github.com/numactl/numactl/blob/master/numactl.8'
          }
        ]
      }
    ]
  },
  'hardware-inference-agent-workflow': {
    visuals: [
      {
        id: 'hardware-inference-agent-workflow-experiment',
        kind: 'flow',
        title: 'Every tuning candidate keeps its evidence',
        description:
          'A reproducible agent run connects a named objective to raw observations and a decision.',
        steps: [
          {
            label: 'Inventory and objective',
            detail: 'Save hardware observations, exact model/runtime, workload, and quality gate.'
          },
          {
            label: 'Execution evidence',
            detail: 'Check coverage and profile actual kernels, partitions, and transfers.'
          },
          {
            label: 'One candidate',
            detail: 'Change the variable that addresses the observed bottleneck.'
          },
          {
            label: 'Repeated comparison',
            detail: 'Preserve raw timings, correctness results, cache protocol, and commands.'
          },
          {
            label: 'Regression and decision',
            detail: 'Keep a candidate only if it meets the objective under intended load.'
          }
        ],
        takeaway:
          'Inventory nominates a candidate; completed execution and quality tests justify a change.',
        caveat:
          'The downloadable probe does not run specialized kernels or establish model placement.',
        sources: [
          {
            label: 'Downloadable tuning skill',
            href: '/downloads/hardware-inference-tuning/SKILL.md'
          }
        ]
      },
      {
        id: 'hardware-inference-agent-workflow-clock',
        kind: 'matrix',
        title: 'Request-relative timestamps preserve latency, not overlap',
        description:
          'The summarizer groups matching workloads and derives these values from each request.',
        columns: ['Calculation', 'What it establishes'],
        rows: [
          { label: 'TTFT', cells: ['First token timestamp', 'Time since this request started'] },
          {
            label: 'Mean decode gap',
            cells: [
              'Last minus first, divided by output count minus one',
              'Average token gap within this request'
            ]
          },
          { label: 'End-to-end', cells: ['elapsed_ms', 'Complete request duration'] },
          {
            label: 'Aggregate throughput',
            cells: [
              'Needs a shared workload clock',
              'Cannot be inferred from these independent clocks'
            ]
          }
        ],
        takeaway:
          'A concurrency label cannot reconstruct when independently timed requests overlapped.',
        caveat:
          'One-token responses have no decode gap. Network chunks require an explicit token-observation convention.',
        sources: [
          {
            label: 'Summarizer implementation',
            href: '/downloads/hardware-inference-tuning/scripts/summarize_benchmarks.py'
          }
        ]
      }
    ]
  }
}
