import type { TopicVisualRegistry } from '../../types/topic-visuals'

export const inferenceServingVisuals: TopicVisualRegistry = {
  'ai-safety-systems': {
    visuals: [
      {
        id: 'ai-safety-systems-refund-checks',
        kind: 'matrix',
        title: 'A well-formed refund request can still fail',
        description:
          'Follow an illustrative invoice ID through independent checks. Passing one check leaves the later questions open.',
        columns: ['What passes', 'What remains'],
        rows: [
          {
            label: 'JSON parser',
            cells: ['The request is valid JSON.', 'Does it contain the required fields?']
          },
          {
            label: 'Schema',
            cells: ['invoiceId is a string.', 'Does that invoice exist and permit a refund?']
          },
          {
            label: 'Domain rules',
            cells: ['The invoice is paid and refundable.', 'May this principal refund it?']
          },
          {
            label: 'Authorization',
            cells: ['The principal may act on this invoice.', 'Did the tool create the refund?']
          }
        ],
        takeaway:
          'Syntax, business rules, authority, and the execution result need separate evidence.'
      },
      {
        id: 'ai-safety-systems-ambiguous-timeout',
        kind: 'sequence',
        title: 'Resolve an ambiguous tool timeout',
        description:
          'A refund service can finish its work before the response connection fails. A timeout leaves the outcome unknown.',
        steps: [
          {
            label: 'Identify the operation',
            detail: 'Assign an idempotency key to the approved refund before sending it.'
          },
          {
            label: 'Observe the timeout',
            detail:
              'Record an unknown outcome. The missing response does not establish whether a refund exists.'
          },
          {
            label: 'Read authoritative state',
            detail:
              'Look up the operation using the same key rather than asking the model whether it succeeded.'
          },
          {
            label: 'Resolve once',
            detail:
              'Return the recorded result or retry through the same idempotent boundary, then verify the postcondition.'
          }
        ],
        takeaway:
          'Retry safety depends on operation identity and verified state. A generated success message supplies neither.',
        caveat:
          'Illustrative tool contract. The service must support idempotency and an authoritative way to resolve operation status.'
      }
    ]
  },
  'checkpoint-formats': {
    visuals: [
      {
        id: 'checkpoint-formats-range-validation',
        kind: 'matrix',
        title: 'Validate a tensor before mapping its bytes',
        description:
          'Toy payload of 32 bytes. A 2 by 4 FP16 tensor needs 2 × 4 × 2 = 16 bytes. Ranges below exclude their end offset.',
        columns: ['Declared payload range', 'Decision'],
        rows: [
          {
            label: 'Correct span',
            cells: ['Bytes 8 to 24, length 16', 'Size and bounds pass.']
          },
          {
            label: 'Short span',
            cells: ['Bytes 8 to 20, length 12', 'Reject the shape and byte-count mismatch.']
          },
          {
            label: 'Past the end',
            cells: ['Bytes 24 to 40, length 16', 'Reject a range beyond the 32-byte payload.']
          }
        ],
        takeaway:
          'A correct tensor byte count does not establish valid file bounds. Check both before exposing a view.',
        caveat:
          'This toy checks size and bounds only. A real loader must validate the full format, including overlap rules.'
      },
      {
        id: 'checkpoint-formats-shape-preserving-error',
        kind: 'sequence',
        title: 'A conversion can preserve shapes and scramble meaning',
        description:
          'Toy packing example. The source interleaves two query and key groups; the destination expects each kind together.',
        steps: [
          {
            label: 'Read the source order',
            detail: 'The stored slots are Q1, K1, Q2, K2.'
          },
          {
            label: 'Check the destination order',
            detail: 'The runtime expects Q1, Q2, K1, K2. Conversion must rearrange the slots.'
          },
          {
            label: 'Watch the shape check pass',
            detail:
              'Copying four slots unchanged preserves tensor length while assigning K1 to the Q2 position.'
          },
          {
            label: 'Compare reference logits',
            detail:
              'Run fixed inputs through source and converted models. Compare numerical outputs rather than names and shapes alone.'
          }
        ],
        takeaway:
          'Layout identity is part of checkpoint compatibility. Identical dimensions can conceal a wrong permutation.',
        caveat:
          'The slot order is invented for teaching. Real conversions must follow the source and destination architecture definitions.'
      }
    ]
  },
  'continuous-batching-schedulers': {
    visuals: [
      {
        id: 'continuous-batching-schedulers-growth-reservation',
        kind: 'bars',
        title: 'Reserve growth before the first token',
        description:
          'Toy policy with 16 tokens per KV block, a 33-token prompt, and a 17-token output reservation. Round each reservation up separately.',
        unit: 'KV blocks',
        rows: [
          { label: 'Prompt', value: 3, detail: 'ceil of 33 ÷ 16 = 3' },
          { label: 'Future output', value: 2, detail: 'ceil of 17 ÷ 16 = 2' },
          { label: 'Admission reserve', value: 5, detail: '3 prompt blocks + 2 growth blocks' }
        ],
        takeaway:
          'Admitting against the three prompt blocks alone leaves future decoding without its planned capacity.',
        caveat:
          'Conservative example. Actual policies can reuse a partial prompt block or shared prefix pages and must handle output beyond the estimate.'
      },
      {
        id: 'continuous-batching-schedulers-preemption-cost',
        kind: 'compare',
        title: 'What preemption makes the server repay',
        description:
          'Both choices free device cache now. They pay different costs before the request can resume.',
        columns: [
          {
            label: 'Swap',
            points: [
              'Copy live KV state to host memory.',
              'Copy it back before decoding resumes.',
              'Budget both transfers and synchronization.'
            ]
          },
          {
            label: 'Recompute',
            points: [
              "Discard the request's live KV state.",
              'Replay its prompt and generated prefix.',
              'Budget the measured prefill work at resume.'
            ]
          }
        ],
        takeaway:
          'Compare restore cost with replay cost on the deployed system. Repeated preemption also signals an admission policy that reserves too little.'
      }
    ]
  },
  'disaggregated-llm-serving': {
    visuals: [
      {
        id: 'disaggregated-llm-serving-handoff-budget',
        kind: 'line',
        title: 'Cache bytes consume the handoff budget',
        description:
          'Assume 16 GiB/s effective bandwidth and 5 ms setup. Transfer time is at least 5 + 1000 × cache GiB ÷ 16 milliseconds.',
        xLabel: 'Cache payload, GiB',
        yLabel: 'Transfer lower bound, ms',
        points: [
          { x: 0, y: 5 },
          { x: 1, y: 67.5 },
          { x: 2, y: 130 },
          { x: 4, y: 255 }
        ],
        takeaway:
          'At the assumed rate, every extra GiB adds 62.5 ms before decode can use the full transferred cache.',
        caveat:
          'Analytical example, not a measured link. Contention, allocation, registration, and synchronization can add time; streamed handoffs can overlap stages.'
      },
      {
        id: 'disaggregated-llm-serving-cache-ownership',
        kind: 'sequence',
        title: 'Keep cache ownership until the receiver is ready',
        description:
          'A pointer or an enqueued send does not establish that the destination can read completed device writes.',
        steps: [
          {
            label: 'Reserve the destination',
            detail:
              'Confirm compatible model and cache layout, then reserve receive blocks before prefill starts.'
          },
          {
            label: 'Complete the source writes',
            detail:
              'Record the device event for the produced blocks. The transport waits on that event.'
          },
          {
            label: 'Complete the receive',
            detail:
              'The destination waits for transfer completion before allowing decode to read the blocks.'
          },
          {
            label: 'Acknowledge ownership',
            detail:
              'The receiver confirms the completed handoff while the source still holds its references.'
          },
          {
            label: 'Release the source',
            detail:
              'Reclaim source blocks after acknowledgement. Cancellation must clean up reservations and references on both sides.'
          }
        ],
        takeaway:
          'Transport completion and memory ownership belong in the serving protocol, alongside the tensor payload.'
      }
    ]
  },
  'edge-ai-deployment': {
    visuals: [
      {
        id: 'edge-ai-deployment-battery-budget',
        kind: 'bars',
        title: 'Battery runtime follows total system power',
        description:
          'Toy device with 20 Wh of usable battery energy. Runtime in hours equals 20 Wh divided by average whole-device power.',
        unit: 'hours',
        rows: [
          { label: '5 W average', value: 4, detail: '20 Wh ÷ 5 W' },
          { label: '10 W average', value: 2, detail: '20 Wh ÷ 10 W' },
          { label: '20 W average', value: 1, detail: '20 Wh ÷ 20 W' }
        ],
        takeaway:
          'Include capture, memory, radios, and cooling in the power budget. Accelerator efficiency alone cannot determine session length.',
        caveat:
          'Constant-power arithmetic with invented inputs. Real usable energy and power change with load, temperature, battery condition, and conversion losses.'
      },
      {
        id: 'edge-ai-deployment-reversible-update',
        kind: 'sequence',
        title: 'Make a model update reversible',
        description:
          'Keep the working artifact available while a candidate moves through download, validation, activation, and health checks.',
        steps: [
          {
            label: 'Fetch the candidate',
            detail: 'Download a versioned artifact while the current model continues serving.'
          },
          {
            label: 'Verify before activation',
            detail: 'Check the signed package, expected bytes, and runtime compatibility.'
          },
          {
            label: 'Stage and test',
            detail: 'Install into an inactive location and run fixed local inference fixtures.'
          },
          {
            label: 'Switch atomically',
            detail:
              'Activate the complete candidate as one version rather than exposing partially replaced files.'
          },
          {
            label: 'Keep a rollback route',
            detail:
              'Return to the previous artifact if the declared health checks fail after activation.'
          }
        ],
        takeaway:
          'The update succeeds when the device serves a healthy new version and retains a working recovery path.'
      }
    ]
  },
  'inception-mercury-diffusion-language-models': {
    visuals: [
      {
        id: 'inception-mercury-diffusion-language-models-action-commit',
        kind: 'sequence',
        title: 'Put a commitment boundary before a tool action',
        description:
          'Hypothetical refinement client. An intermediate tool argument can change while the decoder revises its draft.',
        steps: [
          {
            label: 'Observe a draft',
            detail:
              'A provisional tool call names destination A. The client displays it as unfinished content.'
          },
          {
            label: 'Allow a revision',
            detail:
              'A later draft names destination B. Keep both drafts outside the execution path.'
          },
          {
            label: 'Receive final arguments',
            detail: "Wait for the serving interface's declared completion or commitment event."
          },
          {
            label: 'Validate the action',
            detail:
              'Check the final schema, domain rules, and authorization. Bind any required approval to those exact arguments.'
          },
          {
            label: 'Execute once',
            detail: 'Send the approved final operation through an idempotent tool boundary.'
          }
        ],
        takeaway: 'A visible draft and an executable action need different lifecycle states.',
        caveat:
          'Illustrative application protocol. It does not describe Mercury 2 internals or claim that its API exposes intermediate tool arguments.'
      },
      {
        id: 'inception-mercury-diffusion-language-models-useful-event',
        kind: 'matrix',
        title: 'Measure the first output the application can use',
        description:
          'A throughput number hides when a consumer can safely accept the result. Choose the completion event for the task.',
        columns: ['Useful completion event', 'What an early draft leaves open'],
        rows: [
          {
            label: 'Extraction',
            cells: [
              'A completed, validated object',
              'Required fields and closing syntax may still change.'
            ]
          },
          {
            label: 'Editing',
            cells: ['A stable replacement span', 'Text already shown may need another revision.']
          },
          {
            label: 'Tool selection',
            cells: [
              'Final arguments that pass application checks',
              'The selected operation or destination may change.'
            ]
          }
        ],
        takeaway:
          'Compare latency to the same usable event at a matched quality target. First visible text can measure a different outcome.',
        caveat:
          'Consumer requirements vary. A final or stable output can still contain factual errors.'
      }
    ]
  },
  'inference-engine-architectures': {
    visuals: [
      {
        id: 'inference-engine-architectures-branch-prefill',
        kind: 'bars',
        title: 'A branching program can avoid duplicate prefill',
        description:
          'Toy pair of calls with an identical 4,000-token preamble and separate 250-token suffixes. Count newly processed prompt positions.',
        unit: 'prompt positions',
        rows: [
          {
            label: 'Independent prefills',
            value: 8500,
            detail: '2 × 4,000 shared tokens + 2 × 250 suffix tokens'
          },
          {
            label: 'Reuse one preamble',
            value: 4500,
            detail: '4,000 shared tokens once + 2 × 250 suffix tokens'
          }
        ],
        takeaway:
          'The runtime can remove 4,000 repeated prompt positions when it recognizes shared state across calls.',
        caveat:
          'Work-count example, not a latency prediction. Reuse requires compatible cache identity, resident state, and support for the shared prefix.'
      },
      {
        id: 'inference-engine-architectures-benchmark-confounds',
        kind: 'matrix',
        title: 'One benchmark change can answer a different question',
        description:
          'These changes alter the work or numerical behavior being compared, even when both runs report tokens per second.',
        columns: ['Changed condition', 'What the result also measures'],
        rows: [
          {
            label: 'Precision',
            cells: [
              'One engine uses lower-bit weights.',
              'Different storage, kernels, and output behavior.'
            ]
          },
          {
            label: 'Prefix state',
            cells: [
              'Only one engine starts with a cached preamble.',
              'Different amounts of prefill work.'
            ]
          },
          {
            label: 'Request lengths',
            cells: [
              'One run uses fixed short outputs.',
              'A different batch lifetime and queue distribution.'
            ]
          },
          {
            label: 'Warmup',
            cells: [
              'Only one run includes graph capture.',
              'Startup work mixed into steady-state latency.'
            ]
          }
        ],
        takeaway:
          'Match the work, numerical configuration, and readiness state before attributing a difference to engine architecture.'
      }
    ]
  },
  'inference-slos': {
    visuals: [
      {
        id: 'inference-slos-queue-headroom',
        kind: 'line',
        title: 'Queue delay grows faster than utilization',
        description:
          'In an M/M/1 teaching model, mean queue wait divided by mean service time equals utilization divided by its unused fraction.',
        xLabel: 'Utilization, percent',
        yLabel: 'Mean queue wait, service times',
        points: [
          { x: 50, y: 1 },
          { x: 75, y: 3 },
          { x: 90, y: 9 },
          { x: 95, y: 19 }
        ],
        takeaway:
          'Raising utilization from 90% to 95% more than doubles mean waiting in this model.',
        caveat:
          'Assumes one server with Poisson arrivals and exponential service times. These are mean waits, not p99 predictions for an LLM scheduler.'
      },
      {
        id: 'inference-slos-stream-duration',
        kind: 'bars',
        title: 'A fast first token can still leave a long response',
        description:
          'Toy 50-token response with a 400 ms first token and 40 ms between subsequent tokens. There are 49 remaining intervals.',
        unit: 'ms',
        rows: [
          { label: 'First token', value: 400, detail: 'Queue and prompt processing combined' },
          { label: 'Remaining intervals', value: 1960, detail: '49 × 40 ms' },
          { label: 'Completed response', value: 2360, detail: '400 + 1,960 ms' }
        ],
        takeaway:
          'First-token latency and stream cadence control different parts of the same completion time.',
        caveat:
          'Constant-cadence arithmetic. Real streams include variable token gaps, transport delays, and application processing.'
      }
    ]
  },
  'kv-cache-memory-systems': {
    visuals: [
      {
        id: 'kv-cache-memory-systems-reference-lifecycle',
        kind: 'sequence',
        title: 'A cancelled branch must release its own references',
        description:
          'Track active-request references to one completed prefix block as two continuations share it.',
        steps: [
          {
            label: 'One active request',
            detail:
              'Request A holds one reference to prefix block P. Its continuation uses private blocks.'
          },
          {
            label: 'A second request shares P',
            detail: 'Request B acquires another reference. P now has two active-request references.'
          },
          {
            label: 'Cancel A',
            detail: "Release A's private blocks and decrement P to one reference. B still needs P."
          },
          {
            label: 'Finish B',
            detail: "Release B's private blocks and decrement P to zero active-request references."
          },
          {
            label: 'Apply the cache policy',
            detail:
              'P can remain as an evictable prefix entry. Reclaim it only after all other owners and in-flight operations release it.'
          }
        ],
        takeaway:
          'Request cleanup must distinguish shared blocks from private continuations. One missed decrement can keep memory live indefinitely.',
        caveat:
          'Counts shown are active-request references only. Implementations may track cache ownership and transport references separately.'
      },
      {
        id: 'kv-cache-memory-systems-false-hit',
        kind: 'matrix',
        title: 'Identical visible text can produce a false cache hit',
        description:
          'Each row changes one cache-relevant input while keeping the displayed prompt text the same.',
        columns: ['Changed input', 'Why the state differs'],
        rows: [
          {
            label: 'Tokenization',
            cells: ['Different token IDs', 'The model receives a different sequence.']
          },
          {
            label: 'Adapter',
            cells: [
              'Different adapter identity',
              'The forward pass uses different effective weights.'
            ]
          },
          {
            label: 'Model revision',
            cells: ['Different base checkpoint', 'The cached projections came from other weights.']
          },
          {
            label: 'Media or positions',
            cells: [
              'Different embeddings or position policy',
              'Text alone omits inputs to the cached computation.'
            ]
          }
        ],
        takeaway:
          'Cache identity must cover the inputs that determine state, including the preceding prefix. A text-only key is insufficient.'
      }
    ]
  },
  'local-ai-inferencing-techniques': {
    visuals: [
      {
        id: 'local-ai-inferencing-techniques-optimization-ceiling',
        kind: 'bars',
        title: 'A faster kernel has an end-to-end ceiling',
        description:
          'Toy 100 ms request. The chosen kernel occupies 40 ms; the other 60 ms stays fixed. Total time becomes 60 + 40 ÷ kernel speedup.',
        unit: 'ms per request',
        rows: [
          { label: 'Original kernel', value: 100, detail: '60 + 40 ms' },
          { label: 'Kernel twice as fast', value: 80, detail: '60 + 20 ms' },
          { label: 'Kernel four times as fast', value: 70, detail: '60 + 10 ms' }
        ],
        takeaway:
          'A fourfold kernel improvement yields 100 ÷ 70, about 1.43 times the request speed. Profile the remaining work before choosing another optimization.',
        caveat:
          'Serial timing model with invented inputs. Overlap, new overhead, or a changed workload can alter the result.'
      },
      {
        id: 'local-ai-inferencing-techniques-prefix-break',
        kind: 'sequence',
        title: 'An early timestamp can end a prefix match',
        description:
          'Two requests share the same instructions and reference document, but have different request timestamps.',
        steps: [
          {
            label: 'Place changing content first',
            detail:
              'The prompt begins with the timestamp, followed by the fixed instructions and document.'
          },
          {
            label: 'Compare token prefixes',
            detail:
              'Matching stops at the first differing timestamp token. Later identical document tokens do not restore a contiguous prefix match.'
          },
          {
            label: 'Move the changing suffix',
            detail:
              'Where meaning permits, put fixed instructions and the document before the timestamp and current question.'
          },
          {
            label: 'Reuse the unchanged beginning',
            detail:
              'A compatible prefix cache can retain the shared beginning and compute the changing suffix.'
          }
        ],
        takeaway: 'Prompt order determines how much identical work a prefix cache can recognize.',
        caveat:
          'Reorder only when application meaning permits it. Cache keys still need model, tokenizer, adapter, and other state-changing inputs.'
      }
    ]
  },
  'model-cold-starts': {
    visuals: [
      {
        id: 'model-cold-starts-pipeline-arithmetic',
        kind: 'bars',
        title: 'Chunking removes idle transfer time',
        description:
          'Toy 12 GiB load with 2 GiB/s network and 4 GiB/s host-to-device transfer. Compare serial loading with three 4 GiB chunks.',
        unit: 'seconds',
        rows: [
          { label: 'Serial stages', value: 9, detail: 'Fetch for 6 s, then transfer for 3 s.' },
          {
            label: 'Three-chunk pipeline',
            value: 7,
            detail: 'Each fetch takes 2 s. Transfers finish at 3, 5, and 7 s.'
          },
          {
            label: 'Ideal streaming floor',
            value: 6,
            detail: '12 GiB ÷ the slower 2 GiB/s stage, ignoring pipeline startup and drain.'
          }
        ],
        takeaway:
          'Overlapping independent resources replaces idle time with useful transfer, but finite chunks leave a final drain interval.',
        caveat:
          'Two-stage analytical example with independent resources. Parsing, staging copies, allocation, initialization, and warmup are excluded.'
      },
      {
        id: 'model-cold-starts-readiness',
        kind: 'sequence',
        title: 'Process health precedes serving readiness',
        description:
          'A replica should enter the request pool only after its loading and warmup work has completed.',
        steps: [
          {
            label: 'Process starts',
            detail: 'The server can answer a health probe while its checkpoint is still loading.'
          },
          {
            label: 'Weights become resident',
            detail:
              'Finish the required transfers and allocations. Keep readiness false while warmup remains.'
          },
          {
            label: 'Run the warmup forward pass',
            detail:
              'Exercise required kernels, workspace allocation, autotuning, and graph capture for the declared serving configuration.'
          },
          {
            label: 'Admit traffic',
            detail:
              'Report ready after the warmup succeeds. Record loading and warming spans separately when it fails.'
          }
        ],
        takeaway:
          'Readiness gating keeps model loading and first-pass initialization out of ordinary user requests.'
      }
    ]
  },
  'model-hub-infrastructure': {
    visuals: [
      {
        id: 'model-hub-infrastructure-missing-chunks',
        kind: 'bars',
        title: 'Transfer the missing chunks of a new revision',
        description:
          'Toy artifact with eight 1 GiB chunks. The next revision reuses six cached chunks and introduces two new chunks.',
        unit: 'GiB transferred',
        rows: [
          { label: 'Fetch the whole artifact', value: 8, detail: '8 chunks × 1 GiB' },
          { label: 'Fetch missing chunks', value: 2, detail: '2 uncached chunks × 1 GiB' }
        ],
        takeaway:
          'This fixture saves 6 GiB of payload transfer because six chunk identities remain unchanged.',
        caveat:
          'Invented chunk inventory, not an expected fine-tuning saving. Manifests, chunk lookup, and local assembly costs are excluded.'
      },
      {
        id: 'model-hub-infrastructure-rollback-identity',
        kind: 'compare',
        title: 'A rollback must restore the model revision too',
        description:
          'Consider a service that has promoted image B and weights B, then restores its previous image A.',
        columns: [
          {
            label: 'Moving model name',
            points: [
              'Restore image A.',
              "Resolve the model's main branch again.",
              'The branch may still select weights B or a later revision.'
            ]
          },
          {
            label: 'Pinned deployment manifest',
            points: [
              'Restore image A and model revision A.',
              'Resolve its declared weights, config, and tokenizer.',
              'Verify the selected artifacts before loading.'
            ]
          }
        ],
        takeaway:
          'Container identity and model identity form one release record. Restoring only the container leaves the model choice unresolved.'
      }
    ]
  },
  'modern-attention-kernels': {
    visuals: [
      {
        id: 'modern-attention-kernels-online-rescale',
        kind: 'sequence',
        title: 'Rescale the old softmax state when a larger score arrives',
        description:
          'Toy single-query attention with scores 0 and ln 2, and scalar values 2 and 8. The second tile raises the running maximum.',
        steps: [
          {
            label: 'Process the first tile',
            detail: 'Maximum m = 0, normalization sum l = 1, and weighted accumulator o = 2.'
          },
          {
            label: 'Read the larger score',
            detail:
              'The new maximum is ln 2. The old state needs factor exp of 0 minus ln 2, which equals one half.'
          },
          {
            label: 'Rescale both accumulators',
            detail: 'l becomes 0.5 × 1 + 1 = 1.5. o becomes 0.5 × 2 + 8 = 9.'
          },
          {
            label: 'Normalize once',
            detail:
              'Output o ÷ l = 9 ÷ 1.5 = 6, matching the full-row weights of one third and two thirds.'
          }
        ],
        takeaway:
          'Rescaling only the denominator breaks attention. The weighted output accumulator must follow the same maximum change.',
        caveat:
          'Exact real-number arithmetic for two keys. Floating-point kernels need precision-appropriate numerical tolerances.'
      },
      {
        id: 'modern-attention-kernels-page-lookup',
        kind: 'matrix',
        title: 'Translate a token position through the page table',
        description:
          'Toy 16-token blocks. Logical block 0 maps to physical page 5; logical block 1 maps to page 2. Token positions start at zero.',
        columns: ['Logical block and offset', 'Physical page and offset'],
        rows: [
          { label: 'Token 0', cells: ['0 ÷ 16 gives block 0, offset 0', 'Page 5, offset 0'] },
          { label: 'Token 15', cells: ['15 ÷ 16 gives block 0, offset 15', 'Page 5, offset 15'] },
          { label: 'Token 16', cells: ['16 ÷ 16 gives block 1, offset 0', 'Page 2, offset 0'] }
        ],
        takeaway:
          'Logical sequence order survives non-contiguous allocation because the kernel resolves each page through the block table.',
        caveat:
          'Address translation example only. Actual byte addresses also depend on token stride, page stride, and the cache layout.'
      }
    ]
  },
  'nvidia-dynamo-nixl-distributed-inference': {
    visuals: [
      {
        id: 'nvidia-dynamo-nixl-distributed-inference-link-demand',
        kind: 'line',
        title: 'More prefill workers can overload one transfer link',
        description:
          'Toy sustained load. Each prefill worker produces 2 GiB/s of cache traffic over a shared link that can carry 6 GiB/s.',
        xLabel: 'Active prefill workers',
        yLabel: 'Offered cache traffic, GiB/s',
        points: [
          { x: 1, y: 2 },
          { x: 2, y: 4 },
          { x: 3, y: 6 },
          { x: 4, y: 8 }
        ],
        takeaway:
          'Four workers offer 8 GiB/s to a 6 GiB/s link. The excess 2 GiB/s accumulates unless admission or backpressure reduces production.',
        caveat:
          'Invented constant rates, not Dynamo or NIXL measurements. Bursts, topology, and other traffic can create queues below this average limit.'
      },
      {
        id: 'nvidia-dynamo-nixl-distributed-inference-receiver-wait',
        kind: 'sequence',
        title: 'Separate transport time from receiver waiting',
        description:
          'Toy timestamps in milliseconds after request arrival. A transfer can take 10 ms while its receiver waits 30 ms for usable state.',
        steps: [
          {
            label: 'Receiver ready at 20 ms',
            detail:
              'The decode worker has capacity, but the producer has not completed the required cache.'
          },
          {
            label: 'Producer ready at 40 ms',
            detail:
              "Prefill completes the cache. Twenty milliseconds of the receiver's wait has already elapsed."
          },
          {
            label: 'Transfer ends at 50 ms',
            detail:
              'The 10 ms transfer completes and the required state becomes usable at the receiver.'
          },
          {
            label: 'Decode starts at 50 ms',
            detail: 'Receiver waiting is 50 minus 20 = 30 ms. Transport accounts for 10 ms of it.'
          }
        ],
        takeaway:
          'Record producer readiness, transfer completion, and consumer readiness separately to locate the delay.',
        caveat:
          'Illustrative complete-cache handoff with no extra synchronization or overlap. Real systems may stream state by block or layer.'
      }
    ]
  },
  'on-device-multimodal-ai': {
    visuals: [
      {
        id: 'on-device-multimodal-ai-workspace-overlap',
        kind: 'bars',
        title: 'Encoder overlap changes peak live memory',
        description:
          'Toy 4 GiB persistent budget plus a 1.5 GiB vision workspace and 1 GiB audio workspace. Retained encoder outputs are included in the persistent budget.',
        unit: 'GiB peak live memory',
        rows: [
          { label: 'Persistent state', value: 4, detail: 'Weights, cache, and retained outputs' },
          { label: 'Encoders together', value: 6.5, detail: '4 + 1.5 + 1 GiB' },
          { label: 'Encoders in sequence', value: 5.5, detail: '4 + max of 1.5 and 1 GiB' }
        ],
        takeaway:
          'Releasing one temporary workspace before allocating the next saves 1 GiB at the peak under these assumptions.',
        caveat:
          'Invented allocations. Serial execution can add latency; real peaks also include buffers, runtime plans, and operating-system use.'
      },
      {
        id: 'on-device-multimodal-ai-media-token-budget',
        kind: 'matrix',
        title: 'Reserve output after counting media tokens',
        description:
          'Toy 4,096-token context. Treat image and audio encoder outputs as part of the language model sequence before admitting a request.',
        columns: ['Reserved tokens', 'Running total'],
        rows: [
          { label: 'Text', cells: ['2,048', '2,048'] },
          { label: 'Images', cells: ['1,024', '3,072'] },
          { label: 'Audio', cells: ['512', '3,584'] },
          { label: 'Generated output', cells: ['512', '4,096'] }
        ],
        takeaway:
          'These inputs fill the budget exactly. Adding another frame requires reducing another allocation before preprocessing or cache growth.',
        caveat:
          'Invented token counts. Include modality delimiters and other special tokens in the text allowance; actual media tokenization is model-specific.'
      }
    ]
  },
  'quantization-interactive-guide': {
    visuals: [
      {
        id: 'quantization-interactive-guide-input-weighted-error',
        kind: 'matrix',
        title: 'Equal weight errors can produce unequal output errors',
        description:
          'Toy linear output y = w · x with input x = [10, 1]. Each candidate weight error has Euclidean norm 0.1.',
        columns: ['Weight error vector', 'Output error, dot product with x'],
        rows: [
          { label: 'First channel perturbed', cells: ['[0.1, 0]', '0.1 × 10 + 0 × 1 = 1'] },
          { label: 'Second channel perturbed', cells: ['[0, 0.1]', '0 × 10 + 0.1 × 1 = 0.1'] }
        ],
        takeaway:
          'The input makes one equal-sized weight error ten times more costly at the output. Weight reconstruction error alone misses that dependence.',
        caveat:
          'One linear operation on one invented input. It does not predict language-model quality or identify important channels across a workload.'
      },
      {
        id: 'quantization-interactive-guide-calibration-mismatch',
        kind: 'sequence',
        title: 'A calibration workload can miss the deployment workload',
        description:
          'Hypothetical quantization pipeline calibrated on short prose and deployed on long code. Follow the mismatch without assuming a particular accuracy loss.',
        steps: [
          {
            label: 'Collect short-prose statistics',
            detail:
              'The calibration inputs determine the observed ranges and channel statistics used by the quantizer.'
          },
          {
            label: 'Serve long code',
            detail:
              'The deployed inputs can exercise ranges and contexts that the calibration set did not cover.'
          },
          {
            label: 'Compare with the reference',
            detail:
              'Evaluate the quantized model against the unquantized checkpoint on held-out code tasks at the target lengths.'
          },
          {
            label: 'Revise and retest',
            detail:
              'If failures trace to calibration, revise that corpus, regenerate the candidate, and repeat the held-out comparison.'
          }
        ],
        takeaway:
          'Calibration chooses a representation. Separate deployment-like evaluation determines whether that representation preserves useful behavior.',
        caveat:
          'A possible failure mechanism, not a measured regression. Keep calibration examples separate from the final evaluation set.'
      }
    ]
  },
  'retrieval-systems': {
    visuals: [
      {
        id: 'retrieval-systems-rrf-arithmetic',
        kind: 'matrix',
        title: 'Fuse rank positions without adding raw scores',
        description:
          'Toy reciprocal rank fusion with k = 1 and two ranked lists. Each appearance contributes 1 divided by the sum of one and rank. An absent passage contributes zero.',
        columns: ['Lexical rank', 'Dense rank', 'Fused score'],
        rows: [
          { label: 'Passage A', cells: ['1', '4', '1/2 + 1/5 = 0.700'] },
          { label: 'Passage B', cells: ['2', '2', '1/3 + 1/3 ≈ 0.667'] },
          { label: 'Passage C', cells: ['Absent', '1', '0 + 1/2 = 0.500'] }
        ],
        takeaway:
          'Support from both lists can outweigh a top position in only one list, without calibrating their original score scales.',
        caveat:
          'Invented rankings and a small teaching constant. Fusion scores are ranking signals, not probabilities of relevance.'
      },
      {
        id: 'retrieval-systems-metric-counterexample',
        kind: 'compare',
        title: 'Perfect recall can hide a worse first result',
        description:
          'Toy corpus with exactly two relevant passages, A and C. Passage B is irrelevant. Both result lists return all three passages.',
        columns: [
          {
            label: 'Relevant passage first',
            points: [
              'Order A, B, C.',
              'Recall at 3 = 2/2 = 1; precision at 3 = 2/3.',
              'Reciprocal rank = 1.'
            ]
          },
          {
            label: 'Relevant passage second',
            points: [
              'Order B, A, C.',
              'Recall at 3 = 2/2 = 1; precision at 3 = 2/3.',
              'Reciprocal rank = 1/2.'
            ]
          }
        ],
        takeaway:
          'Recall and precision at a fixed depth do not measure the order within that result set. Add a ranking-sensitive metric.',
        caveat:
          'One-query example. Mean reciprocal rank averages the reciprocal-rank value over a set of queries.'
      }
    ]
  },
  'serving-many-lora-adapters': {
    visuals: [
      {
        id: 'serving-many-lora-adapters-matrix-budget',
        kind: 'bars',
        title: 'Count the adapter for one target matrix',
        description:
          'Toy 4,096 by 4,096 base matrix with rank 16 LoRA factors. Store every scalar in two bytes.',
        unit: 'MiB of matrix weights',
        rows: [
          {
            label: 'Base matrix',
            value: 32,
            detail: '4,096 × 4,096 × 2 bytes ÷ 2²⁰'
          },
          {
            label: 'Both LoRA factors',
            value: 0.25,
            detail: '2 factors × 16 × 4,096 scalars × 2 bytes ÷ 2²⁰'
          }
        ],
        takeaway:
          'For this matrix, the adapter weights use one 128th of the base weight storage. The shared base still has to remain available.',
        caveat:
          'One targeted matrix only. A full adapter may cover many layers and needs scaling metadata; KV cache and runtime workspaces are excluded.'
      },
      {
        id: 'serving-many-lora-adapters-miss-isolation',
        kind: 'sequence',
        title: 'An adapter miss should delay one admission',
        description:
          'Request A uses a resident adapter. Request B arrives with an adapter that must be fetched.',
        steps: [
          {
            label: 'Check B before batching',
            detail:
              "Look up B's exact adapter revision and compatible base revision during admission."
          },
          {
            label: 'Start a separate fetch',
            detail:
              'Keep B queued while its adapter warms. The fetch stays outside the active decode step.'
          },
          {
            label: 'Keep A decoding',
            detail:
              "The running batch continues with resident adapters rather than waiting on B's storage path."
          },
          {
            label: 'Admit B when ready',
            detail:
              "Make the fetched adapter available, retain it while needed, and attach its identity to B's batch row and cache key."
          }
        ],
        takeaway:
          "A cold adapter belongs in that request's queue time. Fetching inside decode spreads its stall to every active tenant."
      }
    ]
  },
  'speculative-decoding': {
    visuals: [
      {
        id: 'speculative-decoding-probability-correction',
        kind: 'matrix',
        title: "Correct the draft's excess probability",
        description:
          'Toy vocabulary with tokens A and B. Accept each proposed token with probability min of one and target p divided by draft q.',
        columns: ['Draft q', 'Target p', 'Acceptance'],
        rows: [
          { label: 'Token A', cells: ['0.8', '0.6', '0.6 ÷ 0.8 = 0.75'] },
          { label: 'Token B', cells: ['0.2', '0.4', 'min of 1 and 2 = 1'] }
        ],
        takeaway:
          'A contributes 0.8 × 0.75 = 0.6. Its rejected 0.2 becomes B through residual sampling, giving B 0.2 + 0.2 = 0.4.',
        caveat:
          'Exact two-token arithmetic. Use the actual processed sampling distributions, including temperature, penalties, and token constraints.'
      },
      {
        id: 'speculative-decoding-cache-rollback',
        kind: 'sequence',
        title: 'Rollback must follow the committed prefix',
        description:
          'Toy request starts with 20 committed positions and drafts positions 21 through 24. Verification rejects position 23.',
        steps: [
          {
            label: 'Reserve provisional state',
            detail: 'Track draft positions 21 through 24 separately from the committed prefix.'
          },
          {
            label: 'Accept positions 21 and 22',
            detail: 'Keep their verified state and advance the accepted prefix to position 22.'
          },
          {
            label: 'Reject position 23',
            detail:
              'Discard the provisional states for 23 and 24. The later draft token cannot survive the earlier rejection.'
          },
          {
            label: 'Append the correction',
            detail:
              'Sample the residual correction for position 23 and append that token to the logical committed prefix.'
          },
          {
            label: 'Reconcile before reuse',
            detail:
              'Advance or rebuild missing corrected state in both models. Update per-request lengths and block tables before the next batch uses them.'
          }
        ],
        takeaway:
          'Accepted-token counts, cache contents, and logical positions must agree after every speculative round.',
        caveat:
          'Logical positions are shown. Physical implementations must also truncate partial blocks and release unused reservations.'
      }
    ]
  },
  'structured-generation': {
    visuals: [
      {
        id: 'structured-generation-budget-exhaustion',
        kind: 'sequence',
        title: 'Legal prefixes can still end as incomplete JSON',
        description:
          'A grammar can keep every generated prefix extendable while the output token budget runs out before the document is complete.',
        steps: [
          {
            label: 'Generate an extendable prefix',
            detail:
              'The bytes {"count":1 can still become a valid object by adding its closing brace.'
          },
          {
            label: 'Check the accepting state',
            detail:
              'The object remains open. A legal continuation exists, but ordinary end-of-sequence is premature.'
          },
          {
            label: 'Exhaust the budget',
            detail:
              'The runtime reaches its output limit before emitting the required closing brace.'
          },
          {
            label: 'Return a failure status',
            detail:
              'Report budget exhaustion outside the generated payload. Preserve the distinction between partial bytes and an accepted document.'
          }
        ],
        takeaway:
          'Prefix validity does not guarantee completed output within a finite budget. Successful termination also requires an accepting grammar state.'
      },
      {
        id: 'structured-generation-mask-properties',
        kind: 'compare',
        title: 'A grammar mask needs soundness and completeness',
        description:
          'The two properties protect different parts of tokenizer-aware decoding. Test them separately.',
        columns: [
          {
            label: 'Soundness',
            points: [
              'Every admitted token leaves a valid grammatical completion reachable.',
              'A failure lets the decoder enter a dead end.',
              'Test illegal delimiters and tokens that violate the current parse state.'
            ]
          },
          {
            label: 'Completeness',
            points: [
              'Every token that permits a valid completion stays available.',
              'A failure blocks a valid tokenization path.',
              'Test tokens that span a quote, property text, and a colon.'
            ]
          }
        ],
        takeaway:
          'Rejecting too little can break syntax. Rejecting too much can distort generation even when the intended text is grammatical.',
        caveat:
          'These properties concern the supported grammar and tokenizer. They do not establish factual correctness, domain validity, or permission to act.'
      }
    ]
  },
  'tensorrt-triton-inference': {
    visuals: [
      {
        id: 'tensorrt-triton-inference-graph-padding',
        kind: 'bars',
        title: 'Nine requests can occupy sixteen graph slots',
        description:
          'Toy replay policy captures batches of 8 and 16, then pads an active batch to the next captured size. Nine active requests choose 16 slots.',
        unit: 'batch slots',
        rows: [
          { label: 'Active requests', value: 9, detail: 'Useful sequence rows' },
          { label: 'Padding', value: 7, detail: '16 captured slots minus 9 active rows' },
          { label: 'Replayed graph', value: 16, detail: '9 active + 7 padded slots' }
        ],
        takeaway:
          'Only 9/16, or 56.25%, of these slots carry requests. Reduced launch overhead must repay the extra padded work.',
        caveat:
          'Invented capture sizes and policy. Slot occupancy is not a measured compute-efficiency ratio or a TensorRT performance claim.'
      },
      {
        id: 'tensorrt-triton-inference-shape-limits',
        kind: 'matrix',
        title: 'Prompt and total-length limits reject different requests',
        description:
          'Toy engine profile allows at most 4,096 prompt tokens and 8,192 total tokens. Test both limits before reserving serving capacity.',
        columns: ['Prompt + requested output', 'Shape admission'],
        rows: [
          { label: 'Request A', cells: ['4,000 + 4,000 = 8,000', 'Both limits pass.'] },
          {
            label: 'Request B',
            cells: ['4,000 + 5,000 = 9,000', 'Reject the total-length limit.']
          },
          { label: 'Request C', cells: ['5,000 + 100 = 5,100', 'Reject the prompt-length limit.'] }
        ],
        takeaway:
          'A request can satisfy one shape limit and exceed another. The accepted shape must also fit the live cache and workspace budget.',
        caveat:
          'Example profile only. Passing these two limits does not establish batch capacity, available memory, or compatibility with a particular engine.'
      }
    ]
  },
  'test-time-compute': {
    visuals: [
      {
        id: 'test-time-compute-verifier-budget',
        kind: 'bars',
        title: 'Candidates bring their verifier bill',
        description:
          'Toy budget of 100 compute units. Each candidate costs 20 units to generate and 5 units to verify. Four candidates use the whole budget.',
        unit: 'compute units',
        rows: [
          { label: 'Generation', value: 80, detail: '4 candidates × 20 units' },
          { label: 'Verification', value: 20, detail: '4 candidates × 5 units' },
          { label: 'Complete search round', value: 100, detail: '80 + 20 units' }
        ],
        takeaway:
          'Budgeting generation alone would admit five candidates and spend 125 units once their verification is included.',
        caveat:
          'Invented accounting units. Equal compute budgets need not produce equal wall-clock latency, especially with batching and parallel candidates.'
      },
      {
        id: 'test-time-compute-correlated-votes',
        kind: 'compare',
        title: 'Four samples can repeat one mistake',
        description:
          'Toy puzzle with a checker that accepts 41. Three sampled paths answer 42; the fourth answers 41.',
        columns: [
          {
            label: 'Majority selection',
            points: [
              'Three votes support 42.',
              'The selection rule returns 42.',
              'Agreement preserves the shared wrong answer.'
            ]
          },
          {
            label: 'External checking',
            points: [
              'Check all four proposed answers.',
              'The declared checker accepts 41.',
              'Select the already-generated candidate that passes.'
            ]
          }
        ],
        takeaway:
          'Sampling supplies candidates. A selection rule needs evidence that separates correct answers from correlated errors.',
        caveat:
          'Authored counterexample, not an accuracy result. Real checkers can be incomplete, incorrect, or outside their valid task domain.'
      }
    ]
  },
  'which-model-can-run-on-your-device': {
    visuals: [
      {
        id: 'which-model-can-run-on-your-device-conversion-storage',
        kind: 'bars',
        title: 'Conversion needs room for more than its final file',
        description:
          'Toy conversion retains a 16 GiB source, writes a 4 GiB output, and uses 2 GiB of temporary files. All three coexist at the peak.',
        unit: 'GiB of storage',
        rows: [
          { label: 'Source checkpoint', value: 16, detail: 'Retained during conversion' },
          { label: 'Converted output', value: 4, detail: 'The final file alone' },
          { label: 'Temporary files', value: 2, detail: 'Assumed conversion scratch space' },
          { label: 'Peak combined storage', value: 22, detail: '16 + 4 + 2 GiB' }
        ],
        takeaway:
          'With the source already stored, conversion still needs 6 GiB free for the output and temporary files.',
        caveat:
          'Invented file sizes and coexistence policy. Actual converters differ. This calculation covers storage capacity rather than RAM or accelerator memory.'
      },
      {
        id: 'which-model-can-run-on-your-device-mapped-refault',
        kind: 'sequence',
        title: 'A mapped load can pass before residency becomes a problem',
        description:
          'Follow a file-backed model whose active working set exceeds the available RAM. Mapping succeeds before repeated storage reads affect generation.',
        steps: [
          {
            label: 'Create the mapping',
            detail:
              'The process receives a virtual address range. This does not establish that every backing page is resident.'
          },
          {
            label: 'Touch weights during execution',
            detail: 'Accessing a missing page triggers a read from its backing storage.'
          },
          {
            label: 'Reclaim under pressure',
            detail:
              'The operating system evicts clean file-backed pages to make room for other allocations.'
          },
          {
            label: 'Touch evicted weights again',
            detail:
              'Later execution reads those pages from storage again, placing I/O on the request path.'
          },
          {
            label: 'Measure the full session',
            detail:
              'Correlate page faults, storage reads, resident memory, and token latency under the intended prompt and generation lengths.'
          }
        ],
        takeaway:
          'Successful mapping establishes addressability. Sustained performance depends on the pages that remain resident during execution.',
        caveat:
          'This describes memory pressure with repeated access. A working set that stays resident does not require repeated storage reads.'
      }
    ]
  }
}
