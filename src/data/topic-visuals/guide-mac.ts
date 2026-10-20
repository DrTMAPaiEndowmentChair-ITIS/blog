import type { TopicVisualRegistry } from '../../types/topic-visuals'

export const macGuideVisuals: TopicVisualRegistry = {
  'mac-studio-mlx-optimization': {
    visuals: [
      {
        id: 'mac-studio-mlx-phase-pressure',
        kind: 'compare',
        title: 'The same weights meet different token shapes',
        description:
          'Prefill and decode expose different opportunities to reuse a weight tile. Measure them separately.',
        columns: [
          {
            label: 'Prompt prefill',
            points: [
              'Many token rows can reuse each loaded weight tile.',
              'Prompt chunk size changes temporary memory and execution overhead.',
              'Measure prompt processing and time to first token.'
            ]
          },
          {
            label: 'Autoregressive decode',
            points: [
              'One sequence contributes a narrow token row per step.',
              'Weights and growing attention state can dominate memory traffic.',
              'Measure token gaps and aggregate throughput at each concurrency.'
            ]
          }
        ],
        takeaway:
          'A faster prefill kernel need not reduce steady decode latency. Optimize the phase that limits the workload.',
        caveat:
          'Qualitative model. Active experts, context length, batch size, and kernel overhead can change the limiting resource.',
        sources: [
          {
            label: 'MLX-LM generation and prompt chunking',
            href: 'https://github.com/ml-explore/mlx-lm/blob/main/mlx_lm/generate.py'
          }
        ]
      },
      {
        id: 'mac-studio-mlx-cache-growth',
        kind: 'line',
        title: 'Context length spends the remaining memory',
        description:
          'Illustrative full-attention cache with 32 layers, 8 KV heads, head width 128, FP16 scalars, and one sequence. Bytes = 2 × 32 × tokens × 8 × 128 × 2.',
        xLabel: 'Cached tokens',
        yLabel: 'KV payload, GiB',
        points: [
          { x: 0, y: 0 },
          { x: 8192, y: 1 },
          { x: 16384, y: 2 },
          { x: 32768, y: 4 }
        ],
        takeaway:
          'Under these assumptions, each additional 8,192 tokens adds 1 GiB per independent sequence.',
        caveat:
          'Calculated payload only. Excludes allocation overhead, shared prefixes, rotating or quantized state, and non-attention layers.',
        sources: [
          {
            label: 'MLX-LM cache implementations',
            href: 'https://github.com/ml-explore/mlx-lm/blob/main/mlx_lm/models/cache.py'
          }
        ]
      }
    ]
  },
  'mlx-model-porting-and-kernels': {
    visuals: [
      {
        id: 'mlx-port-equivalence-gates',
        kind: 'sequence',
        title: 'Establish equivalence before changing arithmetic',
        description:
          'Keep a reference execution at every stage so the first mismatch identifies a smaller set of causes.',
        steps: [
          {
            label: 'Freeze input identity',
            detail:
              'Save tokenizer files, special IDs, chat-template output, and exact test token IDs.'
          },
          {
            label: 'Map the floating-point tensors',
            detail:
              'Explain every transpose and permutation. Compare layer outputs and teacher-forced logits with the source.'
          },
          {
            label: 'Exercise state transitions',
            detail:
              'Compare full-sequence execution with uneven cached chunks and single-token decode at matching positions.'
          },
          {
            label: 'Introduce one optimization',
            detail:
              'Add quantization, compilation, or a custom kernel separately, then repeat numerical and task checks.'
          }
        ],
        takeaway:
          'A readable answer is weak evidence. Matching reference distributions and cache transitions tests the port directly.',
        caveat:
          'Use architecture-specific state tests for recurrent, hybrid, sliding-window, and multimodal models.',
        sources: [
          {
            label: 'MLX-LM model loading',
            href: 'https://github.com/ml-explore/mlx-lm/blob/main/mlx_lm/utils.py'
          },
          {
            label: 'Llama-family attention and cache offsets',
            href: 'https://github.com/ml-explore/mlx-lm/blob/main/mlx_lm/models/llama.py'
          }
        ]
      },
      {
        id: 'mlx-port-shape-invisible-errors',
        kind: 'matrix',
        title: 'Errors that shape checks cannot see',
        description:
          'Each transformation can preserve array dimensions while changing the function the model computes.',
        columns: ['Hidden mismatch', 'Inspection that exposes it'],
        rows: [
          {
            label: 'Square linear weight',
            cells: [
              'An unnecessary transpose changes output channels.',
              'Use a nonsymmetric toy weight and compare the actual affine operator.'
            ]
          },
          {
            label: 'Grouped quantization',
            cells: [
              'Codes use the wrong scale group or bit order.',
              'Compare packed matmul with matmul over reconstructed weights.'
            ]
          },
          {
            label: 'Rotary positions',
            cells: [
              'Cached keys use an incorrect position offset.',
              'Compare uneven cached chunks against the full sequence.'
            ]
          },
          {
            label: 'Compiled mutable state',
            cells: [
              'A traced function captures state as a constant.',
              'Vary the state and compare eager and compiled outputs.'
            ]
          }
        ],
        takeaway:
          'Test operator meaning, packed representation, positions, and state capture as separate contracts.',
        sources: [
          {
            label: 'MLX Linear orientation',
            href: 'https://ml-explore.github.io/mlx/build/html/python/nn/_autosummary/mlx.nn.Linear.html'
          },
          {
            label: 'MLX affine quantization format',
            href: 'https://ml-explore.github.io/mlx/build/html/python/_autosummary/mlx.core.quantize.html'
          },
          {
            label: 'MLX compilation and captured state',
            href: 'https://ml-explore.github.io/mlx/build/html/usage/compile.html'
          }
        ]
      }
    ]
  },
  'apple-inference-backends': {
    visuals: [
      {
        id: 'apple-backend-distinct-processors',
        kind: 'matrix',
        title: 'Name the processor before naming the framework',
        description:
          'These hardware categories remain distinct even when they share system memory or cooperate in a framework.',
        columns: ['Example route', 'Evidence required'],
        rows: [
          {
            label: 'CPU',
            cells: [
              'Host code, Accelerate, BNNSGraph, CPU kernels',
              'Selected library path, threading, and supported CPU instructions'
            ]
          },
          {
            label: 'GPU',
            cells: [
              'Metal, MLX GPU, PyTorch mps',
              'Supported operations and a trace of GPU execution'
            ]
          },
          {
            label: 'Neural Engine',
            cells: [
              'A compatible Core ML execution partition',
              'Per-operation placement on the intended target'
            ]
          },
          {
            label: 'GPU Neural Accelerators',
            cells: [
              'Supported M5 or A19 GPU tensor operations',
              'Matching hardware generation and a runtime kernel using the facility'
            ]
          }
        ],
        takeaway:
          'A framework name, allowed compute-unit set, or chip specification alone does not establish operation placement.',
        caveat:
          'Examples of routes, not an exhaustive framework support table. Availability depends on hardware, OS, and model operations.',
        sources: [
          {
            label: 'Apple BNNSGraph CPU execution',
            href: 'https://developer.apple.com/videos/play/wwdc2024/10211/'
          },
          {
            label: 'Apple M5 and A19 GPU Neural Accelerators',
            href: 'https://developer.apple.com/videos/play/tech-talks/111432/'
          },
          {
            label: 'Core ML operation placement reports',
            href: 'https://developer.apple.com/documentation/coreml/analyzing-a-core-ml-model-s-performance-in-xcode'
          }
        ]
      },
      {
        id: 'apple-backend-shared-memory-boundary',
        kind: 'flow',
        title: 'Shared physical memory still needs a handoff',
        description:
          'Follow a tensor crossing a framework or execution partition boundary on an integrated-memory system.',
        steps: [
          {
            label: 'Produce the tensor',
            detail:
              'The first execution path writes its output using a particular layout and dtype.'
          },
          {
            label: 'Establish completion',
            detail: 'The consumer must depend on the producer finishing its writes.'
          },
          {
            label: 'Adapt the representation',
            detail:
              'Different layouts, dtypes, or allocation ownership may require materialization or a copy.'
          },
          {
            label: 'Consume and retire',
            detail:
              'The next path reads the compatible tensor. Release storage only after its final use completes.'
          }
        ],
        takeaway:
          'Removing a discrete host-to-device transfer does not remove synchronization, representation, or lifetime rules.',
        caveat:
          'A compatible shared allocation can avoid a copy. The diagram describes checks at a boundary, not mandatory copies.',
        sources: [
          {
            label: 'MLX unified memory model',
            href: 'https://ml-explore.github.io/mlx/build/html/usage/unified_memory.html'
          },
          {
            label: 'Apple GPU resource storage modes',
            href: 'https://developer.apple.com/documentation/metal/choosing-a-resource-storage-mode-for-apple-gpus'
          }
        ]
      }
    ]
  },
  'building-mac-inference-stack': {
    visuals: [
      {
        id: 'mac-stack-request-ownership',
        kind: 'flow',
        title: 'A request crosses several owners before text arrives',
        description:
          'Illustrative service design. Keep one request identity across CPU preparation, execution state, and transport.',
        steps: [
          {
            label: 'Prepare',
            detail:
              'Resolve the model revision, validate limits, and produce the intended token IDs.'
          },
          {
            label: 'Admit',
            detail: 'Reserve state growth and queue capacity before attaching mutable model state.'
          },
          {
            label: 'Execute',
            detail:
              'An execution owner schedules prompt chunks and decode steps while tracking completion.'
          },
          {
            label: 'Sample and decode text',
            detail: 'Select tokens and update request-local detokenization and stopping state.'
          },
          {
            label: 'Deliver',
            detail:
              'A bounded transport queue sends ready fragments and reports slow readers or disconnects.'
          }
        ],
        takeaway:
          'Network concurrency and model-state ownership are separate design decisions. Trace both.',
        sources: [
          {
            label: 'MLX-LM server worker and queues',
            href: 'https://github.com/ml-explore/mlx-lm/blob/main/mlx_lm/server.py'
          },
          {
            label: 'MLX-LM streaming detokenizers',
            href: 'https://github.com/ml-explore/mlx-lm/blob/main/mlx_lm/tokenizer_utils.py'
          }
        ]
      },
      {
        id: 'mac-stack-cancellation-retirement',
        kind: 'sequence',
        title: 'A disconnected client can leave device work in flight',
        description:
          'Cancellation ends future scheduling before it permits final storage reclamation.',
        steps: [
          {
            label: 'Mark cancellation',
            detail:
              'Stop scheduling the request and make its future output undeliverable exactly once.'
          },
          {
            label: 'Retain pending references',
            detail:
              'Keep arrays and cache references while submitted work may still read or write them.'
          },
          {
            label: 'Observe completion',
            detail:
              'Use the runtime completion mechanism for the work submitted on the execution stream.'
          },
          {
            label: 'Retire resources',
            detail:
              'Release private state, shared-prefix references, and reservations through idempotent cleanup.'
          }
        ],
        takeaway:
          'Measure cancellation until resource retirement. Returning from the HTTP handler is only one event.',
        caveat:
          'Proposed ownership protocol. The backend adapter must implement its completion and cleanup guarantees.',
        sources: [
          {
            label: 'MLX stream execution',
            href: 'https://ml-explore.github.io/mlx/build/html/usage/using_streams.html'
          },
          {
            label: 'MLX-LM batching and removal',
            href: 'https://github.com/ml-explore/mlx-lm/blob/main/mlx_lm/generate.py'
          }
        ]
      }
    ]
  },
  'portable-inference-backends': {
    visuals: [
      {
        id: 'portable-backend-contracts',
        kind: 'matrix',
        title: 'Portability has several independently testable contracts',
        description:
          'A successful load addresses only part of the migration. Keep a verification artifact for each contract.',
        columns: ['What moves', 'What still needs proof'],
        rows: [
          {
            label: 'Checkpoint',
            cells: ['Weights and metadata', 'Names, layout, dtype, tokenizer, and model identity']
          },
          {
            label: 'Graph',
            cells: [
              'Operators and state updates',
              'Semantics, shapes, cache behavior, and provider coverage'
            ]
          },
          {
            label: 'Quantized format',
            cells: ['Packed codes and scales', 'Grouping, signedness, packing, and reconstruction']
          },
          {
            label: 'Compiled kernels',
            cells: [
              'Target-specific executable code',
              'Device architecture, driver, and supported instructions'
            ]
          },
          {
            label: 'Service behavior',
            cells: [
              'A workload and latency target',
              'Quality, memory peaks, latency tails, and actual placement'
            ]
          }
        ],
        takeaway:
          'Checkpoint compatibility, graph coverage, and performance need separate evidence.',
        sources: [
          {
            label: 'ONNX Runtime graph partitioning',
            href: 'https://onnxruntime.ai/docs/reference/high-level-design.html'
          },
          {
            label: 'llama.cpp backend-specific builds',
            href: 'https://github.com/ggml-org/llama.cpp/blob/master/docs/build.md'
          }
        ]
      },
      {
        id: 'portable-backend-fallback-boundaries',
        kind: 'compare',
        title: 'A registered accelerator can execute very different graphs',
        description:
          'Compare provider execution using a trace. Provider registration alone cannot distinguish these cases.',
        columns: [
          {
            label: 'Long supported partition',
            points: [
              'Adjacent operations stay in a compatible device execution path.',
              'Inputs and outputs can use supported device memory binding.',
              'Inspect kernel duration and boundary costs.'
            ]
          },
          {
            label: 'Repeated fallback',
            points: [
              'Unsupported regions execute through another provider.',
              'Repeated boundaries can add synchronization and tensor preparation.',
              'Inspect the decode loop, not only the number of accelerated nodes.'
            ]
          }
        ],
        takeaway:
          'The placement and cost of each boundary matter more than an accelerator-enabled status flag.',
        caveat:
          'Fallback may be necessary or inexpensive. Measure its actual partition and frequency before changing the graph.',
        sources: [
          {
            label: 'ONNX Runtime provider assignment',
            href: 'https://onnxruntime.ai/docs/reference/high-level-design.html'
          },
          {
            label: 'ONNX Runtime I/O Binding',
            href: 'https://onnxruntime.ai/docs/performance/tune-performance/iobinding.html'
          }
        ]
      }
    ]
  }
}
