import { describe, expect, test } from 'bun:test'
import {
  LABS,
  defaults,
  detectorCounts,
  editEffects,
  groupQuantize,
  memoryBudget,
  monitorCounts,
  patchMargin,
  renderLab,
  runtimeBudget,
  symmetricQuantize,
  toyWeights,
  type LabKind
} from './article-labs'

describe('quantization teaching arithmetic', () => {
  test('zero, ties, saturation, and symmetric code ranges agree', () => {
    for (const bits of [2, 3, 4, 8]) {
      const q = symmetricQuantize(0, bits, 2)
      expect(q.decoded).toBe(0)
      expect(q.levels).toBe(2 ** bits - 1)
      expect(symmetricQuantize(q.scale / 2, bits, 2).code).toBe(1)
      expect(symmetricQuantize(-q.scale / 2, bits, 2).code).toBe(-1)
      expect(symmetricQuantize(100, bits, 2).decoded).toBe(2)
      expect(symmetricQuantize(-100, bits, 2).decoded).toBe(-2)
    }
  })

  test('unclipped error stays within half a step', () => {
    for (let i = -200; i <= 200; i++) {
      const value = i / 100
      const result = symmetricQuantize(value, 4, 2)
      expect(Math.abs(value - result.decoded)).toBeLessThanOrEqual(result.scale / 2 + 1e-12)
    }
  })

  test('an outlier affects only its own scale group', () => {
    const low = groupQuantize(toyWeights(1), 4, 8)
    const high = groupQuantize(toyWeights(12), 4, 8)
    expect(high.slice(0, 56)).toEqual(low.slice(0, 56))
    expect(high.slice(56, 63)).not.toEqual(low.slice(56, 63))
  })

  test('all-zero groups decode without NaN', () => {
    expect(groupQuantize([0, 0, 0, 0], 4, 4)).toEqual([0, 0, 0, 0])
  })

  test('rescaling preserves the displayed exact dot product', () => {
    for (const alpha of [0, 0.25, 0.5, 0.75, 1]) {
      const state = renderLab('rescaling', { alpha })
      expect(state.metrics.find((metric) => metric.label === 'Exact dot product')?.value).toBe(
        '6.31'
      )
    }
  })

  test('8B default payload includes scale bytes and retained FP16 weights', () => {
    const result = memoryBudget(8, 4, 128, 8, 1)
    expect(result.codes).toBe(3_960_000_000)
    expect(result.scales).toBe(123_750_000)
    expect(result.retained).toBe(160_000_000)
    expect(result.kv).toBe(2 ** 30)
    expect(memoryBudget(8, 4, 128, 16, 2).kv).toBe(result.kv * 4)
    expect(result.total).toBe(4_243_750_000 + 2 * 2 ** 30)
  })

  test('bandwidth gains disappear at the fixed compute ceiling', () => {
    expect(runtimeBudget(4, 1, 0).speedup).toBe(4)
    expect(runtimeBudget(4, 256, 0).speedup).toBe(1)
    expect(runtimeBudget(4, 256, 2).speedup).toBeLessThan(1)
  })
})

describe('research experiment invariants', () => {
  test('redundancy and synergy lead to opposite single-path results', () => {
    expect(patchMargin('Redundant', 1, 0)).toBe(4)
    expect(patchMargin('Redundant', 1, 1)).toBe(4)
    expect(patchMargin('Both required', 1, 0)).toBe(-2)
    expect(patchMargin('Both required', 1, 1)).toBe(4)
  })

  test('confusion-matrix totals preserve the labeled population', () => {
    for (const threshold of [0.05, 0.5, 0.95]) {
      for (const absorption of [0, 6, 20]) {
        const counts = detectorCounts(threshold, absorption)
        expect(counts.tp + counts.fn).toBe(24)
        expect(counts.tn + counts.fp).toBe(24)
      }
    }
    expect(detectorCounts(0.05, 20).fn).toBe(20)
  })

  test('monitor recall uses all shortcut cases, not disclosed cases', () => {
    const result = monitorCounts(25, 80, 5)
    expect(result.caught).toBe(20)
    expect(result.missed).toBe(80)
    expect(result.falsePositives).toBe(45)
    expect(result.precision).toBeCloseTo(20 / 65)
    expect(monitorCounts(0, 100, 0).precision).toBeNull()
  })

  test('protecting a near-parallel key increases update norm and other-key damage', () => {
    const plain = editEffects(0.99, 1, false)
    const protectedEdit = editEffects(0.99, 1, true)
    expect(plain.target).toBe(1)
    expect(plain.neighbor).toBe(0.99)
    expect(protectedEdit.target).toBe(1)
    expect(protectedEdit.neighbor).toBe(0)
    expect(protectedEdit.norm).toBeGreaterThan(7)
    expect(protectedEdit.other).toBeLessThan(-7)
  })

  test('every lab renders finite output at each exposed control extreme', () => {
    for (const candidate of Object.keys(LABS)) {
      const kind = Object.keys(LABS).find((key): key is LabKind => key === candidate)
      if (!kind) throw new Error('Unknown lab')
      for (const control of LABS[kind].controls) {
        const extremes =
          control.type === 'range'
            ? [control.min, control.max, Number.NaN]
            : control.options.map((option) => option.value)
        for (const value of extremes) {
          const state = renderLab(kind, { ...defaults(kind), [control.key]: value }, 240)
          expect(JSON.stringify(state)).not.toMatch(/NaN|Infinity|undefined/)
          expect(state.chart).not.toBe('')
        }
      }
    }
  })
})
