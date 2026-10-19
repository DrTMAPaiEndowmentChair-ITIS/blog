/** Authored teaching experiments, never measurements of the named research systems. */
import {
  bars,
  lineChart,
  svgStart,
  type Definition,
  type LabControl,
  type LabState,
  type LabValues,
  type Point
} from './article-labs'
export type FrontierKind =
  | 'stereo-depth'
  | 'view-coverage'
  | 'action-chunks'
  | 'robot-memory'
  | 'robot-data'
  | 'domain-grid'
  | 'denoising-grid'
  | 'denoising-cost'
  | 'selection-noise'
  | 'archive-search'
  | 'speech-timing'
  | 'music-timing'
  | 'sequence-scaling'
  | 'sequence-score'
  | 'dynamics-drift'
  | 'model-planner'
  | 'cache-transfer'
  | 'cache-routing'
  | 'verifier-noise'
  | 'rl-pipeline'
  | 'tile-reuse'
  | 'kernel-pipeline'
const r = (
  key: string,
  label: string,
  min: number,
  max: number,
  step: number,
  value: number,
  unit = ''
): LabControl => ({ type: 'range', key, label, min, max, step, value, unit })
const s = (key: string, label: string, options: string[], value: string): LabControl => ({
  type: 'select',
  key,
  label,
  options: options.map((option) => ({ value: option, label: option })),
  value
})
const def = (title: string, description: string, controls: LabControl[]): Definition => ({
  title,
  description,
  controls
})
export const FRONTIER_LABS: Record<FrontierKind, Definition> = {
  'stereo-depth': def(
    'Experiment / Why camera separation matters',
    'An ideal pinhole stereo pair with a one-pixel disparity uncertainty. This is geometry, not an Atlas evaluation.',
    [
      r('baseline', 'Camera separation', 0.1, 2, 0.1, 0.5, ' m'),
      r('depth', 'Point depth', 1, 20, 0.5, 8, ' m'),
      r('focal', 'Focal length', 400, 1600, 100, 800, ' px')
    ]
  ),
  'view-coverage': def(
    'Experiment / More views still leave unseen space',
    'Cameras face outward from one location. Marked arcs are directions within at least one field of view. Occlusion and depth are omitted.',
    [
      r('cameras', 'Evenly spaced views', 1, 8, 1, 3),
      r('fov', 'Field of view per camera', 30, 180, 5, 70, '°')
    ]
  ),
  'action-chunks': def(
    'Experiment / Chunk length changes response time',
    'A 50 Hz first-order controller follows a target that moves after one second. It refreshes its target only between chunks.',
    [
      r('chunk', 'Steps between observations', 1, 32, 1, 8),
      r('delay', 'Observation delay', 0, 200, 20, 80, ' ms')
    ]
  ),
  'robot-memory': def(
    'Experiment / Budget a ten-minute history',
    'Dense frames cost 256 tokens at 2 frames/s. Event summaries cost 32 tokens each. Summary content quality is outside this calculation.',
    [
      r('recent', 'Recent frames retained', 1, 30, 1, 10, ' s'),
      r('interval', 'Seconds per older summary', 1, 60, 1, 20, ' s')
    ]
  ),
  'robot-data': def(
    'Experiment / Audit the usable data mixture',
    'A fixed 1,000-episode dataset. Real episodes pass the authored validity check 90% of the time; synthetic validity is adjustable.',
    [
      r('real', 'Real share of the dataset', 10, 100, 5, 30, '%'),
      r('valid', 'Synthetic validity rate', 20, 100, 5, 80, '%')
    ]
  ),
  'domain-grid': def(
    'Experiment / Separate interpolation from transfer',
    'The outlined training region covers normalized friction and lighting settings. A test point inside that region is still not a success guarantee.',
    [
      r('spread', 'Training half-width', 1, 4, 0.5, 2),
      r('friction', 'Test friction coordinate', 0, 10, 0.5, 8),
      r('lighting', 'Test lighting coordinate', 0, 10, 0.5, 5)
    ]
  ),
  'denoising-grid': def(
    'Experiment / Compare commitment schedules',
    'Eight authored positions become committed across rounds. Numbers identify positions, not model predictions or Mercury internals.',
    [
      r('rounds', 'Denoising rounds', 2, 8, 1, 4),
      s('order', 'Commitment order', ['Left to right', 'Confidence fixture'], 'Confidence fixture')
    ]
  ),
  'denoising-cost': def(
    'Experiment / Count rounds and work separately',
    'Assume 2 ms per autoregressive token and 2 + L/128 ms per full-sequence refinement. These invented costs are not a hardware benchmark.',
    [
      r('length', 'Output positions L', 64, 1024, 64, 512),
      r('steps', 'Full-sequence refinements K', 1, 64, 1, 16)
    ]
  ),
  'selection-noise': def(
    'Experiment / Searching also selects measurement noise',
    'All candidates have the same true 70% success rate. Fixed seeded binomial evaluations produce different development and held-out scores.',
    [
      r('candidates', 'Candidates searched', 2, 256, 2, 64),
      r('cases', 'Cases per evaluation split', 20, 500, 20, 100)
    ]
  ),
  'archive-search': def(
    'Experiment / Retaining weak stepping stones',
    'Both searches use the same one-dimensional fitness function and 0.05 mutations. Archive search retains every distinct visited point.',
    [r('trials', 'Mutation attempts', 2, 80, 2, 20)]
  ),
  'speech-timing': def(
    'Experiment / Latency is a sequence of waits',
    'A toy speech path uses adjustable lookahead, 60 ms compute, then a playback buffer. Network, overlap, and jitter are omitted.',
    [
      r('lookahead', 'Future audio required', 40, 500, 20, 160, ' ms'),
      r('buffer', 'Playback buffer', 40, 500, 20, 120, ' ms')
    ]
  ),
  'music-timing': def(
    'Experiment / Time bins move musical events',
    'Eight fixed note onsets are rounded to the nearest time bin. Dashed marks show the original times; solid marks show rounded times.',
    [
      r('bin', 'Time bin width', 5, 100, 5, 40, ' ms'),
      r('tempo', 'Performance tempo', 60, 180, 10, 120, ' bpm')
    ]
  ),
  'sequence-scaling': def(
    'Experiment / Context length changes the work proxy',
    'Compare L² with L log₂ L, plotted on a base-10 log scale. Constants, layers, hardware, and implementation costs are omitted.',
    [r('power', 'Sequence length exponent', 6, 20, 1, 16)]
  ),
  'sequence-score': def(
    'Experiment / A sequence score depends on its window',
    'An invented central log-likelihood ratio is added to a small difference at every flanking position. No biological sequence or predictor is used.',
    [
      r('alt', 'Central alternative probability', 0.01, 0.99, 0.01, 0.6),
      r('flank', 'Mean flank log-score difference', -0.02, 0.02, 0.001, -0.005),
      r('window', 'Scored positions', 8, 128, 8, 64)
    ]
  ),
  'dynamics-drift': def(
    'Experiment / Small dynamics errors compound',
    'A one-dimensional system accelerates for five steps and then coasts. The learned model and reference use different drag coefficients.',
    [
      r('drag', 'Model drag', 0, 0.4, 0.01, 0.08),
      r('reference', 'Reference drag', 0, 0.4, 0.01, 0.12),
      r('horizon', 'Rollout steps', 5, 60, 1, 30)
    ]
  ),
  'model-planner': def(
    'Experiment / A planner trusts its model',
    'Choose an action in [0, 2] to reach position 1. The actual gain is 1; the planner uses an adjustable gain and a 0.05 a² effort cost.',
    [
      r('gain', 'Predicted action gain', 0.2, 2, 0.1, 0.5),
      r('candidates', 'Equally spaced action candidates', 2, 64, 2, 16)
    ]
  ),
  'cache-transfer': def(
    'Experiment / Move a prefix or recompute it',
    'An FP16 KV cache with 32 layers, 8 KV heads and head width 128. Transfer adds 0.2 ms setup. No measured Dynamo throughput is implied.',
    [
      r('tokens', 'Reusable prefix length', 256, 32768, 256, 8192),
      r('bandwidth', 'Effective transfer bandwidth', 5, 100, 5, 25, ' GB/s'),
      r('rate', 'Prefill recomputation rate', 1000, 100000, 1000, 20000, ' tokens/s')
    ]
  ),
  'cache-routing': def(
    'Experiment / Cache affinity competes with the queue',
    'Worker A reuses part of a 100 ms prefill. Worker B is cold with a fixed 20 ms queue. Only queue and prefill are counted.',
    [
      r('hit', 'Prefix reused at worker A', 0, 100, 5, 80, '%'),
      r('queue', 'Worker A queue', 0, 200, 5, 100, ' ms')
    ]
  ),
  'verifier-noise': def(
    'Experiment / Inspect what a reward accepts',
    'Exactly 700 of 1,000 synthetic answers are correct. Verifier false positives reward some wrong answers; false negatives reject some correct answers.',
    [
      r('fpr', 'Wrong answers accepted', 0, 30, 1, 10, '%'),
      r('fnr', 'Correct answers rejected', 0, 30, 1, 5, '%')
    ]
  ),
  'rl-pipeline': def(
    'Experiment / Allocate eight training GPUs',
    'Generation costs 1,000 tokens/s/GPU; learning costs 4,000. Each batch has 64 responses and 2 s verification. Ideal overlap ignores policy staleness.',
    [
      r('generation', 'GPUs for generation', 1, 7, 1, 4),
      r('length', 'Tokens per response', 256, 8192, 256, 2048),
      r('sync', 'Weight synchronization overhead', 0, 10, 0.5, 2, ' s')
    ]
  ),
  'tile-reuse': def(
    'Experiment / Count reuse before writing a kernel',
    'Compute C = AB for one square output tile with two-byte elements. Count A, B and one C write once; double-buffer A and B in shared memory.',
    [
      s('size', 'Output tile side M = N', ['16', '32', '64', '128'], '64'),
      r('depth', 'Reduction tile K', 16, 256, 16, 64),
      s('budget', 'Shared-memory budget KiB', ['64', '128', '256'], '128')
    ]
  ),
  'kernel-pipeline': def(
    'Experiment / Overlap loading and arithmetic',
    'One load engine and one compute engine process independent tiles with two buffers. Transfers and compute each serialize within their own lane.',
    [
      r('tiles', 'Tiles', 2, 12, 1, 6),
      r('load', 'Load time per tile', 1, 10, 1, 4, ' µs'),
      r('compute', 'Compute time per tile', 1, 10, 1, 6, ' µs')
    ]
  )
}
export const frontierDefaults = (kind: FrontierKind): LabValues =>
  Object.fromEntries(FRONTIER_LABS[kind].controls.map((c) => [c.key, c.value]))
const f = (x: number, n = 2) =>
  Number(x.toFixed(n)).toLocaleString('en-US', { maximumFractionDigits: n })
const metric = (label: string, value: string | number) => ({ label, value: String(value) })
export function stereoDepth(baseline: number, depth: number, focal: number) {
  return {
    disparity: (focal * baseline) / depth,
    uncertainty: (depth * depth) / (focal * baseline)
  }
}
export function actionTrace(chunk: number, delay: number) {
  let x = 0,
    cached = 0
  const points: Point[] = []
  let error = 0
  for (let t = 0; t <= 150; t++) {
    if (t % chunk === 0) cached = t - delay / 20 >= 50 ? 1 : 0
    x += 0.15 * (cached - x)
    points.push({ x: t / 50, y: x })
    error += (x - (t >= 50 ? 1 : 0)) ** 2
  }
  return { points, rmse: Math.sqrt(error / 151), calls: Math.floor(150 / chunk) + 1 }
}
export function historyBudget(recent: number, interval: number) {
  const dense = 600 * 2 * 256,
    frames = recent * 2 * 256,
    summaries = Math.ceil((600 - recent) / interval) * 32
  return { dense, frames, summaries, total: frames + summaries }
}
export function seededScore(candidate: number, cases: number, split: number) {
  let seed = (candidate + 1) * 7919 + split * 104729
  let correct = 0
  for (let i = 0; i < cases; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    if (seed / 2 ** 32 < 0.7) correct++
  }
  return correct / cases
}
export function searchSelection(candidates: number, cases: number) {
  let winner = 0
  const development: Point[] = [],
    heldout: Point[] = []
  for (let i = 0; i < candidates; i++) {
    if (seededScore(i, cases, 0) > seededScore(winner, cases, 0)) winner = i
    development.push({ x: i + 1, y: seededScore(winner, cases, 0) * 100 })
    heldout.push({ x: i + 1, y: seededScore(winner, cases, 1) * 100 })
  }
  return { winner, development, heldout }
}
export function archiveSearch(trials: number) {
  const fitness = (x: number) =>
    Math.exp(-((x - 0.25) ** 2) / 0.01) + 1.5 * Math.exp(-((x - 0.8) ** 2) / 0.01)
  let greedy = 0.15
  const archive = [0.15]
  let head = 0
  const visited = new Set([3])
  for (let i = 0; i < trials; i++) {
    const g = Math.max(0, Math.min(1, greedy + (i % 2 === 0 ? 0.05 : -0.05)))
    if (fitness(g) > fitness(greedy)) greedy = g
    const parent = archive[Math.min(head, archive.length - 1)]
    const code = Math.round((parent + (i % 2 === 0 ? 0.05 : -0.05)) * 20)
    if (code >= 0 && code <= 20 && !visited.has(code)) {
      visited.add(code)
      archive.push(code / 20)
    }
    if (i % 2) head++
  }
  return { fitness, greedy, archive }
}
export function dynamics(drag: number, horizon: number) {
  let x = 0,
    v = 0
  const points: Point[] = [{ x: 0, y: 0 }]
  for (let t = 0; t < horizon; t++) {
    x += v
    v = (1 - drag) * v + (t < 5 ? 1 : 0)
    points.push({ x: t + 1, y: x })
  }
  return points
}
export function planAction(gain: number, candidates: number) {
  const actions = Array.from({ length: candidates }, (_, i) => (2 * i) / (candidates - 1))
  const cost = (a: number, g: number) => (g * a - 1) ** 2 + 0.05 * a * a
  const choose = (g: number) =>
    actions.reduce((best, a) => (cost(a, g) < cost(best, g) ? a : best), actions[0])
  const chosen = choose(gain),
    oracle = choose(1)
  return { actions, cost, chosen, oracle, regret: cost(chosen, 1) - cost(oracle, 1) }
}
export function cacheCosts(tokens: number, bandwidth: number, rate: number) {
  return {
    bytes: tokens * 131072,
    transfer: ((tokens * 131072) / (bandwidth * 1e9)) * 1000 + 0.2,
    recompute: (tokens / rate) * 1000
  }
}
export function rewardCounts(fpr: number, fnr: number) {
  const correct = 700 * (1 - fnr / 100),
    wrong = (300 * fpr) / 100
  return {
    correct,
    wrong,
    rejected: 1000 - correct - wrong,
    precision: correct / (correct + wrong)
  }
}
export function tileBudget(size: number, depth: number) {
  const flops = 2 * size * size * depth,
    bytes = 2 * (2 * size * depth + size * size),
    shared = 2 * 2 * (2 * size * depth)
  return { flops, bytes, shared, intensity: flops / bytes }
}
export function pipelineTimes(tiles: number, load: number, compute: number) {
  return {
    serial: tiles * (load + compute),
    overlap: load + compute + (tiles - 1) * Math.max(load, compute)
  }
}
function timeline(
  width: number,
  rows: { label: string; start: number; end: number; secondary?: boolean }[],
  max: number,
  unit: string
) {
  const left = 64,
    right = width - 16,
    span = right - left
  let svg = svgStart(
    width,
    64 + rows.length * 36,
    `Timeline in ${unit}. ${rows.map((row) => `${row.label} ${f(row.start)} to ${f(row.end)}`).join('; ')}`
  )
  svg += `<text x="${left}" y="16">0</text><text x="${right}" y="16" text-anchor="end">${f(max)} ${unit}</text>`
  rows.forEach((row, i) => {
    const y = 28 + i * 36
    svg += `<text x="0" y="${y + 17}">${row.label}</text><path class="grid" d="M${left} ${y + 26}H${right}"/><rect class="bar ${row.secondary ? 'secondary-fill' : ''}" x="${left + (span * row.start) / max}" y="${y + 3}" width="${Math.max(1, (span * (row.end - row.start)) / max)}" height="20"><title>${row.label}: ${f(row.start)} to ${f(row.end)} ${unit}</title></rect>`
  })
  return svg + '</svg>'
}
export function renderFrontierLab(
  kind: FrontierKind,
  input: LabValues = frontierDefaults(kind),
  requestedWidth = 520
): LabState {
  const width = Math.max(240, requestedWidth),
    v = { ...frontierDefaults(kind), ...input },
    n = (key: string) => Number(v[key])
  const state = (
    chart: string,
    metrics: LabState['metrics'],
    detail: string,
    legend?: string
  ): LabState => ({ chart, metrics, detail, legend })
  switch (kind) {
    case 'stereo-depth': {
      const b = n('baseline'),
        z = n('depth'),
        focal = n('focal'),
        a = stereoDepth(b, z, focal)
      return state(
        lineChart(
          width,
          [
            {
              label: 'Depth uncertainty',
              points: Array.from({ length: 40 }, (_, i) => ({
                x: (i + 1) / 2,
                y: stereoDepth(b, (i + 1) / 2, focal).uncertainty
              }))
            }
          ],
          [0, 20],
          [0, Math.max(0.1, stereoDepth(b, 20, focal).uncertainty)],
          'Depth / m',
          'First-order uncertainty / m',
          z
        ),
        [
          metric('Disparity', `${f(a.disparity)} px`),
          metric('Depth uncertainty', `${f(a.uncertainty, 3)} m`)
        ],
        'σZ ≈ Z² σd / (f B), with σd = 1 px. Small-error approximation; texture, calibration, and correspondence failures are omitted.'
      )
    }
    case 'view-coverage': {
      const count = n('cameras'),
        fov = n('fov')
      let covered = 0
      const cx = width / 2,
        cy = 132,
        rad = Math.min(width / 2 - 26, 88)
      let chart = svgStart(
        width,
        264,
        '360 angular bins. Thick segments are observed directions; thin segments are unseen.'
      )
      for (let d = 0; d < 360; d++) {
        const seen = Array.from(
          { length: count },
          (_, i) => Math.abs(((d - (i * 360) / count + 540) % 360) - 180) <= fov / 2
        ).some(Boolean)
        if (seen) covered++
        const a = (d * Math.PI) / 180,
          b = ((d + 0.8) * Math.PI) / 180
        chart += `<path class="${seen ? 'series' : 'grid'}" d="M${cx + rad * Math.cos(a)} ${cy + rad * Math.sin(a)}L${cx + rad * Math.cos(b)} ${cy + rad * Math.sin(b)}"/>`
      }
      for (let i = 0; i < count; i++) {
        const a = (i * 2 * Math.PI) / count
        chart += `<path class="guide" d="M${cx} ${cy}L${cx + rad * Math.cos(a)} ${cy + rad * Math.sin(a)}"/>`
      }
      chart += `<circle class="bar" cx="${cx}" cy="${cy}" r="4"/></svg>`
      return state(
        chart,
        [
          metric('Directions covered', `${f(covered / 3.6, 1)}%`),
          metric('Unseen angular bins', 360 - covered)
        ],
        'Angular union only, sampled in one-degree bins. Looking in every direction does not reveal the back of an occluding object.',
        'Solid arcs: within a view. Faint arcs: unseen. Dashed lines: camera headings.'
      )
    }
    case 'action-chunks': {
      const a = actionTrace(n('chunk'), n('delay'))
      return state(
        lineChart(
          width,
          [
            {
              label: 'Desired target',
              points: [
                { x: 0, y: 0 },
                { x: 0.999, y: 0 },
                { x: 1, y: 1 },
                { x: 3, y: 1 }
              ],
              dashed: true
            },
            { label: 'Controller position', points: a.points }
          ],
          [0, 3],
          [0, 1.1],
          'Time / s',
          'Position'
        ),
        [
          metric('Tracking RMSE', f(a.rmse, 3)),
          metric('Observation calls', a.calls),
          metric('Chunk duration', `${f(n('chunk') * 20, 0)} ms`)
        ],
        'x[t+1] = x[t] + 0.15 × (cached target − x[t]). This fixture exposes observation cadence; it does not implement a learned robot policy.',
        'Solid: controller. Dashed: target.'
      )
    }
    case 'robot-memory': {
      const a = historyBudget(n('recent'), n('interval'))
      return state(
        bars(
          width,
          [
            { label: 'Dense history', value: a.dense, secondary: true },
            { label: 'Recent frames', value: a.frames },
            { label: 'Older summaries', value: a.summaries }
          ],
          'tokens'
        ),
        [
          metric('Compact total', f(a.total, 0)),
          metric('Dense / compact', `${f(a.dense / a.total)}×`)
        ],
        'Recent frames and older summaries cover disjoint time spans. A smaller token budget says nothing about whether a summary retained the fact the next action needs.'
      )
    }
    case 'robot-data': {
      const real = n('real') * 10,
        goodReal = real * 0.9,
        goodSynthetic = ((1000 - real) * n('valid')) / 100
      return state(
        bars(
          width,
          [
            { label: 'Valid real', value: goodReal },
            { label: 'Valid synthetic', value: goodSynthetic, secondary: true },
            { label: 'Rejected', value: 1000 - goodReal - goodSynthetic }
          ],
          'episodes'
        ),
        [
          metric('Usable episodes', f(goodReal + goodSynthetic, 0)),
          metric('Usable real share', `${f((100 * goodReal) / (goodReal + goodSynthetic), 1)}%`)
        ],
        'The validity rule is authored. Repeated trajectories may be valid yet add little independent information. This is data accounting, not a predicted learning curve.'
      )
    }
    case 'domain-grid': {
      const left = 48,
        right = width - 16,
        top = 30,
        bottom = 220,
        x = (a: number) => left + (a / 10) * (right - left),
        y = (a: number) => bottom - (a / 10) * (bottom - top),
        spread = n('spread')
      let chart = svgStart(
        width,
        264,
        'Training region in friction and lighting coordinates with a held-out test point.'
      )
      for (let i = 0; i <= 10; i++)
        chart += `<path class="grid" d="M${x(i)} ${top}V${bottom}M${left} ${y(i)}H${right}"/>`
      chart += `<rect class="frame" x="${x(5 - spread)}" y="${y(5 + spread)}" width="${x(2 * spread) - x(0)}" height="${y(0) - y(2 * spread)}"/><circle class="bar" cx="${x(n('friction'))}" cy="${y(n('lighting'))}" r="6"/><text x="${left}" y="16">Lighting / 0–10</text><text x="${right}" y="250" text-anchor="end">Friction / 0–10</text></svg>`
      const inside = Math.abs(n('friction') - 5) <= spread && Math.abs(n('lighting') - 5) <= spread
      return state(
        chart,
        [
          metric('Training area', `${f((2 * spread) ** 2)} / 100`),
          metric('Test location', inside ? 'Inside range' : 'Outside range')
        ],
        'The rectangle marks parameter support, not learned competence. Hold out combinations and real measurements even when each individual parameter is familiar.',
        'Outlined rectangle: training range. Filled point: test condition.'
      )
    }
    case 'denoising-grid': {
      const rounds = n('rounds'),
        order = v.order === 'Left to right' ? [0, 1, 2, 3, 4, 5, 6, 7] : [2, 5, 0, 7, 3, 1, 6, 4],
        left = 44,
        cell = (width - left - 12) / 8
      let chart = svgStart(
        width,
        48 + (rounds + 1) * 28,
        'Commitment grid by refinement round. Filled cells are committed positions; numbers identify those positions.'
      )
      for (let row = 0; row <= rounds; row++) {
        chart += `<text x="0" y="${row * 28 + 39}">r${row}</text>`
        for (let col = 0; col < 8; col++) {
          const committed = order.indexOf(col) < Math.ceil((row * 8) / rounds)
          chart += `<rect class="${committed ? 'bar' : 'frame'}" opacity="${committed ? '0.18' : '1'}" x="${left + col * cell}" y="${row * 28 + 22}" width="${cell - 3}" height="23"/><text x="${left + (col + 0.5) * cell - 1}" y="${row * 28 + 39}" text-anchor="middle">${committed ? col + 1 : '·'}</text>`
        }
      }
      chart += '</svg>'
      return state(
        chart,
        [metric('Positions', 8), metric('Refinement rounds', rounds)],
        'This schedule commits positions permanently. Real diffusion decoders can revise or remask positions, use blocks, or use other schedules. A committed token can still be wrong.'
      )
    }
    case 'denoising-cost': {
      const l = n('length'),
        k = n('steps'),
        ar = 2 * l,
        diff = k * (2 + l / 128)
      return state(
        bars(
          width,
          [
            { label: 'Autoregressive', value: ar, secondary: true },
            { label: 'Refinement', value: diff }
          ],
          'ms'
        ),
        [
          metric('Assumed latency ratio', `${f(ar / diff)}×`),
          metric('Positions processed', `${f(k * l, 0)} vs ${f(l, 0)}`)
        ],
        'Full-sequence updates expose more parallel work but may perform much more total computation. KV caching, sparse updates, quality, and first-token streaming are excluded.'
      )
    }
    case 'selection-noise': {
      const a = searchSelection(n('candidates'), n('cases'))
      return state(
        lineChart(
          width,
          [
            { label: 'Best development', points: a.development },
            { label: 'Winner held-out', points: a.heldout, dashed: true }
          ],
          [1, n('candidates')],
          [0, 100],
          'Candidates searched',
          'Success / %'
        ),
        [
          metric('Winning candidate', a.winner + 1),
          metric('True success rate', '70%'),
          metric('Final dev score', `${f(a.development.at(-1)!.y, 1)}%`)
        ],
        'Each candidate is equally capable by construction. Development and held-out use independent seeded draws. Searching more candidates can improve the selected development score without improving true ability.',
        'Solid: best development score. Dashed: that winner on held-out cases.'
      )
    }
    case 'archive-search': {
      const a = archiveSearch(n('trials'))
      return state(
        lineChart(
          width,
          [
            {
              label: 'Fitness',
              points: Array.from({ length: 101 }, (_, i) => ({ x: i / 100, y: a.fitness(i / 100) }))
            },
            {
              label: 'Archived points',
              points: a.archive.map((x) => ({ x, y: a.fitness(x) })),
              dots: true
            },
            {
              label: 'Greedy endpoint',
              points: [{ x: a.greedy, y: a.fitness(a.greedy) }],
              dots: true,
              dashed: true
            }
          ],
          [0, 1],
          [0, 1.6],
          'Program coordinate',
          'Authored fitness'
        ),
        [
          metric('Greedy best', f(a.fitness(a.greedy), 3)),
          metric('Archive best', f(Math.max(...a.archive.map(a.fitness)), 3)),
          metric('Stored candidates', a.archive.length)
        ],
        'The archive expands parents in discovery order. It pays memory and evaluation costs to cross a low-fitness valley. This one-dimensional construction is not a DGM result.',
        'Line: fitness. Circles: archive. Cross: greedy endpoint.'
      )
    }
    case 'speech-timing': {
      const a = n('lookahead'),
        b = n('buffer')
      return state(
        timeline(
          width,
          [
            { label: 'Listen', start: 0, end: a, secondary: true },
            { label: 'Compute', start: a, end: a + 60 },
            { label: 'Buffer', start: a + 60, end: a + 60 + b, secondary: true }
          ],
          a + 60 + b,
          'ms'
        ),
        [
          metric('Sequential start delay', `${a + 60 + b} ms`),
          metric('Queued audio to discard', `${b} ms`)
        ],
        'Lookahead, model compute, and playback queues are distinct waits. Real streaming can overlap them. Interruptions also need detection, cancellation, and removal of queued samples.'
      )
    }
    case 'music-timing': {
      const bin = n('bin'),
        tempo = n('tempo'),
        times = [0.07, 0.43, 0.99, 1.55, 2.1, 2.48, 3.04, 3.71].map((t) => (t * 60) / tempo),
        rounded = times.map((t) => (Math.round((t * 1000) / bin) * bin) / 1000),
        left = 32,
        right = width - 16,
        max = (4 * 60) / tempo + 0.1
      let chart = svgStart(
        width,
        272,
        'Eight note onsets. Original onsets are dashed; quantized onsets are solid.'
      )
      times.forEach((t, i) => {
        const yy = 24 + i * 26,
          x = (a: number) => left + (a / max) * (right - left)
        chart += `<text x="0" y="${yy + 14}">${i + 1}</text><path class="grid" d="M${left} ${yy + 20}H${right}"/><path class="series secondary" d="M${x(t)} ${yy}v18"/><path class="series" d="M${x(rounded[i])} ${yy}v18"><title>Note ${i + 1}: ${f(t * 1000)} to ${f(rounded[i] * 1000)} ms</title></path>`
      })
      chart += `<text x="${left}" y="258">0 s</text><text x="${right}" y="258" text-anchor="end">${f(max)} s</text></svg>`
      return state(
        chart,
        [
          metric(
            'Max onset shift',
            `${f(Math.max(...times.map((t, i) => Math.abs(t - rounded[i]))) * 1000)} ms`
          ),
          metric('Rounding bound', `${bin / 2} ms`)
        ],
        'This only tests timing resolution. Pitch, instrumentation, note duration, missed notes, and expressive interpretation require separate transcription metrics.',
        'Dashed: authored onset. Solid: nearest time-bin onset.'
      )
    }
    case 'sequence-scaling': {
      const power = n('power'),
        l = 2 ** power
      return state(
        lineChart(
          width,
          [
            {
              label: 'Quadratic',
              points: Array.from({ length: power - 5 }, (_, i) => ({
                x: i + 6,
                y: Math.log10((2 ** (i + 6)) ** 2)
              }))
            },
            {
              label: 'L log L',
              points: Array.from({ length: power - 5 }, (_, i) => ({
                x: i + 6,
                y: Math.log10(2 ** (i + 6) * (i + 6))
              })),
              dashed: true
            }
          ],
          [6, Math.max(7, power)],
          [0, 13],
          'log₂ sequence length',
          'log₁₀ work proxy'
        ),
        [metric('Sequence positions', f(l, 0)), metric('Proxy ratio', `${f(l / power)}×`)],
        'These are asymptotic operation proxies with unit constants. Evo 2 uses a hybrid architecture; neither curve is its measured runtime or full training-memory cost.',
        'Solid: L². Dashed: L log₂ L.'
      )
    }
    case 'sequence-score': {
      const central = Math.log(n('alt') / (1 - n('alt'))),
        flank = (n('window') - 1) * n('flank'),
        total = central + flank
      return state(
        bars(
          width,
          [
            { label: 'Central change', value: central },
            { label: 'Flank sum', value: flank, secondary: true },
            { label: 'Whole window', value: total }
          ],
          'log-score difference',
          Math.min(0, central, flank, total)
        ),
        [metric('Window score', f(total, 3)), metric('Central score', f(central, 3))],
        'A likelihood ratio is a model preference under a scoring procedure. It is not a causal effect, a functional assay, or a clinical classification. The flank effect here is deliberately invented.'
      )
    }
    case 'dynamics-drift': {
      const ref = dynamics(n('reference'), n('horizon')),
        model = dynamics(n('drag'), n('horizon'))
      return state(
        lineChart(
          width,
          [
            { label: 'Reference', points: ref, dashed: true },
            { label: 'Model', points: model }
          ],
          [0, n('horizon')],
          [0, Math.max(1, ...ref.map((p) => p.y), ...model.map((p) => p.y))],
          'Rollout step',
          'Position'
        ),
        [metric('Final position error', f(Math.abs(ref.at(-1)!.y - model.at(-1)!.y)))],
        'Update x with the current velocity, then update v = (1 − drag) v + a. Long-horizon accuracy needs its own test even when short clips appear plausible.',
        'Solid: learned-model fixture. Dashed: reference dynamics.'
      )
    }
    case 'model-planner': {
      const a = planAction(n('gain'), n('candidates'))
      return state(
        lineChart(
          width,
          [
            {
              label: 'Predicted objective',
              points: a.actions.map((x) => ({ x, y: a.cost(x, n('gain')) }))
            },
            {
              label: 'Actual objective',
              points: a.actions.map((x) => ({ x, y: a.cost(x, 1) })),
              dashed: true
            }
          ],
          [0, 2],
          [
            0,
            Math.max(
              ...a.actions.map((x) => a.cost(x, n('gain'))),
              ...a.actions.map((x) => a.cost(x, 1))
            )
          ],
          'Action',
          'Cost',
          a.chosen
        ),
        [
          metric('Chosen action', f(a.chosen, 3)),
          metric('Actual position', f(a.chosen, 3)),
          metric('Actual regret', f(a.regret, 3))
        ],
        'Regret compares the model-selected action with the best of the same candidate actions under the actual dynamics. Search cannot repair a wrong action-response model.',
        'Solid: predicted cost. Dashed: actual cost. Vertical guide: chosen action.'
      )
    }
    case 'cache-transfer': {
      const a = cacheCosts(n('tokens'), n('bandwidth'), n('rate'))
      return state(
        bars(
          width,
          [
            { label: 'Transfer cache', value: a.transfer },
            { label: 'Recompute', value: a.recompute, secondary: true }
          ],
          'ms'
        ),
        [
          metric('Prefix KV bytes', `${f(a.bytes / 2 ** 20)} MiB`),
          metric('Lower estimated cost', a.transfer < a.recompute ? 'Transfer' : 'Recompute')
        ],
        'Bytes per token = 2 × layers × KV heads × head width × 2 bytes. Effective bandwidth includes the assumed transport path, not a GPU interconnect headline rate.'
      )
    }
    case 'cache-routing': {
      const a = n('queue') + 100 * (1 - n('hit') / 100)
      return state(
        bars(
          width,
          [
            { label: 'Warm worker A', value: a },
            { label: 'Cold worker B', value: 120, secondary: true }
          ],
          'ms'
        ),
        [
          metric('Chosen worker', a <= 120 ? 'A' : 'B'),
          metric('Warm prefill saved', `${n('hit')} ms`)
        ],
        'The toy assumes linear prefill savings, equal output generation, and no transfer overhead. A production scheduler also needs admission control, fairness, and changing queue estimates.'
      )
    }
    case 'verifier-noise': {
      const a = rewardCounts(n('fpr'), n('fnr'))
      return state(
        bars(
          width,
          [
            { label: 'Correct reward', value: a.correct },
            { label: 'Wrong reward', value: a.wrong, secondary: true },
            { label: 'Rejected', value: a.rejected }
          ],
          'answers'
        ),
        [
          metric('Reward precision', `${f(a.precision * 100, 1)}%`),
          metric('Correct accepted', `${100 - n('fnr')}%`)
        ],
        'The base correctness rate is fixed. During training the policy can change and discover verifier weaknesses, so a static confusion matrix is only a starting diagnostic.'
      )
    }
    case 'rl-pipeline': {
      const g = n('generation'),
        tokens = 64 * n('length'),
        gen = tokens / (g * 1000),
        learn = tokens / ((8 - g) * 4000),
        overhead = 2 + n('sync')
      return state(
        bars(
          width,
          [
            { label: 'Generation', value: gen },
            { label: 'Learning', value: learn, secondary: true },
            { label: 'Serial batch', value: gen + learn + overhead },
            { label: 'Ideal overlap', value: Math.max(gen, learn) + overhead, secondary: true }
          ],
          's'
        ),
        [
          metric('Learner GPUs', 8 - g),
          metric('Bottleneck', gen > learn ? 'Generation' : 'Learning')
        ],
        'Ideal steady-state overlap takes max(generation, learning). It omits startup, changing sequence lengths, communication contention, and any loss of quality from stale policies.'
      )
    }
    case 'tile-reuse': {
      const a = tileBudget(n('size'), n('depth')),
        budget = n('budget') * 1024
      return state(
        bars(
          width,
          [
            { label: 'A + B + C', value: a.bytes / 1024 },
            { label: 'Two A/B buffers', value: a.shared / 1024, secondary: true },
            { label: 'SMEM budget', value: budget / 1024 }
          ],
          'KiB'
        ),
        [
          metric('Arithmetic intensity', `${f(a.intensity)} FLOP/B`),
          metric('Buffers fit', a.shared <= budget ? 'Yes' : 'No'),
          metric('FLOPs', f(a.flops, 0))
        ],
        'A shared-memory fit is necessary for this buffering scheme. Registers, occupancy, bank conflicts, accumulator precision, synchronization, and instruction support remain unchecked.'
      )
    }
    case 'kernel-pipeline': {
      const tiles = n('tiles'),
        load = n('load'),
        compute = n('compute'),
        a = pipelineTimes(tiles, load, compute)
      let chart = svgStart(
        width,
        152,
        'Two-lane load and compute pipeline. Each rectangle is one tile.'
      )
      const left = 64,
        right = width - 16,
        x = (t: number) => left + (t / a.overlap) * (right - left)
      chart += `<text x="0" y="53">Load</text><text x="0" y="99">Compute</text>`
      let loadEnd = 0,
        computeEnd = 0
      for (let i = 0; i < tiles; i++) {
        const loadStart = Math.max(loadEnd, i >= 2 ? load + (i - 1) * Math.max(load, compute) : 0)
        loadEnd = loadStart + load
        const computeStart = Math.max(loadEnd, computeEnd)
        computeEnd = computeStart + compute
        chart += `<rect class="bar secondary-fill" x="${x(loadStart)}" y="32" width="${Math.max(1, x(loadEnd) - x(loadStart) - 1)}" height="28"><title>Load tile ${i + 1}: ${f(loadStart)}–${f(loadEnd)} µs</title></rect><rect class="bar" x="${x(computeStart)}" y="78" width="${Math.max(1, x(computeEnd) - x(computeStart) - 1)}" height="28"><title>Compute tile ${i + 1}: ${f(computeStart)}–${f(computeEnd)} µs</title></rect>`
      }
      chart += `<text x="${left}" y="136">0</text><text x="${right}" y="136" text-anchor="end">${f(a.overlap)} µs</text></svg>`
      return state(
        chart,
        [
          metric('Serial', `${a.serial} µs`),
          metric('Pipelined', `${a.overlap} µs`),
          metric('Ideal speedup', `${f(a.serial / a.overlap)}×`)
        ],
        'Pipeline time = load + compute + (tiles − 1) × max(load, compute). Real asynchronous copies require supported instructions, correct barriers, and resource checks.'
      )
    }
  }
}
