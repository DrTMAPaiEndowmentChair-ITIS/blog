import type { TopicVisual, TopicVisualRegistry } from '../../types/topic-visuals'

function flow(
  id: string,
  title: string,
  description: string,
  steps: [string, string][],
  takeaway: string
): TopicVisual {
  return {
    id,
    title,
    description,
    takeaway,
    kind: 'flow',
    steps: steps.map(([label, detail]) => ({ label, detail }))
  }
}

function matrix(
  id: string,
  title: string,
  description: string,
  columns: string[],
  rows: [string, string[]][],
  takeaway: string
): TopicVisual {
  return {
    id,
    title,
    description,
    takeaway,
    kind: 'matrix',
    columns,
    rows: rows.map(([label, cells]) => ({ label, cells }))
  }
}

export const upstreamPostVisuals: TopicVisualRegistry = {
  'crossing-the-ai-frontier': {
    visuals: [
      flow(
        'crossing-the-ai-frontier-constraint',
        'Find the frontier for the actual job',
        'A benchmark winner may fail the constraints of a local application.',
        [
          ['Task', 'Define a successful output and a representative test set.'],
          ['Feasibility', 'Apply the memory, latency, access, and reliability limits.'],
          ['Comparison', 'Compare quality and cost among the feasible systems.'],
          ['Deployment', 'Measure the complete application, including recovery and tools.']
        ],
        'A useful frontier is conditional on the workload and its constraints.'
      ),
      matrix(
        'crossing-the-ai-frontier-dominance',
        'Dominance is different from a tradeoff',
        'Compare two systems without pretending one scalar score captures every objective.',
        ['Quality', 'Cost relationship'],
        [
          [
            'A dominates B',
            ['A is at least as good', 'A costs no more; at least one dimension improves']
          ],
          ['A trades off with B', ['A is better', 'A also costs more']],
          [
            'Neither is feasible',
            ['Scores can still look strong', 'Both violate a deployment constraint']
          ]
        ],
        'A genuine tradeoff belongs on the frontier; a dominated option needs another reason to exist.'
      )
    ]
  },
  'how-we-made-this-blog-faster': {
    visuals: [
      flow(
        'how-we-made-this-blog-faster-critical-path',
        'Follow a font dependency to the first readable frame',
        'The browser needs usable font metrics and styles before it can paint a stable text layout.',
        [
          ['Document', 'Parse the page and discover its stylesheet and font references.'],
          ['Resource reuse', 'Fetch or reuse the font subset and shared SVG resource.'],
          ['Layout', 'Shape text and compute line breaks with the selected font metrics.'],
          ['Paint', 'Draw the visible content; defer eligible offscreen work.']
        ],
        'Reducing bytes and avoiding repeated work improve different parts of the same path.'
      ),
      matrix(
        'how-we-made-this-blog-faster-cache-layers',
        'Different caches remove different work',
        'These mechanisms have distinct lifetimes and do not make all rendering free.',
        ['Reused object', 'Work that can remain'],
        [
          [
            'HTTP cache',
            ['Font, CSS, or SVG response bytes', 'DOM construction, styles, layout, and painting']
          ],
          [
            'Document preload',
            [
              'An already fetched destination document',
              'Parsing, script setup, and layout unless separately reused'
            ]
          ],
          [
            'Offscreen containment',
            [
              'An estimated layout footprint',
              'Visible blocks still need complete layout and painting'
            ]
          ]
        ],
        'Name the reused resource before attributing a navigation improvement to caching.'
      )
    ]
  },
  'inference-performance-climbs': {
    visuals: [
      {
        id: 'inference-performance-climbs-latency-account',
        kind: 'bars',
        title: 'Account for the first token exactly once',
        description:
          'Toy stream: five tokens arrive at 120, 140, 160, 180, and 200 milliseconds after the request starts.',
        unit: 'ms',
        rows: [
          { label: 'Wait until the first token', value: 120 },
          { label: 'Four remaining decode gaps', value: 80 }
        ],
        takeaway: 'End-to-end time is 120 + 4 × 20 = 200 ms. There are four decode gaps, not five.',
        caveat:
          'Illustrative timings, not a measured benchmark. The initial wait can include queueing and prefill.'
      },
      flow(
        'inference-performance-climbs-reuse-boundary',
        'Locate the work a prefix-cache hit can remove',
        'A cache lookup precedes the target model computation it may save.',
        [
          ['Identify prefix', 'Match the token sequence and the runtime-specific cache identity.'],
          ['Reuse valid state', 'Recover the compatible cached KV blocks.'],
          ['Process suffix', 'Run the uncached input through the target model.'],
          ['Decode output', 'Continue autoregressive generation with the complete request state.']
        ],
        'Prefix reuse removes matched prefill work; it does not remove all decoding or scheduling cost.'
      )
    ]
  },
  'jev-system-one-decisions': {
    visuals: [
      flow(
        'jev-system-one-decisions-policy',
        'Separate a probability estimate from an action',
        'A typed return value fits an application interface, but the application still owns its decision rule.',
        [
          ['State', 'Build the typed input from the application state.'],
          ['Estimate', 'Ask the model for the supported decision and probability.'],
          ['Policy', 'Apply calibrated thresholds and explicit application constraints.'],
          ['Outcome', 'Record the action and its eventual result for evaluation.']
        ],
        'Type checking validates an interface. Calibration and decision quality require outcome data.'
      ),
      matrix(
        'jev-system-one-decisions-evidence',
        'Three checks answer three different questions',
        'Passing one check does not imply the other two pass.',
        ['Question', 'Evidence'],
        [
          [
            'Type validity',
            [
              'Is the returned value allowed by the interface?',
              'Schema and program-level validation'
            ]
          ],
          [
            'Calibration',
            [
              'Do events predicted near p occur at that frequency?',
              'Grouped held-out predictions and observed outcomes'
            ]
          ],
          [
            'Policy quality',
            [
              'Does the resulting action meet the application objective?',
              'Task outcomes, error costs, and threshold sweeps'
            ]
          ]
        ],
        'A useful typed decision needs a valid representation, meaningful probabilities, and an appropriate policy.'
      )
    ]
  },
  'llm-performance-hill-climbing': {
    visuals: [
      flow(
        'llm-performance-hill-climbing-experiment',
        'Change one variable around a fixed workload',
        'A useful tuning loop distinguishes a configuration change from a different experiment.',
        [
          ['Baseline', 'Freeze the model revision, prompt set, output length, and quality checks.'],
          ['Profile', 'Separate loading, prefill, decode, and scheduling costs.'],
          ['Candidate', 'Change the setting that addresses the observed bottleneck.'],
          [
            'Accept or revert',
            'Compare repeated runs and retain the change only if it meets the objective.'
          ]
        ],
        'A faster run is evidence only when the workload and correctness conditions remain comparable.'
      ),
      matrix(
        'llm-performance-hill-climbing-confounders',
        'Check the variables that can imitate a speedup',
        'These changes can matter, but they must be named as changes to the experiment.',
        ['Apparent improvement', 'Confounding change'],
        [
          ['Lower first-token time', ['A prefix was reused', 'Compare cache state explicitly']],
          [
            'Higher tokens per second',
            ['The output became shorter or easier', 'Hold the token budget and workload fixed']
          ],
          [
            'Lower memory use',
            ['Precision or context was reduced', 'Repeat quality and target-context validation']
          ],
          [
            'Better aggregate throughput',
            ['Concurrency increased', 'Check per-request latency and deadlines']
          ]
        ],
        'Report the configuration and workload with the result, rather than attributing every gain to the last parameter edited.'
      )
    ]
  },
  'mlx-m5-m6-neural-architecture': {
    visuals: [
      {
        id: 'mlx-m5-m6-neural-architecture-phase',
        kind: 'compare',
        title: 'One model can hit two different limits',
        description:
          'Prefill and low-batch decode present different shapes to the same memory system and arithmetic units.',
        columns: [
          {
            label: 'Prompt prefill',
            points: [
              'Many prompt positions share weight reads',
              'Larger matrix operations can reuse loaded tiles',
              'Kernel throughput and attention traffic both matter'
            ]
          },
          {
            label: 'Single-sequence decode',
            points: [
              'One new position is computed per step',
              'Most active weights may be read again',
              'Bandwidth and cache-state size can dominate'
            ]
          }
        ],
        takeaway: 'More peak arithmetic does not imply the same speedup in both phases.'
      },
      {
        id: 'mlx-m5-m6-neural-architecture-weight-budget',
        kind: 'bars',
        title: 'Quantization changes the raw weight footprint',
        description:
          'Worked storage arithmetic for eight billion parameters, before scales, metadata, KV cache, or runtime workspace.',
        unit: 'GB',
        rows: [
          { label: '16-bit values', value: 16, detail: '8 billion × 2 bytes' },
          { label: '4-bit codes', value: 4, detail: '8 billion × 0.5 bytes' }
        ],
        takeaway:
          'The 4-bit codes take one quarter of the 16-bit weight bytes, but a complete inference working set contains more than those codes.',
        caveat:
          'Decimal GB and a storage example, not a measured allocation or a prediction of decode speed.'
      }
    ]
  },
  'parallel-kittens-ai-networking': {
    visuals: [
      flow(
        'parallel-kittens-ai-networking-collective',
        'An all-reduce can be decomposed into two collectives',
        'Each rank starts with a local contribution to a vector.',
        [
          [
            'Reduce-scatter',
            'Reduce matching elements across ranks and leave each rank with a distinct reduced shard.'
          ],
          [
            'All-gather',
            'Exchange the reduced shards until every rank holds the complete reduced vector.'
          ]
        ],
        'This decomposition exposes where shard computation, transfer, and dependent work can be scheduled.'
      ),
      {
        id: 'parallel-kittens-ai-networking-overlap-bound',
        kind: 'bars',
        title: 'Overlap removes only the exposed transfer interval',
        description:
          'Toy independent work: compute takes 10 ms and communication takes 4 ms. Ignore launch, contention, and dependency overhead.',
        unit: 'ms',
        rows: [
          { label: 'Serial compute plus transfer', value: 14 },
          { label: 'Ideal complete overlap', value: 10 }
        ],
        takeaway:
          'The best-case overlap bound is max(10, 4) = 10 ms, rather than their 14 ms serial sum.',
        caveat:
          'An illustrative lower bound, not a ParallelKittens measurement. Dependencies or bandwidth contention can prevent complete overlap.'
      }
    ]
  },
  'persistent-agent-harnesses': {
    visuals: [
      flow(
        'persistent-agent-harnesses-restart',
        'Recover a task after its worker disappears',
        'Durable records bridge the lifetime of a replaceable process.',
        [
          ['Read checkpoint', 'Recover the task state and the last recorded action identity.'],
          [
            'Reconcile action',
            'Determine whether the external action completed before the failure.'
          ],
          [
            'Resume safely',
            'Reuse a confirmed result or retry under the service’s idempotency contract.'
          ],
          ['Commit progress', 'Record the outcome before moving to the next task transition.']
        ],
        'Recovery needs a way to distinguish an unfinished action from a finished action whose result was not recorded.'
      ),
      matrix(
        'persistent-agent-harnesses-failure-window',
        'The crash window changes the recovery decision',
        'The same restart procedure must account for actions on both sides of an external boundary.',
        ['Durable evidence', 'Recovery question'],
        [
          [
            'Before action submission',
            ['An intent or checkpoint only', 'Is submitting this action still authorized?']
          ],
          [
            'After external completion',
            [
              'The outside system may have acted',
              'Can an operation ID or status query recover the result?'
            ]
          ],
          [
            'After outcome commit',
            [
              'A durable result is recorded',
              'Can the next state proceed without repeating the effect?'
            ]
          ]
        ],
        'A retry loop alone cannot provide exactly-once effects across independent systems.'
      )
    ]
  },
  'recent-ml-improvements-2026': {
    visuals: [
      matrix(
        'recent-ml-improvements-2026-stack-level',
        'Put an improvement at the layer it changes',
        'Different engineering interventions can be complementary without being interchangeable.',
        ['Changed object', 'Validation target'],
        [
          [
            'Attention kernel',
            [
              'The execution of existing tensor operations',
              'Numerical equivalence and workload-specific runtime'
            ]
          ],
          [
            'Agent training',
            ['The learned behavior under a task distribution', 'Held-out task success and transfer']
          ],
          [
            'Local deployment',
            [
              'Memory placement and runtime integration',
              'Complete working set, compatibility, and latency'
            ]
          ],
          [
            'Test-time allocation',
            ['How much work a request receives', 'Success under a latency or compute budget']
          ]
        ],
        'Compare each intervention against the objective at its own layer before composing them.'
      ),
      flow(
        'recent-ml-improvements-2026-compose',
        'Compose gains without multiplying incompatible claims',
        'A deployment experiment connects implementation details to a task-level result.',
        [
          ['Fix the job', 'Choose the hardware, model, test cases, and resource budget.'],
          ['Measure each change', 'Evaluate one kernel, training, or policy change at a time.'],
          [
            'Test the combination',
            'Check that precision, memory, and scheduling assumptions still hold together.'
          ],
          ['Validate the task', 'Measure success and resource use on the complete application.']
        ],
        'Published gains from unrelated workloads cannot be multiplied into a reliable end-to-end forecast.'
      )
    ]
  }
}
