import { describe, expect, test } from 'bun:test'
import {
  actionTrace,
  archiveSearch,
  cacheCosts,
  dynamics,
  FRONTIER_LABS,
  frontierDefaults,
  historyBudget,
  pipelineTimes,
  planAction,
  renderFrontierLab,
  rewardCounts,
  searchSelection,
  seededScore,
  stereoDepth,
  tileBudget,
  type FrontierKind
} from './frontier-labs'
import { LABS, defaults, renderLab } from './research-lab-registry'

describe('frontier experiment calculations', () => {
  test('stereo uncertainty scales quadratically with depth and inversely with baseline', () => {
    const a = stereoDepth(0.5, 8, 800)
    expect(a.disparity).toBe(50)
    expect(a.uncertainty).toBe(0.16)
    expect(stereoDepth(0.5, 16, 800).uncertainty).toBe(a.uncertainty * 4)
    expect(stereoDepth(1, 8, 800).uncertainty).toBe(a.uncertainty / 2)
  })
  test('fresh observations react earlier than delayed chunks', () => {
    expect(actionTrace(1, 0).rmse).toBeLessThan(actionTrace(32, 200).rmse)
    expect(actionTrace(1, 0).calls).toBe(151)
    const h = historyBudget(10, 20)
    expect(h.frames + h.summaries).toBe(h.total)
    expect(h.total).toBeLessThan(h.dense)
    expect(h.dense).toBe(307200)
  })
  test('selection uses bounded independent samples and a nondecreasing development maximum', () => {
    const a = searchSelection(256, 100)
    expect(a.development).toHaveLength(256)
    for (let i = 1; i < a.development.length; i++)
      expect(a.development[i].y).toBeGreaterThanOrEqual(a.development[i - 1].y)
    expect(seededScore(12, 100, 0)).toBe(seededScore(12, 100, 0))
    expect(Array.from({ length: 50 }, (_, i) => seededScore(i, 100, 0))).not.toEqual(
      Array.from({ length: 50 }, (_, i) => seededScore(i, 100, 1))
    )
  })
  test('archive finds the higher peak through retained weak intermediates', () => {
    const a = archiveSearch(80)
    expect(a.fitness(a.greedy)).toBeCloseTo(1, 5)
    expect(Math.max(...a.archive.map(a.fitness))).toBeCloseTo(1.5, 5)
    expect(new Set(a.archive).size).toBe(a.archive.length)
    expect(a.archive.every((x) => x >= 0 && x <= 1)).toBe(true)
  })
  test('reference dynamics and action regret agree when the model is exact', () => {
    expect(dynamics(0.1, 20)).toEqual(dynamics(0.1, 20))
    expect(dynamics(0, 5).at(-1)?.y).toBe(10)
    expect(planAction(1, 64).regret).toBe(0)
    for (const gain of [0.2, 0.5, 1, 2])
      expect(planAction(gain, 64).regret).toBeGreaterThanOrEqual(0)
  })
  test('cache footprint includes keys, values, layers, heads, and scalar width', () => {
    const a = cacheCosts(8192, 25, 20000)
    expect(a.bytes).toBe(2 ** 30)
    expect(a.transfer).toBeCloseTo(43.14967296, 7)
    expect(a.recompute).toBe(409.6)
  })
  test('reward counts preserve the population and use the rewarded denominator', () => {
    const a = rewardCounts(10, 5)
    expect(a.correct).toBe(665)
    expect(a.wrong).toBe(30)
    expect(a.correct + a.wrong + a.rejected).toBe(1000)
    expect(a.precision).toBeCloseTo(665 / 695, 12)
    expect(rewardCounts(0, 30).precision).toBe(1)
  })
  test('tile accounting and pipeline end times respect their declared resources', () => {
    const a = tileBudget(64, 64)
    expect(a.flops).toBe(524288)
    expect(a.bytes).toBe(24576)
    expect(a.shared).toBe(32768)
    for (let tiles = 2; tiles <= 12; tiles++)
      for (let load = 1; load <= 10; load++)
        for (let compute = 1; compute <= 10; compute++) {
          const p = pipelineTimes(tiles, load, compute)
          let loadEnd = 0,
            computeEnd = 0
          const release: number[] = []
          for (let i = 0; i < tiles; i++) {
            loadEnd = Math.max(loadEnd, i >= 2 ? release[i - 2] : 0) + load
            computeEnd = Math.max(loadEnd, computeEnd) + compute
            release.push(computeEnd)
          }
          expect(p.overlap).toBe(computeEnd)
          expect(p.overlap).toBeLessThanOrEqual(p.serial)
        }
  })
  test('every new experiment renders finite accessible output at every exposed extreme', () => {
    const kinds = Object.keys(FRONTIER_LABS).filter((key): key is FrontierKind =>
      Object.hasOwn(FRONTIER_LABS, key)
    )
    expect(kinds).toHaveLength(22)
    for (const kind of kinds) {
      const base = frontierDefaults(kind)
      const variants = [
        base,
        ...FRONTIER_LABS[kind].controls.flatMap((c) =>
          (c.type === 'range' ? [c.min, c.max] : c.options.map((o) => o.value)).map((value) => ({
            ...base,
            [c.key]: value
          }))
        )
      ]
      for (const values of variants)
        for (const width of [240, 520]) {
          const result = renderFrontierLab(kind, values, width)
          expect(JSON.stringify(result)).not.toMatch(/NaN|Infinity|undefined/)
          expect(result.chart).toContain('role="img"')
          expect(result.metrics.length).toBeGreaterThan(0)
          expect(renderLab(kind, values, width)).toEqual(result)
        }
    }
    expect(Object.keys(LABS)).toHaveLength(36)
    expect(defaults('rounding').bits).toBe(4)
  })
})
