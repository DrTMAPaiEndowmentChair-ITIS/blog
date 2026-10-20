import type { TopicVisualRegistry } from '../../types/topic-visuals'

export const modelTrainingVisuals: TopicVisualRegistry = {
  'activation-patching-causal-experiments': {
    visuals: [
      {
        id: 'activation-patching-causal-experiments-transplant',
        kind: 'sequence',
        title: 'Follow one activation transplant',
        description:
          'Use the folder-recipient contrast to track exactly what changes in the recipient run.',
        steps: [
          {
            label: 'Align the roles',
            detail:
              'Match the giver, recipient, and prediction positions across the Maya and Leo prompts. Check their token positions explicitly.'
          },
          {
            label: 'Cache the donor',
            detail:
              'Run the reference prompt and save the chosen head output at the chosen layer and position.'
          },
          {
            label: 'Replace one state',
            detail:
              'Run the contrast prompt. At that same site, substitute the cached donor output.'
          },
          {
            label: 'Recompute descendants',
            detail:
              'Let later computation run on the hybrid state, then measure the reference-answer minus contrast-answer logit margin.'
          }
        ],
        takeaway:
          'The patch transfers one specified object. Recomputing its descendants connects that replacement to the measured answer.',
        caveat:
          'A natural donor activation can still create an unusual combination with the recipient state.'
      },
      {
        id: 'activation-patching-causal-experiments-controls',
        kind: 'matrix',
        title: 'Which alternative explanation survives?',
        description:
          'Controls distinguish a proposed information transfer from a broken hook or broad disruption.',
        columns: ['Control', 'What a failure suggests'],
        rows: [
          {
            label: 'Identity patch',
            cells: [
              'Replace a state with its own cached value',
              'Output drift points to intervention code or numerical differences'
            ]
          },
          {
            label: 'Unrelated donor',
            cells: [
              'Use a matched state unrelated to the recipient task',
              'A similar effect weakens the claim of task specificity'
            ]
          },
          {
            label: 'Reverse patch',
            cells: [
              'Put contrast information into the reference run',
              'Compare disruption with restoration before claiming necessity'
            ]
          }
        ],
        takeaway: 'A large patch effect needs a baseline that rules out simpler causes.'
      }
    ]
  },
  'activation-steering-control-and-limits': {
    visuals: [
      {
        id: 'activation-steering-control-and-limits-operators',
        kind: 'compare',
        title: 'Negative addition does not remove a component',
        description:
          'Toy activation h = [3, 4], unit direction v = [1, 0], and additive coefficient −1.',
        columns: [
          {
            label: 'Add −v',
            points: [
              'h − v = [2, 4]',
              'Subtracts a fixed amount of 1 along the direction',
              'The first coordinate remains nonzero'
            ]
          },
          {
            label: 'Project it out',
            points: [
              'dot[v, h] = 3; h − 3v = [0, 4]',
              'Subtracts the current component, here 3',
              'The first coordinate becomes zero'
            ]
          }
        ],
        takeaway:
          'Addition uses a chosen displacement. Projection removal depends on the activation being treated.',
        caveat:
          "Exact two-dimensional arithmetic. It does not predict a language model's behavioral response."
      },
      {
        id: 'activation-steering-control-and-limits-confounds',
        kind: 'sequence',
        title: 'Separate uncertainty from its wording',
        description:
          'A direction extracted from cautious answers can also capture response length or a repeated phrase.',
        steps: [
          {
            label: 'Build the contrast',
            detail: 'Pair an answer that admits missing evidence with one that asserts certainty.'
          },
          {
            label: 'Cross the nuisance variables',
            detail:
              'Include short and long answers in both groups. Express uncertainty with several different phrasings.'
          },
          {
            label: 'Hold out the format',
            detail:
              'Extract the vector on discovery templates, then test different topics and template families.'
          },
          {
            label: 'Score the decision',
            detail:
              'Check whether uncertainty tracks answerability. Count indiscriminate hedging separately.'
          }
        ],
        takeaway:
          'Changing the words that accompany a behavior helps test whether the direction controls the behavior itself.'
      }
    ]
  },
  'attention-memory-budget': {
    visuals: [
      {
        id: 'attention-memory-budget-solve-backwards',
        kind: 'sequence',
        title: 'Solve for a head budget',
        description:
          'Example with 8 GiB reserved for cache, 32 layers, head width 128, two-byte scalars, four sequences, and 8,192 tokens each.',
        steps: [
          {
            label: 'One KV head',
            detail:
              'Keys and values cost 2 × 32 × 128 × 2 = 16,384 bytes per token for one KV head.'
          },
          {
            label: 'Reserve the workload',
            detail: 'Four sequences × 8,192 tokens × 16,384 bytes = 0.5 GiB per KV head.'
          },
          {
            label: 'Divide the budget',
            detail:
              '8 GiB ÷ 0.5 GiB = 16 KV heads. With 32 query heads, each KV head serves two query heads.'
          },
          {
            label: 'Double concurrency',
            detail:
              'Eight sequences cost 1 GiB per KV head, so the same cache budget allows eight KV heads.'
          }
        ],
        takeaway: 'Concurrency and context consume the same head budget through their product.',
        caveat:
          'The 8 GiB is free cache space after other allocations. This assumes even placement and excludes replication, padding, and fragmentation.'
      },
      {
        id: 'attention-memory-budget-replication',
        kind: 'matrix',
        title: 'More ranks can replicate shared heads',
        description:
          'Example with eight KV heads. Assume ranks partition whole heads when possible and otherwise replicate them evenly.',
        columns: ['Heads per rank', 'Head copies across ranks'],
        rows: [
          { label: '4 ranks', cells: ['2', '8'] },
          { label: '8 ranks', cells: ['1', '8'] },
          { label: '16 ranks', cells: ['1', '16, each logical head appears twice'] }
        ],
        takeaway:
          'Under this placement rule, doubling ranks beyond the KV-head count doubles physical cache copies.',
        caveat: 'A placement example, not a requirement for every tensor-parallel runtime.'
      }
    ]
  },
  'cosmos-world-models-and-planning': {
    visuals: [
      {
        id: 'cosmos-world-models-and-planning-action-fork',
        kind: 'flow',
        title: 'Ask what changes when the action changes',
        description:
          'An action-conditioned prediction needs a controlled comparison from the same initial situation.',
        steps: [
          {
            label: 'Fix the start',
            detail:
              'Use the same measured state, observation history, and camera setup for both trials.'
          },
          {
            label: 'Change the action',
            detail: 'Run two specified actions. Keep their timing and units explicit.'
          },
          {
            label: 'Predict both outcomes',
            detail:
              'Ask the model for the consequences of each action, rather than an unconditioned plausible continuation.'
          },
          {
            label: 'Compare with the environment',
            detail:
              'Check whether predicted differences match measured differences under the two actions.'
          }
        ],
        takeaway:
          'A controlled action fork tests whether the prediction distinguishes interventions that matter for a decision.'
      },
      {
        id: 'cosmos-world-models-and-planning-separate-errors',
        kind: 'matrix',
        title: 'Four errors need four reference tests',
        description: 'A visually pleasing rollout can pass one test and fail another.',
        columns: ['Hold fixed', 'Compare'],
        rows: [
          {
            label: 'Observation reconstruction',
            cells: ['The observed scene', 'Reconstructed observations against the input']
          },
          {
            label: 'One-step prediction',
            cells: [
              'Measured start and one action',
              'Next prediction against the measured next state'
            ]
          },
          {
            label: 'Rollout prediction',
            cells: [
              'Start and complete action sequence',
              'Error at each horizon, including generated-state feedback'
            ]
          },
          {
            label: 'Closed-loop planning',
            cells: [
              'Task and total planning budget',
              'Actual environment outcome after executing the chosen action'
            ]
          }
        ],
        takeaway:
          'Separate representation error, dynamics error, and decision quality before attributing an improvement to the world model.'
      }
    ]
  },
  'diffusion-flow-matching': {
    visuals: [
      {
        id: 'diffusion-flow-matching-guidance-arithmetic',
        kind: 'bars',
        title: 'Guidance changes the field being integrated',
        description:
          'One-component toy with unconditional prediction 2 and conditional prediction 5. Guided prediction is 2 + w × [5 − 2].',
        unit: 'field-component units',
        rows: [
          { label: 'w = 0', value: 2, detail: '2 + 0 × 3 = 2' },
          { label: 'w = 1', value: 5, detail: '2 + 1 × 3 = 5' },
          { label: 'w = 3', value: 11, detail: '2 + 3 × 3 = 11' }
        ],
        takeaway:
          'Guidance above one extrapolates beyond the conditional prediction. It does not merely choose between two outputs.',
        caveat:
          'Chosen scalar predictions at one state and time. Their magnitude is not a quality score.'
      },
      {
        id: 'diffusion-flow-matching-codec-isolation',
        kind: 'sequence',
        title: 'Find a codec limit before blaming the denoiser',
        description:
          'A reconstruction experiment bypasses the generative path and tests the latent representation alone.',
        steps: [
          {
            label: 'Start with a real sample',
            detail: 'Choose an image containing the texture, lettering, or fine detail of interest.'
          },
          {
            label: 'Encode and decode',
            detail:
              "Apply the checkpoint's encoder, latent scaling, and decoder without adding noise or running a sampler."
          },
          {
            label: 'Inspect lost detail',
            detail:
              'Compare the reconstruction with the original. Record what disappears before any denoising takes place.'
          },
          {
            label: 'Test generation separately',
            detail:
              "Evaluate the learned field and sampler with the codec's reconstruction limit visible beside their results."
          }
        ],
        takeaway:
          'Loss already present in a plain reconstruction identifies a separate bottleneck from field prediction or solver error.'
      }
    ]
  },
  'distributed-llm-training': {
    visuals: [
      {
        id: 'distributed-llm-training-sharding-arithmetic',
        kind: 'bars',
        title: 'Count persistent state per rank',
        description:
          'Example with one billion parameters and four data-parallel ranks. Each parameter has two weight bytes, two gradient bytes, and eight optimizer-moment bytes.',
        unit: 'GB per rank, decimal',
        rows: [
          { label: 'Replicate all state', value: 12, detail: '2 + 2 + 8 = 12 GB' },
          { label: 'Shard optimizer only', value: 6, detail: '2 + 2 + 8 ÷ 4 = 6 GB' },
          { label: 'Shard all three', value: 3, detail: '[2 + 2 + 8] ÷ 4 = 3 GB' }
        ],
        takeaway: 'Sharding one state term leaves the other replicated terms untouched.',
        caveat:
          'Persistent-state accounting only. Master weights, activations, temporary gathers, communication buffers, and allocator overhead are excluded.'
      },
      {
        id: 'distributed-llm-training-checkpoint-reshard',
        kind: 'sequence',
        title: 'A checkpoint must survive a new process grid',
        description:
          'Changing topology requires matching logical tensors and their training state to new owners.',
        steps: [
          {
            label: 'Recover global identity',
            detail:
              'Use tensor names, global shapes, shard axes, and offsets to identify what the old files represent.'
          },
          {
            label: 'Slice the new shards',
            detail:
              'Partition each logical matrix along the axes required by the new tensor-parallel group.'
          },
          {
            label: 'Move layer ownership',
            detail:
              'Assign layers to the new pipeline stages and preserve expert identifiers where applicable.'
          },
          {
            label: 'Move related state',
            detail:
              'Transform optimizer tensors with their parameters. Restore random state and the data position.'
          },
          {
            label: 'Replay a fixed batch',
            detail: 'Compare loss before and after restoration under a stated numerical tolerance.'
          }
        ],
        takeaway:
          'A parameter shard and its optimizer state describe the same logical coordinates and must move together.'
      }
    ]
  },
  'evo2-genome-models-and-nvidia': {
    visuals: [
      {
        id: 'evo2-genome-models-and-nvidia-split-before-windows',
        kind: 'sequence',
        title: 'Split relatives before constructing windows',
        description:
          'Overlapping or related sequence windows can share information even when their final strings differ.',
        steps: [
          {
            label: 'Choose the generalization question',
            detail:
              'Decide whether evaluation should hold out genomic regions, gene families, species, or experimental batches.'
          },
          {
            label: 'Assign source groups',
            detail:
              'Keep related examples together when assigning training, development, and test groups.'
          },
          {
            label: 'Construct windows inside groups',
            detail:
              'Create scoring windows without allowing descendants of the same held-out source group into training.'
          },
          {
            label: 'Freeze the scoring rule',
            detail:
              'Fix context length, strand treatment, and scored positions before inspecting final test labels.'
          }
        ],
        takeaway:
          'A new window is not independent evidence when it shares the biological context the split was meant to hold out.'
      },
      {
        id: 'evo2-genome-models-and-nvidia-evidence-boundaries',
        kind: 'matrix',
        title: 'A sequence score and an assay answer different questions',
        description: 'Keep model measurements separate from measurements of biological effects.',
        columns: ['What is measured', 'What remains open'],
        rows: [
          {
            label: 'Likelihood difference',
            cells: [
              'Relative sequence fit under a fixed model and scoring window',
              'Whether the change affects the biological outcome of interest'
            ]
          },
          {
            label: 'Assay association',
            cells: [
              'How scores relate to a defined experimental readout',
              'Whether the relation transfers to another assay or context'
            ]
          },
          {
            label: 'Functional intervention',
            cells: [
              'The measured effect of a specified biological change',
              'Which model representation accounts for that effect'
            ]
          }
        ],
        takeaway:
          'Attach each result to its measured quantity. Better sequence prediction alone cannot supply missing biological evidence.'
      }
    ]
  },
  'frontier-mechanistic-interpretability': {
    visuals: [
      {
        id: 'frontier-mechanistic-interpretability-routing-content',
        kind: 'sequence',
        title: 'An attention edge needs a read and a write',
        description: 'A head attending to a name does not yet explain what it does with that name.',
        steps: [
          {
            label: 'Destination asks',
            detail: 'Identify the destination feature that contributes to the query.'
          },
          {
            label: 'Source matches',
            detail:
              'Identify the source feature that contributes to the key and explains why this position receives attention.'
          },
          {
            label: 'Value writes',
            detail:
              'Trace the information carried by the value and output projections. Test copying, suppression, or another proposed operation.'
          },
          {
            label: 'Later computation reads',
            detail:
              'Locate downstream consumers and test whether changing the written information changes the predicted output.'
          }
        ],
        takeaway:
          'Routing explains where information travels. The value path and downstream use explain what the head contributes.'
      },
      {
        id: 'frontier-mechanistic-interpretability-shared-blind-spots',
        kind: 'compare',
        title: 'Two agreeing tools can share one mistake',
        description: 'Agreement adds more evidence when the checks can fail for different reasons.',
        columns: [
          {
            label: 'Shared evidence',
            points: [
              'Two probes learn the same activation labels',
              'The same judge scores both explanations',
              "Agreement may reproduce the labels or judge's blind spot"
            ]
          },
          {
            label: 'Independent checks',
            points: [
              'New prompt contrasts separate competing explanations',
              'An intervention predicts a held-out behavioral change',
              'Training-data or model-diff evidence tests another route to the claim'
            ]
          }
        ],
        takeaway: 'Count the independence of the checks as well as the number of tools that agree.'
      }
    ]
  },
  'goodfire-already-clean-hypothesis': {
    visuals: [
      {
        id: 'goodfire-already-clean-hypothesis-contrast-design',
        kind: 'sequence',
        title: 'Make a neuron label risk a wrong prediction',
        description:
          'Suppose a unit is labeled as tracking a mentioned place. Treat that label as a hypothesis, with no results assumed.',
        steps: [
          {
            label: 'Keep the relation',
            detail:
              'Describe the same place in new wording. Predict whether the unit should still respond.'
          },
          {
            label: 'Keep the word',
            detail:
              'Reuse the apparent trigger word in a context without the proposed place relation. Predict a different response.'
          },
          {
            label: 'Inspect the quiet cases',
            detail:
              "Look for independently labeled place examples with low activation, rather than sampling only the unit's favorites."
          },
          {
            label: 'Test the downstream role',
            detail:
              'Intervene on the unit and check the predicted place-related output alongside unrelated outputs.'
          }
        ],
        takeaway:
          'A useful label predicts both responses and counterexamples beyond the dashboard used to write it.'
      },
      {
        id: 'goodfire-already-clean-hypothesis-representation-cost',
        kind: 'compare',
        title: 'Compare explanations under the same budget',
        description:
          'Give native-unit and learned-dictionary analyses the same behavior, prompts, held-out cases, and intervention budget.',
        columns: [
          {
            label: 'Native unit',
            points: [
              'Tests a coordinate the model already computes',
              'A role can depend on context and neighboring units',
              'Measure coverage and selective effects beyond readable examples'
            ]
          },
          {
            label: 'Learned feature',
            points: [
              'Tests a direction supplied by another learned representation',
              'Reconstruction error can omit relevant computation',
              'Measure the added explanatory value against its approximation cost'
            ]
          }
        ],
        takeaway:
          'The comparison is how well each account predicts the model under equal investigative constraints.'
      }
    ]
  },
  'gr00t-isaac-lab-sim-to-real': {
    visuals: [
      {
        id: 'gr00t-isaac-lab-sim-to-real-action-scale',
        kind: 'sequence',
        title: 'The same normalized action can move ten times less',
        description:
          'Toy relative-joint decoder uses displacement = mean + scale × z. Let z = 0.5 and mean = 0.',
        steps: [
          {
            label: 'Decode with training statistics',
            detail: 'A scale of 0.2 radians gives a relative displacement of 0.1 radians.'
          },
          {
            label: 'Substitute another scale',
            detail: 'A scale of 0.02 radians gives 0.01 radians from the exact same model output.'
          },
          {
            label: 'Check the command convention',
            detail:
              'Confirm the joint identifier, positive direction, units, and relative-action interpretation before executing the displacement.'
          },
          {
            label: 'Preserve the decoder',
            detail:
              'Store action statistics and the control convention with the checkpoint so evaluation reproduces the trained mapping.'
          }
        ],
        takeaway:
          'Weights can stay identical while a changed action decoder changes the effective controller.',
        caveat:
          "Authored scalar example. It does not specify GR00T's action normalization or predict robot performance."
      },
      {
        id: 'gr00t-isaac-lab-sim-to-real-holdout-tests',
        kind: 'matrix',
        title: 'Different holdouts expose different transfer failures',
        description: 'Separate tests that a successful uninterrupted demonstration combines.',
        columns: ['Change at evaluation', 'Question tested'],
        rows: [
          {
            label: 'Object holdout',
            cells: [
              'New object instances',
              'Does the policy transfer beyond the demonstrated objects?'
            ]
          },
          {
            label: 'Pose holdout',
            cells: [
              'New initial arrangements',
              'Does the policy handle new geometry with familiar objects?'
            ]
          },
          {
            label: 'Disturbed start',
            cells: [
              'A disrupted or partial task state',
              'Can the policy recover instead of replaying nominal motion?'
            ]
          },
          {
            label: 'Target embodiment',
            cells: [
              'The real robot under documented conditions',
              'Does simulation evidence transfer to the actual control loop?'
            ]
          }
        ],
        takeaway:
          'Report these outcomes separately so a nominal success rate cannot hide the missing transfer test.'
      }
    ]
  },
  'hybrid-ssm-attention': {
    visuals: [
      {
        id: 'hybrid-ssm-attention-summary-collision',
        kind: 'matrix',
        title: 'A summary can lose the answer to a later query',
        description:
          'Toy memory stores only the sum of two values. The query arrives after the history has been compressed.',
        columns: ['Stored sum', 'Answer to "value at A?"'],
        rows: [
          { label: 'A = 2, B = 3', cells: ['5', '2'] },
          { label: 'A = 3, B = 2', cells: ['5', '3'] }
        ],
        takeaway:
          'Two histories can share a summary and require different answers. Keeping information depends on the future task.',
        caveat:
          "This sum is an authored lossy memory, not an SSM implementation or a bound on a model's recall."
      },
      {
        id: 'hybrid-ssm-attention-state-rollback',
        kind: 'sequence',
        title: 'Rejecting a draft also rejects its recurrent state',
        description:
          'Unlike an appended cache entry, a recurrent update overwrites the previous state.',
        steps: [
          {
            label: 'Save accepted state',
            detail: 'Keep the state h0 at the end of the committed prefix.'
          },
          {
            label: 'Draft forward',
            detail:
              'Token a produces h1. Token b then produces h2. Retain a snapshot or enough information to replay.'
          },
          {
            label: 'Reject b',
            detail:
              'If verification accepts a but rejects b, h2 includes an unaccepted token and cannot become the committed state.'
          },
          {
            label: 'Resume from h1',
            detail:
              "Restore the snapshot after a, or recompute it from h0, then process the target's correction."
          }
        ],
        takeaway:
          'Speculation must roll back both the token suffix and every recurrent state that consumed it.'
      }
    ]
  },
  'j-space-global-workspace': {
    visuals: [
      {
        id: 'j-space-global-workspace-relation-gap',
        kind: 'compare',
        title: 'The same concept list can hide reversed roles',
        description:
          'A schematic concept readout reports "dog, cat, bites" for two different sentences.',
        columns: [
          {
            label: 'Dog bites cat',
            points: [
              'Agent is the dog',
              'Recipient is the cat',
              'Concept list contains dog, cat, bites'
            ]
          },
          {
            label: 'Cat bites dog',
            points: [
              'Agent is the cat',
              'Recipient is the dog',
              'Concept list contains dog, cat, bites'
            ]
          }
        ],
        takeaway: 'Recovering the nouns and action does not recover which noun fills which role.',
        caveat:
          'A constructed example of a bag-of-concepts limitation, not a measured J-lens output.'
      },
      {
        id: 'j-space-global-workspace-reflection-training',
        kind: 'sequence',
        title: 'Train a reflection, then test without requesting it',
        description:
          'Counterfactual reflection separates the text receiving supervision from the behavior tested later.',
        steps: [
          {
            label: 'Pause a task trajectory',
            detail: 'Use a partial task as context for a request to reflect.'
          },
          {
            label: 'Append a target reflection',
            detail: 'Supply a reflection that applies the chosen principles to that context.'
          },
          {
            label: 'Mask the original task loss',
            detail:
              'Compute the training loss on the reflection rather than on the original task behavior.'
          },
          {
            label: 'Run the uninterrupted task',
            detail:
              'At evaluation, omit the reflection request and inspect both behavior and candidate workspace contents.'
          },
          {
            label: 'Test mediation',
            detail:
              'Ablate the candidate concepts and test whether the behavioral change depends on them.'
          }
        ],
        takeaway:
          'A change in unprompted behavior is a separate result from learning to produce a good reflection.',
        caveat:
          "This describes the article's experimental logic; it does not guarantee transfer to another checkpoint or task."
      }
    ]
  },
  'kyutai-streaming-speech-and-musical-time': {
    visuals: [
      {
        id: 'kyutai-streaming-speech-and-musical-time-cancellation',
        kind: 'sequence',
        title: 'Cancellation must reach the playback queue',
        description:
          'Stopping generation and stopping audible speech are different events in a streaming system.',
        steps: [
          {
            label: 'User starts speaking',
            detail:
              'Capture the new input with its timestamp while assistant audio may still be playing.'
          },
          {
            label: 'Detect the interruption',
            detail:
              'Decide whether to interrupt using only audio available at that time. Record the decision time.'
          },
          {
            label: 'Cancel generation',
            detail:
              'Stop outstanding model work and reject later chunks belonging to that canceled response.'
          },
          {
            label: 'Remove queued audio',
            detail:
              'Flush or replace unplayed samples according to the playback policy. Measure when the old speech actually stops.'
          }
        ],
        takeaway:
          'A canceled model request can leave audible output behind. Measure cancellation through the player.'
      },
      {
        id: 'kyutai-streaming-speech-and-musical-time-event-errors',
        kind: 'matrix',
        title: 'A correct pitch can still be the wrong event',
        description: 'Evaluate music transcription along separate event attributes.',
        columns: ['Example error', 'Required comparison'],
        rows: [
          {
            label: 'Pitch',
            cells: ['The note has the wrong pitch', 'Matched note pitch against its annotation']
          },
          {
            label: 'Onset',
            cells: ['The right note starts late', 'Start-time error under a declared tolerance']
          },
          { label: 'Offset', cells: ['The note lasts too long', 'End-time or duration error'] },
          {
            label: 'Instrument',
            cells: [
              'The event belongs to the wrong part',
              'Instrument assignment, including simultaneous notes'
            ]
          }
        ],
        takeaway:
          'State the event-matching rule before aggregating accuracy. Pitch-only scoring cannot measure timing or instrument errors.'
      }
    ]
  },
  'llm-evaluation': {
    visuals: [
      {
        id: 'llm-evaluation-timeout-denominator',
        kind: 'bars',
        title: 'Dropping timeouts changes the question',
        description:
          'Toy run with 100 eligible cases, 80 completed outputs, 72 correct outputs, and 20 timeouts.',
        unit: '% correct under the stated denominator',
        rows: [
          { label: 'Completed outputs only', value: 90, detail: '72 ÷ 80 × 100 = 90%' },
          { label: 'All eligible cases', value: 72, detail: '72 ÷ 100 × 100 = 72%' }
        ],
        takeaway:
          'The first score measures correctness after completion. The second also counts failure to deliver an answer.',
        caveat:
          'Invented counts. Neither denominator is universal; it must match the release decision and be reported explicitly.'
      },
      {
        id: 'llm-evaluation-failure-location',
        kind: 'matrix',
        title: 'Trace a wrong score to the failing layer',
        description:
          'Preserved inputs, retrieved evidence, outputs, and scoring decisions let an investigation distinguish these cases.',
        columns: ['Observed condition', 'Candidate cause'],
        rows: [
          {
            label: 'Missing evidence',
            cells: [
              'The needed passage never reaches the prompt',
              'Retrieval or prompt construction'
            ]
          },
          {
            label: 'Unused evidence',
            cells: [
              'The passage is present but the answer contradicts it',
              'Generation or instruction following'
            ]
          },
          {
            label: 'Wrong tool arguments',
            cells: [
              'The chosen tool is appropriate but its arguments are invalid',
              'Planning or schema handling'
            ]
          },
          {
            label: 'Wrong judgment',
            cells: [
              'The answer satisfies the contract but receives a failing score',
              'Scorer or rubric'
            ]
          }
        ],
        takeaway:
          'A model score alone cannot distinguish a retrieval failure from a scoring failure.'
      }
    ]
  },
  'llm-finetuning-guide': {
    visuals: [
      {
        id: 'llm-finetuning-guide-rank-parameters',
        kind: 'bars',
        title: 'What doubling LoRA rank actually doubles',
        description:
          'One 4,096 × 4,096 matrix stays frozen. Its two adapter factors contain r × [4,096 + 4,096] trainable parameters.',
        unit: 'trainable adapter parameters',
        rows: [
          { label: 'Rank 8', value: 65536, detail: '8 × 8,192 = 65,536' },
          { label: 'Rank 16', value: 131072, detail: '16 × 8,192 = 131,072' },
          { label: 'Rank 32', value: 262144, detail: '32 × 8,192 = 262,144' }
        ],
        takeaway:
          'Rank scales the adapter budget linearly. The original 16,777,216 parameters still exist.',
        caveat:
          'Counts one adapted matrix, excluding biases. This is not peak training memory or a prediction of task quality.'
      },
      {
        id: 'llm-finetuning-guide-effective-batch',
        kind: 'sequence',
        title: 'Build an effective batch from smaller passes',
        description:
          'Example with four data-parallel workers, two examples per worker per microbatch, and eight accumulation passes.',
        steps: [
          {
            label: 'One pass on one worker',
            detail:
              'Process two examples and accumulate their gradients without updating parameters yet.'
          },
          {
            label: 'Repeat eight times',
            detail: 'Each worker contributes 2 × 8 = 16 examples to the update.'
          },
          {
            label: 'Combine four workers',
            detail:
              'The optimizer update uses 4 × 16 = 64 examples with the intended gradient normalization.'
          },
          {
            label: 'Account for what stays resident',
            detail:
              'Smaller passes reduce activation residency. Parameters and optimizer state still need memory throughout the accumulation.'
          }
        ],
        takeaway:
          'Microbatch size controls one pass. Worker count and accumulation determine how many examples contribute to an update.',
        caveat:
          'Assumes complete equal microbatches. Token counts vary with sequence lengths, packing, and loss masks.'
      }
    ]
  },
  'llm-training-optimizers': {
    visuals: [
      {
        id: 'llm-training-optimizers-global-clipping',
        kind: 'matrix',
        title: 'Local clipping can violate a global threshold',
        description: 'Toy gradient has scalar shards 3 and 4. The intended global norm limit is 4.',
        columns: ['Shard A', 'Shard B', 'Combined norm'],
        rows: [
          { label: 'Unclipped', cells: ['3', '4', 'sqrt[9 + 16] = 5'] },
          { label: 'Clip each shard to 4', cells: ['3', '4', '5, still above the limit'] },
          {
            label: 'Clip global norm to 4',
            cells: ['3 × 4/5 = 2.4', '4 × 4/5 = 3.2', 'sqrt[5.76 + 10.24] = 4']
          }
        ],
        takeaway: 'A global limit needs the norm across all shards and one shared scaling factor.',
        caveat: 'Exact scalar example for gradient clipping, before any optimizer preconditioning.'
      },
      {
        id: 'llm-training-optimizers-resume-branch',
        kind: 'sequence',
        title: 'A resumed run needs the same next update',
        description:
          'A branch-and-replay experiment can expose missing optimizer state even when the weight file loads.',
        steps: [
          {
            label: 'Save at an update boundary',
            detail:
              'Capture weights, optimizer statistics, step counters, scheduler, random state, and data position.'
          },
          {
            label: 'Continue the original run',
            detail:
              'Record the next fixed batch sequence, losses, parameter values, and optimizer state.'
          },
          {
            label: 'Restore in a fresh process',
            detail:
              'Load every saved state, including periodic preconditioner cadence and parameter-group mappings.'
          },
          {
            label: 'Replay the same batches',
            detail:
              'Compare the first update and later steps under a stated tolerance. Matching initial weights alone is insufficient.'
          }
        ],
        takeaway:
          'Optimizer history participates in the next update. Restoring weights alone does not restore the training trajectory.'
      }
    ]
  },
  'long-context-models': {
    visuals: [
      {
        id: 'long-context-models-ring-key-blocks',
        kind: 'sequence',
        title: 'Local queries still need every key block',
        description:
          'Schematic three-worker ring. Each worker keeps its own queries while key-value blocks circulate.',
        steps: [
          {
            label: 'Process the local block',
            detail:
              'Worker A scores its local queries against its initial key-value block and initializes softmax accumulators.'
          },
          {
            label: 'Receive the next block',
            detail:
              'A key-value block from another worker arrives. Worker A updates maxima, normalization sums, and output accumulators.'
          },
          {
            label: 'Complete the circuit',
            detail:
              'Repeat for the remaining block so the local queries have accounted for keys from all three workers.'
          },
          {
            label: 'Finish the local output',
            detail:
              'Normalize the accumulated result without assembling the full attention-score matrix on worker A.'
          }
        ],
        takeaway:
          'Context parallelism distributes dense attention state. It still computes contributions from all key blocks.',
        caveat:
          'Conceptual schedule. Actual implementations choose block sizes, overlap, and numerical accumulation details.'
      },
      {
        id: 'long-context-models-evidence-survival',
        kind: 'matrix',
        title: 'Where did the required span disappear?',
        description:
          'A failed long-context answer needs evidence about each boundary the relevant span crosses.',
        columns: ['Evidence to preserve', 'Failure it distinguishes'],
        rows: [
          {
            label: 'Retrieval',
            cells: ['Selected chunk identifiers', 'The needed source was never selected']
          },
          {
            label: 'Tokenization',
            cells: ['Token offsets and accepted length', 'The span was truncated before execution']
          },
          {
            label: 'Attention access',
            cells: [
              'Dense reference or selected sparse blocks',
              'An attention restriction removed a needed connection'
            ]
          },
          {
            label: 'Answer generation',
            cells: [
              'The exact prompt and output',
              'The model failed to use evidence that remained available'
            ]
          }
        ],
        takeaway: 'An advertised window size does not identify which boundary lost the evidence.'
      }
    ]
  },
  'mixture-of-experts': {
    visuals: [
      {
        id: 'mixture-of-experts-capacity-skew',
        kind: 'bars',
        title: 'Average load can hide a full expert',
        description:
          'Toy top-1 router sends eight tokens to four experts. Each expert can accept two tokens; overflow is dropped in this example.',
        unit: 'assigned tokens before the capacity limit',
        rows: [
          { label: 'Expert A', value: 6, detail: '2 accepted, 4 overflow' },
          { label: 'Expert B', value: 2, detail: '2 accepted, no overflow' },
          { label: 'Expert C', value: 0, detail: '2 empty capacity slots' },
          { label: 'Expert D', value: 0, detail: '2 empty capacity slots' }
        ],
        takeaway:
          'Average assignment is two, yet four tokens overflow while four capacity slots sit unused.',
        caveat:
          'Invented routing counts and a fixed drop policy. Other runtimes can use different capacity and overflow rules.'
      },
      {
        id: 'mixture-of-experts-fine-grained-combinations',
        kind: 'matrix',
        title: 'Smaller experts change the combination space',
        description:
          'Toy FFN experts have equal input and output widths. Splitting hidden width in half doubles the expert count and active count.',
        columns: ['Hidden width per expert', 'Active hidden width', 'Possible expert sets'],
        rows: [
          { label: '4 experts, choose 1', cells: ['h', '1 × h = h', '4'] },
          { label: '8 experts, choose 2', cells: ['h/2', '2 × h/2 = h', '8 × 7 ÷ 2 = 28'] }
        ],
        takeaway:
          'Equal active FFN width can offer more possible expert combinations without increasing this simplified arithmetic budget.',
        caveat:
          'Ignores router, bias, dispatch, and kernel overhead. Possible combinations do not imply useful specialization or better quality.'
      }
    ]
  },
  'model-alignment-control-loop': {
    visuals: [
      {
        id: 'model-alignment-control-loop-credit-assignment',
        kind: 'compare',
        title: 'A correct ending can reward a bad transition',
        description:
          'Hypothetical solution contains an invalid intermediate step but reaches the expected final answer.',
        columns: [
          {
            label: 'Outcome-only signal',
            points: [
              'Checks the final answer',
              'Marks this trajectory successful',
              'Can reinforce a path whose intermediate step was invalid'
            ]
          },
          {
            label: 'Process signal',
            points: [
              'Checks specified intermediate transitions',
              'Can mark the first invalid step',
              'Adds evidence about the path, with a separate step-evaluation cost'
            ]
          }
        ],
        takeaway:
          'Credit assignment determines which parts of a successful-looking trajectory training can distinguish.',
        caveat:
          'The example assumes a reliable step checker. Process labels and visible reasoning can themselves be incomplete or wrong.'
      },
      {
        id: 'model-alignment-control-loop-known-objective-audit',
        kind: 'sequence',
        title: 'Use a known hidden objective to test an audit',
        description:
          'A model-organism study gives the experimenter information that the auditors must recover.',
        steps: [
          {
            label: 'Construct the organism',
            detail:
              'Create and document a model with a specified hidden objective or failure propensity.'
          },
          {
            label: 'Blind the investigation',
            detail:
              'Give auditors the allowed behavioral and internal access while keeping the known objective separate.'
          },
          {
            label: 'Require a prediction',
            detail:
              'Ask the audit to identify a cause and predict failures on new prompts that do not announce the evaluation.'
          },
          {
            label: 'Check the proposed cause',
            detail:
              "Test interventions and unrelated capabilities, then compare the audit with the experimenter's known objective."
          }
        ],
        takeaway:
          'Known hidden objectives make the audit procedure measurable, including the mechanisms it fails to find.',
        caveat:
          'Success on constructed organisms does not certify coverage of every deployment failure.'
      }
    ]
  },
  'model-compression-techniques': {
    visuals: [
      {
        id: 'model-compression-techniques-rank-break-even',
        kind: 'bars',
        title: 'Factorization has a parameter break-even point',
        description:
          'A dense 1,024 × 1,024 matrix has 1,048,576 parameters. Two rank-r factors have r × [1,024 + 1,024] parameters.',
        unit: 'factor parameters',
        rows: [
          { label: 'Rank 128', value: 262144, detail: '128 × 2,048, one quarter of dense' },
          { label: 'Rank 256', value: 524288, detail: '256 × 2,048, one half of dense' },
          { label: 'Rank 512', value: 1048576, detail: '512 × 2,048, equal to dense' }
        ],
        takeaway: 'For this square matrix, rank must be below 512 to reduce parameter count.',
        caveat:
          'Parameter arithmetic only. Approximation quality, extra launches, and intermediate tensors determine whether deployment benefits.'
      },
      {
        id: 'model-compression-techniques-zero-execution',
        kind: 'compare',
        title: 'Zeros only save work when execution uses them',
        description:
          'Consider the same pruned matrix exported through two different runtime paths.',
        columns: [
          {
            label: 'Dense export',
            points: [
              'Stores every position, including zeros',
              'Runs a dense matrix multiplication',
              'The zero mask alone supplies no skipped-work guarantee'
            ]
          },
          {
            label: 'Supported sparse export',
            points: [
              'Stores nonzero values and required metadata',
              'Dispatches a kernel for that sparsity pattern',
              'Must repay indexing and irregular-access costs on the actual shapes'
            ]
          }
        ],
        takeaway:
          'Inspect the exported representation and dispatched kernel before interpreting sparsity as a speed gain.'
      }
    ]
  },
  'model-editing-locality-and-ripple-effects': {
    visuals: [
      {
        id: 'model-editing-locality-and-ripple-effects-scope',
        kind: 'matrix',
        title: 'Define the intended ripple before editing',
        description:
          "Use the article's fictional headquarters move from Pune to Kochi. These are desired outcomes, not model results.",
        columns: ['Desired answer', 'Scope being tested'],
        rows: [
          {
            label: 'Current headquarters',
            cells: ['Kochi, including paraphrases', 'Direct update and generalization']
          },
          {
            label: 'Current headquarters state',
            cells: ['Kerala', 'Propagation through the city-to-state relation']
          },
          {
            label: 'Headquarters before the move',
            cells: ['Pune', 'Preservation of time-scoped history']
          },
          {
            label: 'Another organization',
            cells: ['Its original headquarters', 'Locality outside the intended update']
          }
        ],
        takeaway:
          'Consistency requires some related answers to change. Locality requires a defined boundary around those changes.'
      },
      {
        id: 'model-editing-locality-and-ripple-effects-edit-age',
        kind: 'sequence',
        title: 'Recheck old edits after each new update',
        description: 'Sequential editing changes the weights that the next editor receives.',
        steps: [
          {
            label: 'Record the first edit',
            detail:
              'Save its update, target queries, intended consequences, and unrelated controls.'
          },
          {
            label: 'Apply the next edit',
            detail: 'Evaluate the new target against the already edited checkpoint.'
          },
          {
            label: 'Revisit older targets',
            detail:
              'Retest earlier edits by age, including their paraphrases and intended consequences.'
          },
          {
            label: 'Locate the first regression',
            detail:
              'Check unrelated tasks and preserved intermediate checkpoints to identify when interference began.'
          }
        ],
        takeaway:
          'A new edit succeeding says nothing about whether earlier edits survived. Track both outcomes through time.'
      }
    ]
  },
  'multi-token-prediction': {
    visuals: [
      {
        id: 'multi-token-prediction-packed-boundaries',
        kind: 'matrix',
        title: 'Each future offset needs its own boundary mask',
        description:
          'Toy packed sequence is [A, B] followed by a separate document [C, D]. Cross-document targets do not contribute to the loss.',
        columns: ['Offset +1 target', 'Offset +2 target'],
        rows: [
          { label: 'Prefix ends at A', cells: ['B, valid', 'C, mask across boundary'] },
          {
            label: 'Prefix ends at B',
            cells: ['C, mask across boundary', 'D, mask across boundary']
          },
          { label: 'Prefix ends at C', cells: ['D, valid', 'No future token, mask'] },
          { label: 'Prefix ends at D', cells: ['No future token, mask', 'No future token, mask'] }
        ],
        takeaway: 'A valid next-token target does not imply that a farther-offset target is valid.'
      },
      {
        id: 'multi-token-prediction-reject-suffix',
        kind: 'sequence',
        title: 'One rejection invalidates the proposed suffix',
        description: 'A verifier evaluates the proposed chain [a, b, c] under its causal prefixes.',
        steps: [
          {
            label: 'Draft a chain',
            detail: 'Auxiliary heads propose a, b, and c after the committed prefix.'
          },
          {
            label: 'Verify in context',
            detail:
              'The target checks a after the prefix, b after prefix plus a, and c after prefix plus a and b.'
          },
          {
            label: 'Reject the middle token',
            detail:
              'Suppose a is accepted and b is rejected. The verification for c used the rejected prefix ending in b.'
          },
          {
            label: 'Commit and restart',
            detail:
              "Keep a and the target correction. Release the unaccepted suffix's provisional cache and draft from the corrected prefix."
          }
        ],
        takeaway:
          'A later candidate cannot be accepted using a verification result conditioned on a rejected earlier candidate.',
        caveat:
          'Shows chain dependencies. Exact stochastic sampling also needs the proposal probabilities and the appropriate acceptance correction.'
      }
    ]
  },
  'nemotron-nemo-rl-verifiable-training': {
    visuals: [
      {
        id: 'nemotron-nemo-rl-verifiable-training-checker-scope',
        kind: 'matrix',
        title: 'A passing reward check has a defined scope',
        description:
          'Hypothetical cases distinguish outcome checks from broader claims about a solution.',
        columns: ['What can pass', 'Additional evidence needed'],
        rows: [
          {
            label: 'Final-answer equality',
            cells: [
              'The expected value after an invalid derivation',
              'Proof or process checks for intermediate steps'
            ]
          },
          {
            label: 'Public code tests',
            cells: [
              'A program that fails an untested input',
              'Independent tests outside the optimized suite'
            ]
          },
          {
            label: 'Answer parser',
            cells: [
              'A syntactically accepted answer with unsupported content',
              "A check of the task's semantic criterion"
            ]
          },
          {
            label: 'Strict format rule',
            cells: [
              'A rejection of a correct answer in another format',
              'Audit rejected outputs for false negatives'
            ]
          }
        ],
        takeaway:
          'Name what the verifier checks, then audit both its accepted and rejected populations.'
      },
      {
        id: 'nemotron-nemo-rl-verifiable-training-domain-regression',
        kind: 'sequence',
        title: 'Find what one training stage costs another domain',
        description:
          'A staged recipe needs checkpoints and per-domain measurements to locate regressions.',
        steps: [
          {
            label: 'Measure before the stage',
            detail: 'Evaluate a frozen checkpoint on the same held-out domain suites.'
          },
          {
            label: 'Apply the domain stage',
            detail:
              'Record the data mixture, reward version, generated tokens, and optimization budget.'
          },
          {
            label: 'Retest every domain',
            detail: 'Keep gains in the trained domain separate from regressions in the others.'
          },
          {
            label: 'Test a recovery stage',
            detail:
              'Use the documented distillation or recovery procedure, then rerun all suites under the same inference budget.'
          }
        ],
        takeaway:
          'Intermediate checkpoints let a replication attribute a gain or regression to a specific stage.',
        caveat:
          'Experimental design based on the article, not a claim that recovery succeeds on every domain.'
      }
    ]
  },
  'physical-intelligence-pi07-memory-control': {
    visuals: [
      {
        id: 'physical-intelligence-pi07-memory-control-memory-controls',
        kind: 'matrix',
        title: 'Useful history should change only the right decisions',
        description:
          'Proposed paired-episode controls hold the current view or the correct action fixed.',
        columns: ['Pair construction', 'Expected test'],
        rows: [
          {
            label: 'Relevant history differs',
            cells: [
              'Same current view, different earlier container receives the object',
              'Different retrieval actions should follow the remembered event'
            ]
          },
          {
            label: 'Irrelevant history differs',
            cells: [
              'Different earlier distractions, same object location and current view',
              'The correct retrieval action should stay the same'
            ]
          },
          {
            label: 'Relevant history removed',
            cells: [
              'Hide the event while preserving the final ambiguous view',
              'Measure whether success depended on access to that event'
            ]
          }
        ],
        takeaway:
          'Memory earns credit by resolving a delayed dependency without making irrelevant history control the action.',
        caveat: 'These are experimental controls, not reported π0.7 or MEM results.'
      },
      {
        id: 'physical-intelligence-pi07-memory-control-conditioning',
        kind: 'sequence',
        title: 'Dropping a condition changes the learning problem',
        description:
          'A toy dataset contains careful placements and fast transfers in similar visible scenes.',
        steps: [
          {
            label: 'Keep both valid behaviors',
            detail:
              'Preserve the demonstrated actions and the quality or speed labels that identify which behavior each episode represents.'
          },
          {
            label: 'Remove the label in a control run',
            detail:
              'The learner now receives similar observations paired with different actions but lacks that explanation for the variation.'
          },
          {
            label: 'Match evaluation conditions',
            detail:
              'State which conditions the policy receives and how any visual subgoal or other supplied context is obtained.'
          },
          {
            label: 'Compare the resulting actions',
            detail:
              'Evaluate whether the policy selects the requested behavior, keeping the execution cadence and task definition fixed.'
          }
        ],
        takeaway:
          'Conditioning fields carry information about the intended action. Removing them is a change to supervision.',
        caveat:
          'Illustrates conditional ambiguity without assuming a particular loss, averaging behavior, or measured policy outcome.'
      }
    ]
  },
  'quantization-aware-architecture': {
    visuals: [
      {
        id: 'quantization-aware-architecture-scale-overhead',
        kind: 'bars',
        title: 'Smaller groups spend more bits on metadata',
        description:
          'Example with four-bit codes and one 16-bit scale plus one 16-bit zero point per group. Effective bits are 4 + 32/g.',
        unit: 'effective bits per weight',
        rows: [
          { label: 'Group of 32', value: 5, detail: '4 + 32 ÷ 32 = 5' },
          { label: 'Group of 64', value: 4.5, detail: '4 + 32 ÷ 64 = 4.5' },
          { label: 'Group of 128', value: 4.25, detail: '4 + 32 ÷ 128 = 4.25' },
          { label: 'Group of 256', value: 4.125, detail: '4 + 32 ÷ 256 = 4.125' }
        ],
        takeaway:
          "Finer scaling limits which values share an outlier's range, but its metadata raises the effective bit count.",
        caveat:
          'This explicit metadata layout is an example. Symmetric formats, different scale widths, packing, and padding change the cost.'
      },
      {
        id: 'quantization-aware-architecture-rescaling-identity',
        kind: 'sequence',
        title: 'Move magnitude across a multiplication',
        description: 'Scalar illustration of Y = [X/S] × [S W]. Choose X = 12, W = 0.5, and S = 4.',
        steps: [
          { label: 'Original product', detail: '12 × 0.5 = 6.' },
          { label: 'Shrink the activation', detail: 'X/S = 12 ÷ 4 = 3.' },
          { label: 'Grow the weight', detail: 'S W = 4 × 0.5 = 2.' },
          {
            label: 'Check the preserved product',
            detail: "3 × 2 = 6. The activation's magnitude fell while the weight's magnitude rose."
          }
        ],
        takeaway:
          'Rescaling can transfer numeric range between activations and weights before rounding.',
        caveat:
          'The identity is exact before quantization. Quantization error and the usefulness of the chosen scale need separate evaluation.'
      }
    ]
  },
  'reasoning-traces-faithfulness': {
    visuals: [
      {
        id: 'reasoning-traces-faithfulness-intervention-types',
        kind: 'matrix',
        title: 'Trace edits test different dependencies',
        description: 'Keep the task fixed while changing one property of the intermediate text.',
        columns: ['What changes', 'What to inspect next'],
        rows: [
          {
            label: 'Paraphrase',
            cells: [
              'Wording, with intended meaning preserved',
              'Whether the answer depends on the phrasing'
            ]
          },
          {
            label: 'Replace an intermediate',
            cells: [
              'A numerical result becomes a plausible alternative',
              'Whether later steps propagate, repair, or ignore it'
            ]
          },
          {
            label: 'Truncate',
            cells: [
              'A continuation is removed',
              'Whether the remaining trace is enough, or the model recomputes'
            ]
          }
        ],
        takeaway:
          'An unchanged answer has several explanations. Inspect the continuation before concluding that the trace was unused.',
        caveat:
          'Edited traces may be unusual inputs. These interventions require an interface that accepts the relevant intermediate prefix.'
      },
      {
        id: 'reasoning-traces-faithfulness-hint-eligibility',
        kind: 'sequence',
        title: 'Disclosure has an eligibility condition',
        description:
          'Illustrative paired question with baseline answer B and a reviewer hint naming C. No measured model outputs are assumed.',
        steps: [
          {
            label: 'Record the baseline',
            detail: 'Run the question without the hint and preserve the exact answer and trace.'
          },
          {
            label: 'Randomize the hint',
            detail:
              'Add a reviewer cue. Across cases, vary the hinted option and include both correct and incorrect hints.'
          },
          {
            label: 'Identify eligible switches',
            detail:
              'For this example, a hinted answer C after baseline B enters the simplified hint-use denominator. A baseline C would not.'
          },
          {
            label: 'Inspect acknowledgment',
            detail:
              'Check whether the trace acknowledges that the reviewer influenced the choice, rather than merely mentioning the reviewer.'
          },
          {
            label: 'Estimate noise separately',
            detail:
              'Use repeated or matched samples to measure answer changes that also occur without the cue.'
          }
        ],
        takeaway:
          'Report hint uptake, eligible sample count, and conditional disclosure separately.',
        caveat:
          "A switch alone does not establish causal hint use. The article's simplified rate omits the cited study's noise correction."
      }
    ]
  },
  'rlhf-preference-tuning': {
    visuals: [
      {
        id: 'rlhf-preference-tuning-reward-difference',
        kind: 'bars',
        title: 'Reward differences become preference probabilities',
        description:
          'Under the Bradley-Terry model, P[A wins] = 1/[1 + exp[−d]], where d is reward A minus reward B.',
        unit: '% modeled preference for A',
        rows: [
          { label: 'd = 0', value: 50, detail: '1 ÷ [1 + 1] = 0.5' },
          { label: 'd = ln 3', value: 75, detail: '1 ÷ [1 + 1/3] = 0.75' },
          { label: 'd = ln 9', value: 90, detail: '1 ÷ [1 + 1/9] = 0.9' }
        ],
        takeaway:
          'The difference sets the comparison probability. Adding the same constant to both rewards leaves it unchanged.',
        caveat:
          'An exact calculation within the assumed preference model, not measured human agreement or evidence of calibration.'
      },
      {
        id: 'rlhf-preference-tuning-group-baseline',
        kind: 'sequence',
        title: 'A sampled group supplies its own baseline',
        description:
          'Toy four-response group has binary rewards [0, 0, 1, 1]. Show centering before any optional normalization.',
        steps: [
          {
            label: "Sample one prompt's group",
            detail: 'Generate four candidate responses from the current policy.'
          },
          {
            label: 'Score the candidates',
            detail: 'The verifier returns the example rewards 0, 0, 1, and 1.'
          },
          { label: 'Compute the group mean', detail: '[0 + 0 + 1 + 1] ÷ 4 = 0.5.' },
          {
            label: 'Center each reward',
            detail:
              'Subtract 0.5 to obtain [−0.5, −0.5, +0.5, +0.5]. Candidates are compared against siblings from the same prompt.'
          }
        ],
        takeaway:
          'Group-relative feedback uses sampled siblings as a baseline instead of requiring a learned value estimate for this comparison.',
        caveat:
          'Illustrates only reward centering. GRPO implementations also specify normalization, token losses, clipping, and reference-policy terms.'
      }
    ]
  },
  'sakana-evolving-agents-and-selection': {
    visuals: [
      {
        id: 'sakana-evolving-agents-and-selection-winner-ablation',
        kind: 'sequence',
        title: 'Find which winning edit carries the gain',
        description:
          'A final agent may contain useful changes and edits that merely survived alongside them.',
        steps: [
          {
            label: 'Preserve the winning revision',
            detail:
              'Record its exact code, foundation model, tool versions, and selected configuration.'
          },
          {
            label: 'Remove one change',
            detail:
              'Construct a variant that reverses one candidate improvement while preserving the other winning edits.'
          },
          {
            label: 'Match the evaluation',
            detail:
              'Run the winner and ablated variant on the same independent cases under equal resource limits.'
          },
          {
            label: 'Test interactions',
            detail:
              'If several edits may depend on each other, evaluate their joint removal as well as individual removals.'
          }
        ],
        takeaway:
          'Selection identifies a winning program. Ablation tests which changes explain its measured behavior.',
        caveat:
          'An individual edit can matter only in combination, so a single removal is not a complete causal account.'
      },
      {
        id: 'sakana-evolving-agents-and-selection-evaluator-boundary',
        kind: 'compare',
        title: 'Keep the scoring rule outside the evolving agent',
        description:
          'Code evolution can change how an agent solves a task. Evaluation must preserve what counts as solving it.',
        columns: [
          {
            label: 'Candidate implementation',
            points: [
              'Changes prompts, tools, control flow, or memory',
              'Produces outputs under recorded filesystem and tool access',
              'Exceptions and timeouts remain task outcomes'
            ]
          },
          {
            label: 'Independent evaluator',
            points: [
              'Owns labels, scoring rules, and final held-out cases',
              'Does not let candidate code rewrite the criterion',
              'Runs after search and selection rules are frozen'
            ]
          }
        ],
        takeaway:
          'A candidate that changes the test can increase its score without improving the intended task.'
      }
    ]
  },
  'scaling-laws-regimes': {
    visuals: [
      {
        id: 'scaling-laws-regimes-toy-exponent',
        kind: 'line',
        title: 'Separate reducible loss from the floor',
        description:
          'Toy law L = 2 + 1/sqrt[N] uses chosen constants. N is a dimensionless resource multiplier, not a particular model size.',
        xLabel: 'resource multiplier N',
        yLabel: 'toy loss units',
        points: [
          { x: 1, y: 3 },
          { x: 4, y: 2.5 },
          { x: 9, y: 2 + 1 / 3 },
          { x: 16, y: 2.25 },
          { x: 25, y: 2.2 }
        ],
        takeaway:
          'Multiplying N by four halves the reducible term. It does not halve total loss because the floor remains.',
        caveat:
          'An authored power law, not a fitted forecast. Real constants and their valid range require measurements.'
      },
      {
        id: 'scaling-laws-regimes-lifetime-cost',
        kind: 'bars',
        title: 'A training bargain can cost more over its lifetime',
        description:
          'Assume equal task quality and 10,000 requests. Plan A costs 100 units to train and 0.02 per request; B costs 160 and 0.01.',
        unit: 'hypothetical total cost units',
        rows: [
          { label: 'Plan A', value: 300, detail: '100 + 10,000 × 0.02 = 300' },
          { label: 'Plan B', value: 260, detail: '160 + 10,000 × 0.01 = 260' }
        ],
        takeaway:
          'The extra 60 training units repay after 6,000 requests. A training-only optimum omits repeated serving cost.',
        caveat:
          'Invented costs and an assumed quality tie. Hardware, traffic shape, and post-training can change the comparison.'
      }
    ]
  },
  'small-language-models': {
    visuals: [
      {
        id: 'small-language-models-resident-budget',
        kind: 'bars',
        title: 'A two-GB weight payload is not a two-GB process',
        description:
          'Toy four-billion-parameter model uses four-bit codes and one FP16 scale per 64 weights. Assume 0.75 GB cache and 0.5 GB workspace.',
        unit: 'GB, decimal',
        rows: [
          { label: 'Weight codes', value: 2, detail: '4 billion × 4 ÷ 8 bytes = 2 GB' },
          { label: 'Scales', value: 0.125, detail: '4 billion ÷ 64 × 2 bytes = 0.125 GB' },
          { label: 'KV cache', value: 0.75, detail: 'Chosen workload allocation' },
          { label: 'Workspace', value: 0.5, detail: 'Chosen runtime allocation' }
        ],
        takeaway:
          'These four terms total 3.375 GB. Check the complete resident budget before deciding that a small model fits.',
        caveat:
          'Example accounting excludes zero points, padding, retained high-precision tensors, fragmentation, and other application memory.'
      },
      {
        id: 'small-language-models-teacher-error',
        kind: 'sequence',
        title: 'Distillation can copy an error as well as a skill',
        description: 'The student learns from the teacher signal that survives the data pipeline.',
        steps: [
          {
            label: 'Collect teacher outputs',
            detail: "Generate examples that cover the student's intended task distribution."
          },
          {
            label: 'Validate independently',
            detail:
              'Use task evidence or executable checks where available. A teacher grading its own output can repeat the same mistake.'
          },
          {
            label: 'Train the student',
            detail:
              'Record whether supervision uses hard responses, probabilities, or other teacher targets. These expose different information.'
          },
          {
            label: 'Test on real held-out cases',
            detail:
              'Evaluate task quality and rare failure slices using evidence that was not generated by the same teacher pipeline.'
          }
        ],
        takeaway:
          'A compact student needs an independent evaluation, even when it closely imitates a capable teacher.'
      }
    ]
  },
  'sparse-autoencoder-evaluation': {
    visuals: [
      {
        id: 'sparse-autoencoder-evaluation-error-preservation',
        kind: 'compare',
        title: 'Preserving reconstruction error isolates a different edit',
        description:
          'Toy activation x = [3, 4], reconstruction [3, 3], error [0, 1]. Remove a latent contribution [1, 0].',
        columns: [
          {
            label: 'Edit the original',
            points: [
              '[3, 4] − [1, 0] = [2, 4]',
              'Preserves the error [0, 1]',
              'Changes only the selected decoder contribution in this arithmetic'
            ]
          },
          {
            label: 'Reconstruct, then edit',
            points: [
              '[3, 3] − [1, 0] = [2, 3]',
              'Also removes error [0, 1]',
              'Combines the latent edit with reconstruction replacement'
            ]
          }
        ],
        takeaway:
          'A behavioral difference can include reconstruction damage unless the experiment keeps that change explicit.',
        caveat:
          'Exact vector arithmetic. A decoder direction can still affect several behaviors, so this does not establish semantic isolation.'
      },
      {
        id: 'sparse-autoencoder-evaluation-absorption-investigation',
        kind: 'sequence',
        title: 'Investigate what a silent latent misses',
        description:
          'Start with a held-out positive example that fails to activate the latent carrying the broad concept label.',
        steps: [
          {
            label: 'Check behavior',
            detail:
              'Test whether the underlying model still uses the relevant property on the missed example.'
          },
          {
            label: 'Check recoverable information',
            detail:
              'Use independently labeled examples to test whether a probe can recover that property.'
          },
          {
            label: 'Inspect alternate latents',
            detail:
              'Look for active token-specific or narrower latents that may carry the missed property.'
          },
          {
            label: 'Test causal contributions',
            detail:
              'Intervene on the candidate alternatives while controlling reconstruction error and measuring unrelated effects.'
          }
        ],
        takeaway:
          "The broad detector's silence can reflect an incomplete dictionary label while the model still retains the information."
      }
    ]
  },
  'synthetic-data-pipelines': {
    visuals: [
      {
        id: 'synthetic-data-pipelines-filter-mixture',
        kind: 'bars',
        title: 'Filtering can change the task mixture',
        description:
          'Toy generator produces 100 easy and 100 hard cases. A validator accepts 90 easy cases and 20 hard cases.',
        unit: 'accepted records',
        rows: [
          { label: 'Easy cases', value: 90, detail: '90 of 100 generated cases accepted' },
          { label: 'Hard cases', value: 20, detail: '20 of 100 generated cases accepted' }
        ],
        takeaway:
          'Easy cases rise from 50% of generated data to 90/110, about 82% of accepted data.',
        caveat:
          'Chosen counts, not validator measurements. Acceptance differences can reflect validity or validator bias; audit both.'
      },
      {
        id: 'synthetic-data-pipelines-lineage-split',
        kind: 'sequence',
        title: "A paraphrase inherits its seed's split",
        description:
          'String-level novelty does not make a generated descendant independent of its source.',
        steps: [
          {
            label: 'Assign the ancestor',
            detail: 'Give the source seed a group identifier and split before generating variants.'
          },
          {
            label: 'Generate descendants',
            detail:
              'Attach each prompt, paraphrase, and response to that ancestor even when its wording changes.'
          },
          {
            label: 'Inherit the split',
            detail:
              "Keep all descendants in the ancestor's group. Deduplicate within and across source groups using the retained lineage."
          },
          {
            label: 'Audit the boundary',
            detail:
              'Check that no evaluation seed or derivative entered the training corpus through another generation route.'
          }
        ],
        takeaway: 'Split assignment follows ancestry, not the final text hash.'
      }
    ]
  },
  'tokenizer-design': {
    visuals: [
      {
        id: 'tokenizer-design-fertility-budget',
        kind: 'bars',
        title: 'The same content can spend twice the context',
        description:
          'Toy parallel passages each contain 1,000 words. Assume fertilities of 1.5 and 3 tokens per word for these two passages.',
        unit: 'input tokens',
        rows: [
          { label: 'Passage A, fertility 1.5', value: 1500, detail: '1,000 × 1.5 = 1,500 tokens' },
          { label: 'Passage B, fertility 3', value: 3000, detail: '1,000 × 3 = 3,000 tokens' }
        ],
        takeaway:
          'B uses twice the context. Dense attention pair count would be four times larger under the same full-attention calculation.',
        caveat:
          'Assumed passage counts, not measurements for named languages. Pair counting alone does not predict wall-clock runtime.'
      },
      {
        id: 'tokenizer-design-new-token-initialization',
        kind: 'sequence',
        title: 'Adding a token also adds an untrained row',
        description:
          'Vocabulary extension changes the tokenizer-to-embedding contract and needs continued training.',
        steps: [
          {
            label: 'Find the old pieces',
            detail:
              'Encode the proposed new string with the existing tokenizer to identify its current constituent tokens.'
          },
          {
            label: 'Initialize from those pieces',
            detail:
              'Use their mean embedding as a starting point. For toy rows [1, 0] and [0, 1], the mean is [0.5, 0.5].'
          },
          {
            label: 'Update the vocabulary-dependent weights',
            detail:
              "Resize the required embedding and output weights, preserving the model's intended tying."
          },
          {
            label: 'Train and retest',
            detail:
              'Continue training and evaluate both the new distribution and original tasks. A sensible initialization does not train the new token by itself.'
          }
        ],
        takeaway:
          'A tokenizer entry needs a matching trained representation and a checkpoint that records the changed vocabulary.',
        caveat:
          'The vector example illustrates initialization only. It makes no claim about downstream quality or the learning rate required.'
      }
    ]
  },
  'vision-language-models': {
    visuals: [
      {
        id: 'vision-language-models-patch-budget',
        kind: 'bars',
        title: 'Doubling image width and height quadruples patches',
        description:
          'Square images with 14 × 14 pixel patches and no token compression. Patch count is [image side ÷ 14] squared.',
        unit: 'patch tokens per image',
        rows: [
          { label: '224 × 224 pixels', value: 256, detail: '16 × 16 patches' },
          { label: '448 × 448 pixels', value: 1024, detail: '32 × 32 patches' },
          { label: '896 × 896 pixels', value: 4096, detail: '64 × 64 patches' }
        ],
        takeaway:
          'Higher resolution expands the sequence before generation starts. A larger image can consume the context budget even with a small language model.',
        caveat:
          'Patch arithmetic excludes class tokens, tiling overhead, pooling, resampling, and architecture-specific token merging.'
      },
      {
        id: 'vision-language-models-staged-gradients',
        kind: 'compare',
        title: 'Alignment and instruction tuning update different weights',
        description:
          "The article's LLaVA-style two-stage example separates fitting the connector from adapting language behavior.",
        columns: [
          {
            label: 'Projector stage',
            points: [
              'Vision encoder stays frozen',
              'Language model stays frozen',
              'Image-caption loss updates the projector that maps visual features into language embeddings'
            ]
          },
          {
            label: 'Instruction stage',
            points: [
              'Vision encoder stays frozen in this recipe',
              'Projector and language model receive updates',
              'Visual instruction examples train responses to multimodal requests'
            ]
          }
        ],
        takeaway:
          'The trainable-weight mask defines what each stage can change, even when the forward architecture looks identical.',
        caveat:
          'One recipe described in the article. Other VLMs can use different frozen components, objectives, and training stages.'
      }
    ]
  },
  'voice-audio-models': {
    visuals: [
      {
        id: 'voice-audio-models-throughput-first-output',
        kind: 'bars',
        title: 'Equal processing rate can hide a long first-output wait',
        description:
          'Toy live input lasts 30 seconds. Both systems spend 0.2 seconds of compute per audio second and emit only after processing an input unit.',
        unit: 'seconds from capture start to first output',
        rows: [
          {
            label: 'One-second streaming unit',
            value: 1.2,
            detail: 'Collect 1 second, then compute for 0.2 seconds'
          },
          {
            label: 'Whole 30-second unit',
            value: 36,
            detail: 'Collect 30 seconds, then compute for 6 seconds'
          }
        ],
        takeaway:
          'Both have a compute RTF of 0.2. The input dependency determines when their first output can become available.',
        caveat:
          'Invented sequential systems. Network, buffering, right context, and overlap are excluded; these are not model benchmarks.'
      },
      {
        id: 'voice-audio-models-sample-clock',
        kind: 'matrix',
        title: 'Relabeling a sample rate is not resampling',
        description:
          'Toy recording contains exactly 48,000 samples captured at 48 kHz. Duration equals sample count divided by declared sample rate.',
        columns: ['Sample count', 'Declared rate', 'Interpreted duration'],
        rows: [
          { label: 'Original', cells: ['48,000', '48,000 samples/s', '1 second'] },
          { label: 'Relabel only', cells: ['48,000', '16,000 samples/s', '3 seconds'] },
          { label: 'Resample to 16 kHz', cells: ['16,000', '16,000 samples/s', '1 second'] }
        ],
        takeaway:
          'Changing metadata changes the interpreted clock. Resampling changes the samples to preserve the original duration.',
        caveat:
          'Exact-duration accounting for an ideal conversion. Resampler filtering and boundary behavior need separate signal-quality checks.'
      }
    ]
  },
  'world-labs-atlas-spatial-intelligence': {
    visuals: [
      {
        id: 'world-labs-atlas-spatial-intelligence-camera-loop',
        kind: 'sequence',
        title: 'Return to the same pose and test the same scene',
        description:
          'A camera loop exposes contradictions that individually plausible frames can conceal.',
        steps: [
          {
            label: 'Record pose A',
            detail:
              'Preserve camera intrinsics, extrinsics, scene scale, and landmark observations at the starting viewpoint.'
          },
          {
            label: 'Move through pose B',
            detail:
              'Request a new view using a documented camera path. Check landmark reprojection and depth where references exist.'
          },
          {
            label: 'Return to pose A',
            detail:
              'Use the same camera parameters as the start, rather than a textual approximation to the viewpoint.'
          },
          {
            label: 'Compare commitments',
            detail:
              'Check whether landmarks, dimensions, and depth return consistently. Evaluate appearance as a separate outcome.'
          }
        ],
        takeaway:
          'A return path tests whether the model preserves one scene through a sequence of viewpoint changes.',
        caveat:
          'Use a static-scene subset for this geometry test so real motion is not mistaken for inconsistency.'
      },
      {
        id: 'world-labs-atlas-spatial-intelligence-observation-labels',
        kind: 'matrix',
        title: 'Keep observed geometry separate from completed geometry',
        description:
          'A generated surface needs an evidence label before its accuracy can be interpreted.',
        columns: ['Evidence available', 'Valid comparison'],
        rows: [
          {
            label: 'Observed region',
            cells: [
              'Input views and reference measurements',
              'Reprojection or geometry error against those measurements'
            ]
          },
          {
            label: 'Initially hidden region',
            cells: [
              'A later independent measurement reveals it',
              'Generated completion against the later reference'
            ]
          },
          {
            label: 'Never measured region',
            cells: [
              'Only a plausible completion',
              'Describe plausibility without claiming recovered geometry'
            ]
          }
        ],
        takeaway:
          'An unobserved completion becomes testable reconstruction evidence only when an independent reference exists.'
      }
    ]
  }
}
