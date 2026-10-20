import type { TopicVisualRegistry } from '../../types/topic-visuals'

export const systemsTheoryVisuals: TopicVisualRegistry = {
  'hpc-guide': {
    visuals: [
      {
        id: 'HPC-guide-prefetch-residency',
        kind: 'bars',
        title: 'Prefetching spends host memory',
        description:
          'Assume each prepared batch holds 64 MiB. The queued payload budget is workers × prefetched batches per worker × 64 MiB.',
        unit: 'MiB of queued batch payload',
        rows: [
          { label: '2 workers, 2 batches each', value: 256, detail: '2 × 2 × 64 = 256 MiB' },
          { label: '4 workers, 2 batches each', value: 512, detail: '4 × 2 × 64 = 512 MiB' },
          { label: '4 workers, 4 batches each', value: 1024, detail: '4 × 4 × 64 = 1,024 MiB' }
        ],
        takeaway:
          'More prefetching can hide input delays, but it also increases the queue memory budget.',
        caveat:
          'Toy payload budget for a full queue. It excludes worker processes, dataset copies, the current batch, and extra pinned buffers.'
      },
      {
        id: 'HPC-guide-batch-dependencies',
        kind: 'flow',
        title: 'Follow the batch before tuning the GPU',
        description:
          'One training batch crosses several dependencies. A timeline reveals which dependency leaves the next stage waiting.',
        steps: [
          {
            label: 'Prepare on the CPU',
            detail:
              'Workers read, decode, and collate examples. An empty ready queue makes the training process wait for input.'
          },
          {
            label: 'Copy to the GPU',
            detail:
              'Pinned buffers and nonblocking copies permit asynchronous transfer. The consuming GPU work must still wait until its input arrives.'
          },
          {
            label: 'Run the numerical step',
            detail:
              'Forward and backward kernels consume the batch. Gaps before these kernels point to a different problem than a long-running kernel.'
          },
          {
            label: 'Synchronize gradients',
            detail:
              'In distributed training, ranks exchange gradients. Exposed collective time can keep faster ranks waiting for the slowest participant.'
          }
        ],
        takeaway:
          'Tune the stage on the critical path. Faster arithmetic cannot fill an empty input queue.',
        caveat:
          'Stages can overlap. Their dependencies remain even when the profiler shows concurrent work.'
      }
    ]
  },
  'ai-cluster-networking': {
    visuals: [
      {
        id: 'ai-cluster-networking-ring-traffic',
        kind: 'bars',
        title: 'A ring sends more than one payload',
        description:
          'For a 100 MiB payload per participant, ring all-reduce transfers 2 × (p − 1) / p × 100 MiB per participant.',
        unit: 'MiB sent per participant',
        rows: [
          { label: '2 participants', value: 100, detail: '2 × 1 / 2 × 100 = 100 MiB' },
          { label: '4 participants', value: 150, detail: '2 × 3 / 4 × 100 = 150 MiB' },
          { label: '8 participants', value: 175, detail: '2 × 7 / 8 × 100 = 175 MiB' }
        ],
        takeaway:
          'Per-participant traffic approaches twice the payload. Participant count also changes startup steps and synchronization costs.',
        caveat:
          'Ideal ring accounting, excluding protocol overhead. Received traffic has the same volume; elapsed time also needs effective bandwidth and latency.'
      },
      {
        id: 'ai-cluster-networking-ecn-feedback',
        kind: 'sequence',
        title: 'How an ECN mark slows a RoCE sender',
        description:
          'Congestion signaling closes a feedback loop between a growing switch queue and the sender.',
        steps: [
          {
            label: 'A queue grows',
            detail: 'Synchronized flows arrive faster than the congested output can drain them.'
          },
          {
            label: 'The switch marks packets',
            detail:
              'An ECN threshold triggers a congestion mark on traffic passing through the queue.'
          },
          {
            label: 'The receiver signals back',
            detail: 'The RoCEv2 receiver sends a congestion notification packet toward the sender.'
          },
          {
            label: 'The sender reduces its rate',
            detail:
              'Less offered traffic gives the queue a chance to drain. Thresholds and feedback delay determine the response.'
          }
        ],
        takeaway:
          'ECN changes the sending rate through feedback. PFC instead pauses a traffic priority at a local hop.',
        caveat:
          'This is the causal path, not a model of a particular congestion-control algorithm or its tuning.'
      }
    ]
  },
  'ai-hardware-landscape': {
    visuals: [
      {
        id: 'ai-hardware-landscape-capacity-bandwidth',
        kind: 'matrix',
        title: 'Capacity and bandwidth answer different questions',
        description:
          'Two invented accelerators read all weights once. The transfer-time lower bound is weight bytes divided by memory bandwidth.',
        columns: ['Device A: 32 GB, 1 TB/s', 'Device B: 64 GB, 0.5 TB/s'],
        rows: [
          { label: '16 GB of weights', cells: ['Fits; at least 16 ms', 'Fits; at least 32 ms'] },
          { label: '48 GB of weights', cells: ['Does not fit locally', 'Fits; at least 96 ms'] }
        ],
        takeaway:
          'The larger memory pool fits a larger model, while the faster memory interface has a lower read-time floor for the smaller model.',
        caveat:
          'Decimal GB and TB. This ideal bound excludes compute, cache reuse, attention state, workspaces, communication, and runtime overhead.'
      },
      {
        id: 'ai-hardware-landscape-graph-regularity',
        kind: 'compare',
        title: 'The computation graph changes the hardware bargain',
        description:
          'Specialized dataflow designs gain useful information when tensor shapes and communication paths are known before execution.',
        columns: [
          {
            label: 'Stable dense graph',
            points: [
              'Repeated shapes let a compiler reuse placement and scheduling decisions.',
              'Predictable access lets local buffers retain data for repeated arithmetic.',
              'Compilation cost can spread across many executions.'
            ]
          },
          {
            label: 'Irregular graph',
            points: [
              'Changing shapes can need another compiled plan or padding.',
              'Conditional work makes a fixed schedule harder to fill.',
              'Fallback operations can add dispatch and data movement.'
            ]
          }
        ],
        takeaway:
          'Compare the deployed graph with the compiler contract before comparing peak arithmetic rates.',
        caveat:
          'These are workload pressures. They do not rank vendors or establish measured performance.'
      }
    ]
  },
  'amd-rocm-ml': {
    visuals: [
      {
        id: 'amd-rocm-ml-subgroup-counterexample',
        kind: 'sequence',
        title: 'A translated kernel can still sum the wrong lanes',
        description:
          'Toy porting bug: a reduction assumes 32 lanes, but the target execution group in this example has 64.',
        steps: [
          {
            label: 'Make the test unambiguous',
            detail: 'Give every lane the value 1. A reduction over all 64 lanes must return 64.'
          },
          {
            label: 'Translate the API names',
            detail:
              'The source now uses HIP calls. The hardcoded 32-lane reduction still covers only half the example group and returns 32.'
          },
          {
            label: 'Repair the group assumption',
            detail:
              'Use the target-supported group width and matching reduction operations. Account for every contributing lane.'
          },
          {
            label: 'Check the full group',
            detail:
              'The all-ones case must return 64. Then check partial groups and varied inputs against a reference implementation.'
          }
        ],
        takeaway:
          'API translation preserves names and structure. Kernel correctness also depends on execution-group assumptions.',
        caveat:
          'This illustrates a hypothetical width change. AMD group width varies by architecture; do not assume every AMD GPU uses 64 lanes.',
        sources: [
          {
            label: 'AMD HIP porting guide: warpSize',
            href: 'https://rocmdocs.amd.com/projects/HIP/en/latest/how-to/hip_porting_guide.html#warpsize'
          }
        ]
      },
      {
        id: 'amd-rocm-ml-backend-evidence',
        kind: 'matrix',
        title: 'What does each compatibility check establish?',
        description:
          'The torch.cuda namespace also appears on ROCm. Progressively narrower checks reveal whether the intended workload has an execution path.',
        columns: ['Evidence', 'Question still open'],
        rows: [
          {
            label: 'torch.cuda is available',
            cells: [
              'PyTorch can see an accelerator backend',
              'Which backend and device are active?'
            ]
          },
          {
            label: 'torch.version.hip is set',
            cells: [
              'The PyTorch build targets HIP',
              'Does the required operator have a working kernel?'
            ]
          },
          {
            label: 'A small tensor operation passes',
            cells: ['That tested operation works', 'Do fused attention and custom extensions work?']
          },
          {
            label: 'A representative model step passes',
            cells: [
              'The tested graph produces acceptable output',
              'Does the deployment meet its latency and memory targets?'
            ]
          }
        ],
        takeaway:
          'A working device probe cannot establish compatibility for every kernel used by a model.'
      }
    ]
  },
  'apple-metal-ml-ecosystem': {
    visuals: [
      {
        id: 'apple-metal-ml-ecosystem-command-lifecycle',
        kind: 'sequence',
        title: 'Shared memory still needs execution ordering',
        description:
          "Trace the article's Metal dispatch example from CPU input preparation to a CPU read of the GPU result.",
        steps: [
          {
            label: 'Prepare the buffers',
            detail: 'The CPU writes the inputs before the GPU work that consumes them begins.'
          },
          {
            label: 'Encode the dispatch',
            detail:
              'Bind the compute pipeline and buffers, dispatch the work, and end encoding. These calls describe the GPU command.'
          },
          {
            label: 'Commit the command buffer',
            detail:
              'Submission lets the GPU execute the encoded work. Committing does not mean that the result is already complete.'
          },
          {
            label: 'Observe completion',
            detail: 'The example waits with waitUntilCompleted before the CPU consumes the result.'
          }
        ],
        takeaway:
          'Access to shared storage removes a copy requirement. Completion ordering determines when the result is safe to read.',
        caveat:
          'This follows a simple shared-buffer example. Other storage modes and asynchronous designs have their own synchronization requirements.'
      },
      {
        id: 'apple-metal-ml-ecosystem-stateful-cache',
        kind: 'compare',
        title: 'Where does the KV cache live between predictions?',
        description:
          'Core ML stateful models retain model state across calls. Compare that contract with explicitly carrying a cache through model inputs and outputs.',
        columns: [
          {
            label: 'Explicit cache inputs',
            points: [
              'The caller supplies the previous cache with each token.',
              'The prediction returns the cache needed by the next call.',
              'The caller manages the cache buffers and their lifetime.'
            ]
          },
          {
            label: 'Model state',
            points: [
              'A state object retains the cache between predictions.',
              'Each token call updates that same state.',
              'A new independent conversation needs its own initial state.'
            ]
          }
        ],
        takeaway:
          'Stateful execution changes who carries the cache. Cache contents still belong to one generation history.',
        caveat:
          'Conceptual interfaces. State support depends on the converted model and target platform.'
      }
    ]
  },
  'apple-mlx-guide': {
    visuals: [
      {
        id: 'apple-mlx-guide-lazy-timing',
        kind: 'sequence',
        title: 'Time the evaluated result',
        description:
          'A lazy array expression can return before its arithmetic runs. Put evaluation inside the interval you intend to measure.',
        steps: [
          {
            label: 'Finish input preparation',
            detail:
              'Evaluate input arrays first when their creation should be outside the measurement.'
          },
          {
            label: 'Warm the same operation',
            detail:
              'Call the operation and evaluate its output before measuring steady execution. This separates initial tracing and compilation.'
          },
          {
            label: 'Start the timer and call',
            detail:
              'The call can build a graph whose output is still unevaluated. Stopping here would measure only part of the work.'
          },
          {
            label: 'Evaluate, then stop',
            detail:
              'Evaluate the returned arrays with mx.eval before stopping the timer so the result-producing work is included.'
          }
        ],
        takeaway:
          'A fast lazy call is incomplete timing evidence until the requested output has been evaluated.',
        caveat:
          'This describes a simple steady-state measurement. Report cold compilation separately and repeat measurements under a fixed workload.'
      },
      {
        id: 'apple-mlx-guide-lora-parameter-budget',
        kind: 'bars',
        title: 'Count what LoRA trains in one layer',
        description:
          'Example: replace a full update to a 4,096 × 4,096 weight matrix with rank-8 factors of sizes 4,096 × 8 and 8 × 4,096.',
        unit: 'trainable parameters in this layer',
        rows: [
          { label: 'Full matrix update', value: 16777216, detail: '4,096 × 4,096 = 16,777,216' },
          { label: 'Rank-8 adapter', value: 65536, detail: '4,096 × 8 + 8 × 4,096 = 65,536' }
        ],
        takeaway:
          'This adapter trains 1/256 as many parameters as the full matrix. The frozen base weights still need storage.',
        caveat:
          'One hypothetical layer. This is not a total training-memory estimate; activations, gradients, optimizer state, and other layers also matter.'
      }
    ]
  },
  'coding-agents-explained': {
    visuals: [
      {
        id: 'coding-agents-explained-injection-boundary',
        kind: 'flow',
        title: 'Repository text can propose an unauthorized action',
        description:
          'Example: a retrieved file tells an agent to upload a local credential before running tests.',
        steps: [
          {
            label: 'Read repository content',
            detail:
              "The tool returns file text. Its presence in context does not give it the user's authority."
          },
          {
            label: 'Produce a tool proposal',
            detail:
              'The model might turn the embedded instruction into an upload command. A syntactically valid command can still violate the task.'
          },
          {
            label: 'Apply execution policy',
            detail:
              "Check the requested target and data against the user's authorization. Filesystem isolation alone does not decide whether an upload is allowed."
          },
          {
            label: 'Keep the task boundary',
            detail:
              'Reject the unauthorized upload and continue with the legitimate test command within the available permissions.'
          }
        ],
        takeaway:
          'A tool result supplies evidence. Turning that evidence into an action requires a separate authority decision.',
        caveat: "Illustrative prompt-injection path, not a claim about any listed agent's defenses."
      },
      {
        id: 'coding-agents-explained-compaction-evidence',
        kind: 'compare',
        title: 'A compact handoff needs evidence pointers',
        description:
          'Two invented summaries of the same debugging session show what survives when full tool output leaves context.',
        columns: [
          {
            label: 'Conclusion only',
            points: ['The parser is fixed.', 'Tests looked good.', 'Finish the task.']
          },
          {
            label: 'Recoverable record',
            points: [
              'Changed parseDate in src/parser.ts; empty input must still return null.',
              'The parser test passed; the integration test has not run.',
              'Next, run the integration test and inspect the diff.'
            ]
          }
        ],
        takeaway:
          'Preserve constraints, tested scope, and file pointers so the next context can recover the reasoning from evidence.',
        caveat: 'Example paths and outcomes describe no files or test results in this repository.'
      }
    ]
  },
  'cute-dsl-cuda-tile-gpu-programming': {
    visuals: [
      {
        id: 'cute-dsl-cuda-tile-gpu-programming-edge-mask',
        kind: 'matrix',
        title: 'The final tile carries mostly invalid rows',
        description:
          'Example: cover a 130-row output with 64-row tiles. The third tile must mask rows outside the output.',
        columns: ['Proposed row indices', 'Valid rows', 'Masked rows'],
        rows: [
          { label: 'Tile 0', cells: ['0 through 63', '64', '0'] },
          { label: 'Tile 1', cells: ['64 through 127', '64', '0'] },
          { label: 'Tile 2', cells: ['128 through 191', '2', '62'] }
        ],
        takeaway:
          "Only 2/64 of the last tile's rows belong to the output. Edge correctness needs an explicit policy for invalid coordinates.",
        caveat:
          'Toy row coverage. The other dimension, reduction edges, instruction padding, and actual kernel resource use are omitted.'
      },
      {
        id: 'cute-dsl-cuda-tile-gpu-programming-buffer-ownership',
        kind: 'sequence',
        title: 'A shared buffer cannot be reused while a consumer needs it',
        description:
          'Follow one buffer through an asynchronous load and a compute stage. Double buffering repeats this lifecycle for each buffer.',
        steps: [
          {
            label: 'Acquire the free buffer',
            detail: 'The producer chooses storage whose previous consumer has finished reading.'
          },
          {
            label: 'Issue the tile load',
            detail:
              'The copy starts writing the next tile. Issuing the copy does not establish that all loaded values are ready.'
          },
          {
            label: 'Wait before consuming',
            detail:
              'The consumer waits for the required copy-completion and visibility guarantees before using the tile.'
          },
          {
            label: 'Release after consumption',
            detail:
              'Once all reads complete, the buffer becomes available for a later tile. Reusing it sooner can overwrite live input.'
          }
        ],
        takeaway: 'Overlap needs a correct ownership handoff as well as enough buffer capacity.',
        caveat:
          'Conceptual dependencies. The required barrier and completion operations depend on the programming model and copy instructions.'
      }
    ]
  },
  'erdos-unit-distance-problem': {
    visuals: [
      {
        id: 'erdos-unit-distance-problem-two-circle-constraint',
        kind: 'sequence',
        title: 'Why one fixed pair has only two common unit neighbors',
        description:
          'Place A at the origin and B one unit to its right. Solve for a point C that is one unit from both.',
        steps: [
          {
            label: 'Require distance 1 from A',
            detail: 'For C = (x, y), the squared-distance equation is x² + y² = 1.'
          },
          {
            label: 'Require distance 1 from B',
            detail: 'The second equation is (x − 1)² + y² = 1.'
          },
          {
            label: 'Subtract the equations',
            detail: 'The squared terms cancel, leaving 2x − 1 = 0. Therefore x = 1/2.'
          },
          {
            label: 'Recover the two heights',
            detail: 'Substitution gives y² = 3/4, so C can only be (1/2, √3/2) or (1/2, −√3/2).'
          }
        ],
        takeaway:
          'Common unit neighbors cannot accumulate around one fixed pair. Dense constructions must coordinate distances across many pairs.',
        caveat:
          'This local calculation is not a proof of the best global upper bound on unit distances.'
      },
      {
        id: 'erdos-unit-distance-problem-quantifier-test',
        kind: 'compare',
        title: 'Why an unbounded family defeats an eventual bound',
        description:
          'The conjectured exponent 1 + o(1) eventually lies below 1 + δ/2 for every fixed δ > 0.',
        columns: [
          {
            label: 'A finite record',
            points: [
              'A large point set may exceed n^(1 + δ).',
              'An eventual upper bound can place its threshold beyond every tested size.'
            ]
          },
          {
            label: 'Infinitely many sizes',
            points: [
              'One fixed δ > 0 works at arbitrarily large n.',
              'Past the upper-bound threshold, n^(1 + δ) exceeds n^(1 + δ/2), giving a contradiction.'
            ]
          }
        ],
        takeaway:
          'The fixed positive exponent and the unbounded set of sizes do the logical work. A single large numerical example cannot replace them.',
        caveat:
          "This explains the quantifiers in the article, without estimating the construction's constants or its first usable size."
      }
    ]
  },
  'generative-ai-guide': {
    visuals: [
      {
        id: 'generative-ai-guide-context-allocation',
        kind: 'bars',
        title: 'Reserve output space before adding retrieved text',
        description:
          'Toy 8,000-token request budget: 1,000 system tokens + 2,000 history tokens + 3,000 evidence tokens + 2,000 reserved output tokens.',
        unit: 'tokens allocated',
        rows: [
          { label: 'System instructions', value: 1000 },
          { label: 'Conversation history', value: 2000 },
          { label: 'Retrieved evidence', value: 3000 },
          { label: 'Reserved output', value: 2000 }
        ],
        takeaway:
          'The evidence allowance is what remains after instructions, history, and output reservation. More retrieved text spends the same finite budget.',
        caveat:
          'Assumed counts using one tokenizer, including prompt formatting. Actual context and output limits depend on the model and serving system.'
      },
      {
        id: 'generative-ai-guide-valid-json-wrong-answer',
        kind: 'compare',
        title: 'Valid JSON can carry the wrong fact',
        description:
          'Example: an API returns {"limit":32}, while the selected source document specifies a limit of 16.',
        columns: [
          {
            label: 'Schema validation',
            points: [
              'The response parses as JSON.',
              'The limit field has the required integer type.',
              'Those checks accept both 16 and 32.'
            ]
          },
          {
            label: 'Evidence validation',
            points: [
              'Identify the source revision relevant to this request.',
              'Compare the returned value with the documented limit.',
              'Reject or correct 32 when the source specifies 16.'
            ]
          }
        ],
        takeaway:
          'Structured output checks the response contract. Task evaluation must also check whether the values answer the question correctly.',
        caveat: "Invented response and source values. Neither column measures a model's accuracy."
      }
    ]
  },
  'groq-cerebras-accelerators': {
    visuals: [
      {
        id: 'groq-cerebras-accelerators-stage-balance',
        kind: 'bars',
        title: 'The slowest pipeline stage sets the interval',
        description:
          'Toy pipeline: stages A, B, and C take 2, 5, and 3 ms per token. With ideal overlap, the steady interval is max(A, B, C).',
        unit: 'ms per completed token at steady state',
        rows: [
          { label: 'Original stages', value: 5, detail: 'max(2, 5, 3) = 5 ms' },
          { label: 'Halve stage A', value: 5, detail: 'max(1, 5, 3) = 5 ms' },
          { label: 'Reduce stage B to 2 ms', value: 3, detail: 'max(2, 2, 3) = 3 ms' }
        ],
        takeaway:
          'Speeding up an already faster stage leaves the completion interval unchanged. Removing the bottleneck exposes the next slowest stage.',
        caveat:
          'Invented stages with independent resources and enough buffering. Startup, communication contention, and actual accelerator timing are excluded.'
      },
      {
        id: 'groq-cerebras-accelerators-shape-gate',
        kind: 'sequence',
        title: 'A compiled plan needs a defined shape boundary',
        description:
          'Example: a serving plan accepts sequence lengths up to 128, but a new request arrives with 129 tokens.',
        steps: [
          {
            label: 'Measure the request shape',
            detail:
              'Tokenization gives length 129. The scheduler checks the supported range before placing the request on the accelerator.'
          },
          {
            label: 'Reject the incompatible plan',
            detail:
              'The 128-token plan does not cover this request. A deterministic execution schedule does not extend its own shape contract.'
          },
          {
            label: 'Choose a supported route',
            detail:
              'Use an already compiled larger bucket, an explicit fallback, a new compilation, or a request rejection.'
          },
          {
            label: 'Account for the serving cost',
            detail:
              'A larger bucket can add padding; compilation adds cold latency; a separate queue adds waiting. These costs sit outside the core schedule.'
          }
        ],
        takeaway:
          'Deterministic accelerator execution still needs admission and routing rules for dynamic requests.',
        caveat:
          'Hypothetical bounds illustrate the contract. Supported shapes and fallback behavior depend on the deployed compiler and service.'
      }
    ]
  },
  'huggingface-ecosystem-guide': {
    visuals: [
      {
        id: 'huggingface-ecosystem-guide-padding-budget',
        kind: 'bars',
        title: 'Batch shape determines padding waste',
        description:
          'Toy token lengths are 8, 16, 24, and 32. Compare one padded batch with two batches grouped by similar length.',
        unit: 'token slots allocated across all examples',
        rows: [
          { label: 'Actual input tokens', value: 80, detail: '8 + 16 + 24 + 32 = 80' },
          {
            label: 'One batch padded to 32',
            value: 128,
            detail: '4 × 32 = 128 slots; 48 are padding'
          },
          {
            label: 'Two length buckets',
            value: 96,
            detail: '2 × 16 + 2 × 32 = 96 slots; 16 are padding'
          }
        ],
        takeaway:
          'Length bucketing removes 32 padding slots here while preserving all 80 input tokens.',
        caveat:
          'Dense padded batches only. Token slots are not attention FLOPs or a speedup estimate; masking, packing, and kernels change execution cost.'
      },
      {
        id: 'huggingface-ecosystem-guide-loading-contract',
        kind: 'flow',
        title: 'Weights are one part of the loading contract',
        description:
          'Auto-loading joins architecture metadata, an implementation, tensor files, and the tokenizer into one executable model.',
        steps: [
          {
            label: 'Read the configuration',
            detail:
              'Architecture metadata such as model_type tells the Auto class which model family to resolve.'
          },
          {
            label: 'Resolve the implementation',
            detail:
              'Use the registered architecture class. Custom repository code requires an explicit trust decision; a safe tensor file does not authorize code execution.'
          },
          {
            label: 'Load matching tensors',
            detail:
              'For a sharded checkpoint, the index maps parameter names to files. The implementation must agree with those names and tensor shapes.'
          },
          {
            label: 'Apply the matching tokenizer',
            detail:
              'Vocabulary IDs, special tokens, and chat formatting must match the model. Preserve the chosen revisions when reproducing a run.'
          }
        ],
        takeaway:
          'A checkpoint extension alone cannot establish that the architecture, code, tokenizer, and weights agree.',
        caveat:
          'Conceptual loading order. Individual libraries can interleave downloads, initialization, and tensor placement.'
      }
    ]
  },
  'mcp-first-principles': {
    visuals: [
      {
        id: 'mcp-first-principles-retry-identity',
        kind: 'sequence',
        title: 'A retry needs an application key',
        description:
          'Example tool contract: create a record using a server-stored idempotency key. The first response disappears after the write commits.',
        steps: [
          {
            label: 'Send request 41',
            detail:
              'The JSON-RPC id is 41. The tool arguments also carry application key create-1042, identifying the intended write.'
          },
          {
            label: 'Commit, then lose the response',
            detail:
              'The server creates the record and stores the result under create-1042. The client times out without knowing whether the write succeeded.'
          },
          {
            label: 'Retry as request 42',
            detail:
              'The new JSON-RPC id correlates a new request. The unchanged application key identifies the same intended write.'
          },
          {
            label: 'Return the stored result',
            detail:
              'The example server recognizes create-1042 and returns its earlier result instead of creating another record.'
          }
        ],
        takeaway:
          'Correlation identifies a protocol exchange. Idempotency identifies an operation whose effects must not repeat.',
        caveat:
          'Assumed tool and storage behavior. MCP request IDs alone do not provide deduplication.'
      },
      {
        id: 'mcp-first-principles-error-layers',
        kind: 'matrix',
        title: 'An error belongs to the layer that failed',
        description:
          'Separate an invalid protocol exchange from a valid tool call whose requested operation could not complete.',
        columns: ['Return channel', 'What needs to change'],
        rows: [
          {
            label: 'Malformed JSON-RPC request',
            cells: ['JSON-RPC error', 'Repair the request envelope or parameters']
          },
          {
            label: 'Method used before valid initialization',
            cells: ['JSON-RPC error', 'Establish the required session state']
          },
          {
            label: 'Valid lookup; record does not exist',
            cells: [
              'Tool result marked isError',
              'Correct the record target or handle the missing record'
            ]
          }
        ],
        takeaway:
          'Repeating a valid lookup cannot repair a missing record. Retrying a malformed message cannot repair its protocol shape.',
        caveat: 'The missing-record row assumes the example tool defines absence as a domain error.'
      }
    ]
  },
  'openai-circuits-games-lattices': {
    visuals: [
      {
        id: 'openai-circuits-games-lattices-gap-promise',
        kind: 'matrix',
        title: 'A promise problem leaves a middle region',
        description:
          'Toy GapCVP thresholds: radius r = 10 and approximation factor γ = 2. Compare the true nearest-lattice distance d with 10 and 20.',
        columns: ['Distance test', 'Required answer'],
        rows: [
          { label: 'd = 8', cells: ['8 ≤ r', 'YES'] },
          { label: 'd = 15', cells: ['r < 15 ≤ γr', 'Either answer is permitted'] },
          { label: 'd = 25', cells: ['25 > γr', 'NO'] }
        ],
        takeaway:
          'A larger approximation factor widens the region with no required answer, making the distinction easier for an algorithm.',
        caveat:
          'Illustrative distances in arbitrary length units. They are not computed lattice instances or the dimension-dependent hardness factor in the theorem.'
      },
      {
        id: 'openai-circuits-games-lattices-conditioning-contradiction',
        kind: 'sequence',
        title: 'Turn an overly successful repeated strategy into a contradiction',
        description:
          'The repetition proof reasons backward from a hypothetical strategy that wins too often across many coordinates.',
        steps: [
          {
            label: 'Assume the repeated value is too high',
            detail:
              'Start with a strategy that beats the proposed decay bound, rather than assuming the players answer coordinates independently.'
          },
          {
            label: 'Condition on a small core',
            detail:
              'Select a small set of coordinates whose success makes an average remaining coordinate unusually likely to succeed.'
          },
          {
            label: 'Round to one legal game',
            detail:
              'Convert that conditioned coordinate into a valid single-copy strategy. The sampleability estimate must survive the conditioning step.'
          },
          {
            label: 'Exceed the single-copy optimum',
            detail:
              'The resulting strategy would win more often than the defined entangled value allows. That contradiction rules out the starting strategy.'
          }
        ],
        takeaway:
          'Independent referee questions do not force independent player answers. The proof must control correlated strategies.',
        caveat:
          'Proof structure from the article. The quantitative conditioning and rounding losses are omitted.'
      }
    ]
  },
  'openai-ramsey-extremal-graphs': {
    visuals: [
      {
        id: 'openai-ramsey-extremal-graphs-two-block-triangle',
        kind: 'sequence',
        title: 'Proper labels block a triangle across two blocks',
        description:
          "In the article's recursive coloring, a cross-edge color is active in one block and missing in the other.",
        steps: [
          {
            label: 'Pick two vertices inside one block',
            detail: 'Call them u and v. A third vertex w lies in a different block.'
          },
          {
            label: 'Suppose both cross edges have color a',
            detail:
              'If a is missing in the block containing u and v, their internal edge cannot have color a.'
          },
          {
            label: 'Handle the active-color case',
            detail:
              'If a is active in that block, the cross-edge rule assigns u and v the same proper a-label because both edges meet w.'
          },
          {
            label: 'Exclude the third edge',
            detail:
              'A proper labeling forbids a color-a edge between equal-labeled vertices. In either case, uv cannot complete the monochromatic triangle.'
          }
        ],
        takeaway:
          'The recursive invariant needs proper labels as well as triangle-free blocks. Those labels control what happens between blocks.',
        caveat:
          'Only the two-block case. Triangles spanning three blocks use a separate palette argument.'
      },
      {
        id: 'openai-ramsey-extremal-graphs-host-quantifiers',
        kind: 'matrix',
        title: 'Separate witnesses need not give a common witness',
        description:
          'Toy avoidance table: one host avoids F₁, another avoids F₂. Neither displayed host avoids the whole family.',
        columns: ['Avoids F₁', 'Avoids F₂', 'Avoids both'],
        rows: [
          { label: 'Host A', cells: ['Yes', 'No', 'No'] },
          { label: 'Host B', cells: ['No', 'Yes', 'No'] }
        ],
        takeaway:
          'Choosing a different dense host for each forbidden graph does not produce one dense host that avoids every member together.',
        caveat:
          "Logical illustration only. It proves no extremal exponent and does not exclude other hosts; the article's construction and counting argument supply those bounds."
      }
    ]
  },
  'openai-sofic-groups-connes-rigidity': {
    visuals: [
      {
        id: 'openai-sofic-groups-connes-rigidity-binary-carry',
        kind: 'matrix',
        title: 'The same four points can have different group laws',
        description:
          "Take e = (1, 0) in the article's four-point model. All arithmetic below is modulo two, with the second law adding a binary carry.",
        columns: ['Coordinatewise addition', 'Addition with carry'],
        rows: [
          { label: 'e + e', cells: ['(0, 0)', '(0, 1)'] },
          { label: 'e + e + e', cells: ['(1, 0)', '(1, 1)'] },
          { label: 'e + e + e + e', cells: ['(0, 0)', '(0, 0)'] }
        ],
        takeaway:
          'The point e has order two under one law and order four under the other, although both spaces assign probability 1/4 to each point.',
        caveat:
          'This finite model illustrates information loss. It is not itself the ICC property-(T) construction.'
      },
      {
        id: 'openai-sofic-groups-connes-rigidity-component-bridge',
        kind: 'sequence',
        title: 'Why an expander decomposition needs one more bridge',
        description:
          'The non-sofic argument must pass from many expanding components to the single-component setting needed by the centralizer theorem.',
        steps: [
          {
            label: 'Assume a sofic approximation exists',
            detail:
              'Its generator permutations give finite graphs for the relevant property-(T) subgroups.'
          },
          {
            label: 'Obtain expanding components',
            detail:
              'The decomposition theorem supplies many expanding pieces after a negligible edge change. It does not automatically supply one global expander.'
          },
          {
            label: 'Use the nested conjugations',
            detail:
              "The article's subgroup configuration controls component sizes and their matching, allowing the argument to descend to one expanding component."
          },
          {
            label: 'Force an impossible finite approximation',
            detail:
              "The centralizer theorem would make the commuting subgroup J locally embeddable into finite groups. The chosen J is Thompson's V, which is not LEF."
          }
        ],
        takeaway:
          'Expansion alone is insufficient. The nested subgroup configuration supplies the step that turns the assumed approximation into a contradiction.',
        caveat:
          "Outline of the article's mechanism. The component-matching estimates and subgroup construction are omitted."
      }
    ]
  },
  'openai-sphere-packing-codes-ehrhart': {
    visuals: [
      {
        id: 'openai-sphere-packing-codes-ehrhart-projection-rank',
        kind: 'bars',
        title: 'Projection rank appears in the denominator',
        description:
          'Illustrate |C| ≤ (1 − s)/(Λ − s) × D/dE with toy scalars D = 120, s = 1/4, and Λ = 1/2. The prefactor is 3.',
        unit: 'illustrative right-hand side of the bound',
        rows: [
          { label: 'Rank dE = 1', value: 360, detail: '3 × 120 / 1 = 360' },
          { label: 'Rank dE = 4', value: 90, detail: '3 × 120 / 4 = 90' },
          { label: 'Rank dE = 10', value: 36, detail: '3 × 120 / 10 = 36' }
        ],
        takeaway:
          'Increasing the attached subspace rank lowers this expression if the ambient dimension and spectral factor stay fixed.',
        caveat:
          'Algebraic illustration only. It asserts no admissible projections or actual code bounds; changing rank can also change D and Λ.'
      },
      {
        id: 'openai-sphere-packing-codes-ehrhart-slope-squeeze',
        kind: 'sequence',
        title: 'An interior lattice condition becomes a volume inequality',
        description:
          'Follow the proof route described for a convex body K with barycenter zero and no other interior lattice point.',
        steps: [
          {
            label: 'Count the available monomials',
            detail:
              'Interior lattice points index a holomorphic basis. A single interior point makes the first weighted space one-dimensional.'
          },
          {
            label: 'Build a convex quantity',
            detail:
              'A ray of weighted potentials produces L(t). Positivity gives convexity, allowing bounds on its initial slope.'
          },
          {
            label: 'Squeeze the slope',
            detail: 'With cK = (n! vol(K))^(1/n), the argument gives n cK/(n + 1) ≤ L′(0+) ≤ n.'
          },
          {
            label: 'Solve for the volume',
            detail: 'The slope inequalities imply cK ≤ n + 1, so vol(K) ≤ (n + 1)^n/n!.'
          }
        ],
        takeaway:
          'The lattice hypothesis limits a function space; analytic slope bounds then limit the geometric volume.',
        caveat:
          'Proof outline for positive dimension. It omits the transport and positivity theorems and does not classify all equality cases.'
      }
    ]
  },
  'openai-ten-advances-overview': {
    visuals: [
      {
        id: 'openai-ten-advances-overview-success-denominator',
        kind: 'bars',
        title: 'Ten successes leave the success rate undetermined',
        description:
          'Three invented research logs each contain ten successful attempts. Their denominators produce different observed success rates.',
        unit: '% of attempts successful in each toy log',
        rows: [
          { label: '10 successes / 10 attempts', value: 100, detail: '10 / 10 × 100 = 100%' },
          { label: '10 successes / 100 attempts', value: 10, detail: '10 / 100 × 100 = 10%' },
          { label: '10 successes / 1,000 attempts', value: 1, detail: '10 / 1,000 × 100 = 1%' }
        ],
        takeaway:
          'A success count establishes that successes occurred. A measured rate also needs the attempted population and its selection rules.',
        caveat:
          "None of these logs describes OpenAI's runs. Comparable rates also need fixed problem selection, attempt definitions, and compute budgets."
      },
      {
        id: 'openai-ten-advances-overview-statement-domain',
        kind: 'sequence',
        title: 'A checked proof can certify the wrong domain',
        description:
          'Invented statement-fidelity example: an abstract says x² ≥ x for every real x, while the formal statement quantifies over natural numbers.',
        steps: [
          {
            label: 'Read the formal quantifier',
            detail:
              'For every natural number n, n² ≥ n is true. A correct proof can establish exactly that statement.'
          },
          {
            label: 'Compare the advertised domain',
            detail:
              'Natural numbers and real numbers are different domains. The checked theorem does not cover every real input.'
          },
          {
            label: 'Test an excluded input',
            detail: 'At x = 1/2, x² = 1/4 < 1/2. The advertised real-number claim is false.'
          },
          {
            label: 'Repair the statement boundary',
            detail:
              'Restrict the advertised domain or change the theorem. The proof checker cannot infer which statement the author intended.'
          }
        ],
        takeaway:
          'Mechanical correctness concerns the formal statement. Statement fidelity requires comparing that statement with the claim a reader sees.',
        caveat: 'Invented example. It identifies no error in the paper or its Lean certificates.'
      }
    ]
  },
  'torch-compile-internals': {
    visuals: [
      {
        id: 'torch-compile-internals-amortization',
        kind: 'matrix',
        title: 'Compilation must earn back its startup cost',
        description:
          'Toy timings: eager costs 10 ms per call; compilation costs 600 ms once, then 4 ms per call. Totals are 10N and 600 + 4N ms.',
        columns: ['Eager total', 'Compiled total', 'Lower total'],
        rows: [
          { label: '50 calls', cells: ['500 ms', '800 ms', 'Eager by 300 ms'] },
          { label: '100 calls', cells: ['1,000 ms', '1,000 ms', 'Equal'] },
          { label: '200 calls', cells: ['2,000 ms', '1,400 ms', 'Compiled by 600 ms'] }
        ],
        takeaway:
          'The break-even count is 600 / (10 − 4) = 100 calls. Recompilation makes another startup cost to recover.',
        caveat:
          'Invented constant timings for one specialization. Real warmup, autotuning, guard failures, and input shapes change the accounting.'
      },
      {
        id: 'torch-compile-internals-save-recompute',
        kind: 'compare',
        title: 'Backward values can be saved or reconstructed',
        description:
          'For y = GELU(xW + b), the backward pass needs values related to the pre-activation. AOTAutograd exposes this dependency to a partitioner.',
        columns: [
          {
            label: 'Save an intermediate',
            points: [
              'Retain the needed forward tensor until backward consumes it.',
              'Avoid repeating the arithmetic that produced that value.',
              'Keep more memory live across the forward-backward boundary.'
            ]
          },
          {
            label: 'Recompute an intermediate',
            points: [
              'Keep enough inputs to reconstruct the needed value later.',
              'Spend extra backward arithmetic on reconstruction.',
              'Potentially shorten the lifetime of large forward tensors.'
            ]
          }
        ],
        takeaway:
          'The same derivative can come from different memory and arithmetic schedules. Fewer saved tensors do not imply less total work.',
        caveat:
          'Conceptual alternatives. The actual partition depends on the graph, backend, and operations that must remain live.'
      }
    ]
  },
  'understanding-gpus': {
    visuals: [
      {
        id: 'understanding-gpus-divergent-lanes',
        kind: 'sequence',
        title: 'Count useful lane work through a divergent branch',
        description:
          'Toy 32-lane warp: 16 lanes take a 10-instruction path, and 16 take a 2-instruction path. Assume the paths execute serially.',
        steps: [
          {
            label: 'Split the active lanes',
            detail:
              "The branch separates the warp into two groups of 16. Each lane needs only its own branch's instructions."
          },
          {
            label: 'Execute the long path',
            detail:
              'Ten issued instructions do 16 × 10 = 160 useful lane-instructions while the other 16 lanes are inactive.'
          },
          {
            label: 'Execute the short path',
            detail:
              'Two more issued instructions do 16 × 2 = 32 useful lane-instructions with the first group inactive.'
          },
          {
            label: 'Reconverge and count',
            detail:
              'The paths use 192 of 32 × 12 = 384 possible lane-instruction slots, or 50%, in this simplified schedule.'
          }
        ],
        takeaway:
          'Many threads do not guarantee that every issued instruction does useful work in every lane.',
        caveat:
          'Toy instruction accounting. Predication, scheduling, instruction costs, and other active warps affect real performance; this is not a throughput prediction.'
      },
      {
        id: 'understanding-gpus-fusion-traffic',
        kind: 'bars',
        title: 'Fusion can remove intermediate memory round trips',
        description:
          'Example: apply add-one, multiply-by-two, then ReLU to one million FP32 values. Assume every array read and write crosses device memory.',
        unit: 'decimal MB of array traffic',
        rows: [
          {
            label: 'Three separate kernels',
            value: 24,
            detail: '3 kernels × 2 array transfers × 4 bytes × 1,000,000 = 24 MB'
          },
          {
            label: 'One fused kernel',
            value: 8,
            detail: '1 input read + 1 output write: 2 × 4 × 1,000,000 = 8 MB'
          }
        ],
        takeaway:
          'Keeping the two intermediates inside one kernel removes 16 MB of traffic in this model. The arithmetic result stays the same.',
        caveat:
          'Ideal traffic accounting with scalar constants. Cache hits, register pressure, launch overhead, and fusion constraints change measured speed.'
      }
    ]
  }
}
