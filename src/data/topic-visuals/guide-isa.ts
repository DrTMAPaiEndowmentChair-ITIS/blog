import type { TopicVisualRegistry } from '../../types/topic-visuals'

export const isaGuideVisuals: TopicVisualRegistry = {
  'x86-simd-avx512-inference': {
    visuals: [
      {
        id: 'x86-simd-avx512-inference-fp32-lanes',
        kind: 'bars',
        title: 'Register width counts elements, not cycles',
        description: 'Divide register width by 32 bits to count packed FP32 elements.',
        unit: 'FP32 elements per register',
        rows: [
          { label: '128 bits', value: 4, detail: '128 / 32 = 4 elements' },
          { label: '256 bits', value: 8, detail: '256 / 32 = 8 elements' },
          { label: '512 bits', value: 16, detail: '512 / 32 = 16 elements' }
        ],
        takeaway:
          'Wider architectural registers hold more elements; physical execution rate is a separate property.',
        caveat:
          'Element capacity does not establish instruction availability, issue rate, or memory bandwidth.',
        sources: [
          {
            label: 'Intel SIMD architecture manuals',
            href: 'https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html'
          }
        ]
      },
      {
        id: 'x86-simd-avx512-inference-masked-tail',
        kind: 'flow',
        title: 'Nineteen values need one full vector and one masked tail',
        description: 'Toy FP32 array with 19 elements and a 16-element AVX-512 loop.',
        steps: [
          {
            label: 'Process indices 0 through 15',
            detail: 'One full vector covers 16 valid elements.'
          },
          {
            label: 'Build mask 0x0007',
            detail: 'Three low bits select the remaining indices 16, 17, and 18.'
          },
          {
            label: 'Mask the memory instructions',
            detail: 'Supported masked loads and stores access only those three elements.'
          },
          {
            label: 'Finish without an out-of-bounds load',
            detail: 'Masking arithmetic alone would not protect an earlier unmasked load.'
          }
        ],
        takeaway: 'The mask must reach the load or store that could cross the array boundary.',
        caveat:
          'This describes supported masked memory instructions, not arbitrary memory accesses.',
        sources: [
          {
            label: 'Intel masked load/store intrinsic contracts',
            href: 'https://www.intel.com/content/www/us/en/docs/intrinsics-guide/index.html'
          }
        ]
      }
    ]
  },
  'x86-amx-vnni-avx10': {
    visuals: [
      {
        id: 'x86-amx-vnni-avx10-accumulation-contracts',
        kind: 'matrix',
        title: 'Name the inputs and the accumulator',
        description:
          'Three representative operations expose different arithmetic and state contracts.',
        columns: ['Arithmetic grouping', 'Result state'],
        rows: [
          {
            label: '256-bit VPDPBUSD',
            cells: ['Four u8 × s8 products per output', 'Eight INT32 vector accumulators']
          },
          {
            label: 'VDPBF16PS',
            cells: ['Two BF16 products per output', 'FP32 vector accumulators']
          },
          {
            label: 'AMX-INT8 TMUL',
            cells: [
              'Packed reduction groups of four bytes',
              'INT32 output tile; tile configuration required'
            ]
          }
        ],
        takeaway:
          'A low-bit checkpoint does not identify the executed multiplication or accumulation format.',
        caveat:
          'Required ISA subsets and usable operand widths differ. Saturating variants have different overflow semantics.',
        sources: [
          {
            label: 'LLVM AVX-VNNI intrinsic definitions',
            href: 'https://github.com/llvm/llvm-project/blob/main/clang/lib/Headers/avxvnniintrin.h'
          },
          {
            label: 'Intel BF16 instructions',
            href: 'https://www.intel.com/content/www/us/en/developer/articles/technical/intel-deep-learning-boost-new-instruction-bfloat16.html'
          },
          {
            label: 'Intel AMX programming example',
            href: 'https://www.intel.com/content/www/us/en/developer/articles/code-sample/advanced-matrix-extensions-intrinsics-functions.html'
          }
        ]
      },
      {
        id: 'x86-amx-vnni-avx10-linux-state',
        kind: 'sequence',
        title: 'AMX availability is a sequence of gates',
        description:
          'A Linux process must establish a valid execution environment before timing tile arithmetic.',
        steps: [
          {
            label: 'Discover the required facilities',
            detail:
              'Check AMX-TILE, the required datatype extension, supported XSTATE, and enabled OS state.'
          },
          {
            label: 'Prepare signal stacks and request permission',
            detail:
              'Existing alternate stacks must fit the larger frame. Request tile-data component 18.'
          },
          {
            label: 'Initialize each worker',
            detail:
              'First tile-data use allocates expanded task state. Keep this out of steady-state timing.'
          },
          {
            label: 'Run compatible packed tiles',
            detail:
              'Configure shapes, load packed operands, accumulate, store, and release tile state.'
          }
        ],
        takeaway:
          'Process permission, per-task allocation, and datatype support answer separate questions.',
        caveat: 'A permission request can fail even when the physical CPU implements AMX.',
        sources: [
          {
            label: 'Linux dynamic XSTATE permissions',
            href: 'https://docs.kernel.org/arch/x86/xstate.html'
          },
          {
            label: 'Intel tile programming contract',
            href: 'https://www.intel.com/content/www/us/en/developer/articles/code-sample/advanced-matrix-extensions-intrinsics-functions.html'
          }
        ]
      }
    ]
  },
  'arm-neon-sve-sme': {
    visuals: [
      {
        id: 'arm-neon-sve-sme-programming-models',
        kind: 'compare',
        title: 'The accumulation model changes with the extension',
        description: 'Choose the kernel interface before comparing instruction throughput.',
        columns: [
          {
            label: 'Neon',
            points: [
              'Fixed 128-bit vectors.',
              'Dot product, I8MM, and BF16 need their respective capabilities.',
              'Register accumulators and explicit matrix blocking.'
            ]
          },
          {
            label: 'SVE and SVE2',
            points: [
              'Runtime vector length and element predicates.',
              'Vector-length-agnostic loops handle partial final vectors.',
              'Ordinary SVE support must be detected separately from SME.'
            ]
          },
          {
            label: 'SME and SME2',
            points: [
              'Streaming vectors and ZA matrix accumulation.',
              'Streaming VL can differ from ordinary SVE VL.',
              'Compiler interfaces describe streaming mode and ZA ownership.'
            ]
          }
        ],
        takeaway: 'SME2 availability does not establish ordinary non-streaming SVE2 support.',
        caveat: 'Hardware, OS exposure, datatype support, and the runtime kernel must all match.',
        sources: [
          {
            label: 'Arm comparison of Neon, SVE, and SME',
            href: 'https://developer.arm.com/community/arm-community-blogs/b/architectures-and-processors-blog/posts/matrix-matrix-multiplication-neon-sve-and-sme-compared'
          },
          { label: 'Arm SME implementation notes', href: 'https://learn.arm.com/insights/sme/' }
        ]
      },
      {
        id: 'arm-neon-sve-sme-za-storage',
        kind: 'bars',
        title: 'Full ZA storage grows with the square of streaming width',
        description:
          'ZA bytes = (streaming vector length in bits / 8)². These are illustrative supported-width cases.',
        unit: 'bytes in the full ZA array',
        rows: [
          { label: '128-bit SVL', value: 256, detail: '16 × 16 bytes' },
          { label: '256-bit SVL', value: 1024, detail: '32 × 32 bytes' },
          { label: '512-bit SVL', value: 4096, detail: '64 × 64 bytes' }
        ],
        takeaway:
          'Wider matrix state increases accumulator capacity and potential state-management cost.',
        caveat:
          'Full ZA storage is not the size of every typed tile view. Devices need not support all these SVLs.',
        sources: [
          {
            label: 'Linux SME architectural state',
            href: 'https://docs.kernel.org/arch/arm64/sme.html'
          },
          { label: 'Arm ZA storage explanation', href: 'https://learn.arm.com/insights/sme/' }
        ]
      }
    ]
  },
  'riscv-power-z-inference-isa': {
    visuals: [
      {
        id: 'riscv-power-z-inference-isa-models',
        kind: 'matrix',
        title: 'These backends dispatch different units of work',
        description:
          'Vector loops, matrix accumulators, and tensor-operation assists require different integration.',
        columns: ['Execution contract', 'Preparation to account for'],
        rows: [
          {
            label: 'RISC-V Vector',
            cells: [
              'Process the vl returned for a supported SEW/LMUL configuration',
              'Register groups, tail policy, optional datatype support'
            ]
          },
          {
            label: 'POWER MMA',
            cells: [
              'Accumulate small matrix updates in 512-bit accumulator state',
              'Operand arrangement, accumulator setup and extraction'
            ]
          },
          {
            label: 'IBM Z NNPA through zDNN',
            cells: [
              'Invoke supported tensor operations over transformed descriptors',
              'Layout conversion, alignment, format and operation limits'
            ]
          }
        ],
        takeaway: 'Port the data and execution contracts, not just the instruction names.',
        caveat:
          'This compares representative facilities. Each architecture also supports other scalar or vector paths.',
        sources: [
          {
            label: 'RISC-V Vector specification',
            href: 'https://docs.riscv.org/reference/isa/v20260120/unpriv/v-st-ext.html'
          },
          { label: 'Original POWER MMA paper', href: 'https://arxiv.org/abs/2104.03142' },
          {
            label: 'IBM zDNN API reference',
            href: 'https://github.com/IBM/zDNN/blob/main/README.md'
          }
        ]
      },
      {
        id: 'riscv-power-z-inference-isa-returned-vl',
        kind: 'sequence',
        title: 'A legal RVV implementation can balance the last two chunks',
        description: 'Toy example: VLEN = 256 bits, SEW = 32, LMUL = 1, and 13 elements remain.',
        steps: [
          { label: 'Compute capacity', detail: 'VLMAX = 1 × 256 / 32 = 8 elements.' },
          {
            label: 'Request AVL = 13',
            detail: 'Because 8 < 13 < 16, a returned vl of 7 is legal: ceil(13 / 2) = 7.'
          },
          {
            label: 'Advance by the returned 7',
            detail: 'Process seven elements and update pointers by seven element widths.'
          },
          {
            label: 'Request the remaining 6',
            detail: 'AVL is now no greater than VLMAX, so vl must be 6.'
          }
        ],
        takeaway: 'Advance by returned vl. Do not replace the result with min(remaining, VLMAX).',
        caveat:
          'The illustrated choice is legal, not mandatory. Another implementation may choose 8 then 5.',
        sources: [
          {
            label: 'RISC-V constraints on setting vl',
            href: 'https://docs.riscv.org/reference/isa/v20260120/unpriv/v-st-ext.html'
          }
        ]
      }
    ]
  },
  'runtime-isa-dispatch': {
    visuals: [
      {
        id: 'runtime-isa-dispatch-gates',
        kind: 'flow',
        title: 'A specialized function must pass every gate',
        description:
          'Failure at any gate selects a compatible fallback or a different operator implementation.',
        steps: [
          {
            label: 'The artifact contains the implementation',
            detail:
              'Compile the detector and startup for the baseline; isolate target-specific bodies.'
          },
          {
            label: 'Hardware and OS expose usable state',
            detail: 'Check exact ISA subsets and enabled vector state. AMX also needs permission.'
          },
          {
            label: 'The worker can keep using it',
            detail:
              'Respect CPU affinity, migration constraints, and per-thread vector configuration.'
          },
          {
            label: 'The operator and packed data match',
            detail: 'Choose a kernel whose datatype, shape, layout, and blocking match its inputs.'
          }
        ],
        takeaway:
          'Feature discovery establishes legality; operator dispatch chooses compatible useful work.',
        caveat:
          'The widest legal implementation is not necessarily fastest for a particular shape.',
        sources: [
          {
            label: 'GCC per-function target attributes',
            href: 'https://gcc.gnu.org/onlinedocs/gcc/x86-Attributes.html'
          },
          {
            label: 'Linux dynamic XSTATE contract',
            href: 'https://docs.kernel.org/arch/x86/xstate.html'
          }
        ]
      },
      {
        id: 'runtime-isa-dispatch-evidence',
        kind: 'matrix',
        title: 'Inclusion, selection, and execution need different evidence',
        description: 'Record the claim each observation actually supports.',
        columns: ['What it establishes', 'What remains unproven'],
        rows: [
          {
            label: 'Compiler accepts a target',
            cells: ['Toolchain can generate the target code', 'Deployment CPU or OS can run it']
          },
          {
            label: 'Disassembly contains a specialized body',
            cells: ['The artifact includes those instructions', 'The dispatcher selects that body']
          },
          {
            label: 'Capability and permission checks pass',
            cells: [
              'Required execution facilities are available',
              'The operator reaches an optimized implementation'
            ]
          },
          {
            label: 'Runtime implementation log',
            cells: [
              'The runtime selected a named implementation',
              'That implementation dominates elapsed time'
            ]
          },
          {
            label: 'Profile plus request timing',
            cells: [
              'Executed hot path and measured request behavior',
              'Performance on different shapes or machines'
            ]
          }
        ],
        takeaway:
          'Keep capability results, implementation logs, and measurements in the same experiment record.',
        sources: [
          {
            label: 'oneDNN implementation logging',
            href: 'https://uxlfoundation.github.io/oneDNN/dev_guide_verbose.html'
          }
        ]
      }
    ]
  }
}
