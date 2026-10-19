/** Deterministic teaching models. No values here are measured model benchmarks. */
export type LabKind =
  | 'rounding'
  | 'clipping'
  | 'groups'
  | 'rescaling'
  | 'memory'
  | 'runtime'
  | 'patching'
  | 'coverage'
  | 'steering'
  | 'monitoring'
  | 'geometry'
  | 'neuron'
  | 'editing'
  | 'locality'

type RangeControl = {
  type: 'range'
  key: string
  label: string
  min: number
  max: number
  step: number
  value: number
  unit?: string
}
type SelectControl = {
  type: 'select'
  key: string
  label: string
  value: string
  options: { value: string; label: string }[]
}
export type LabControl = RangeControl | SelectControl
export type LabValues = Record<string, number | string>
export type Definition = { title: string; description: string; controls: LabControl[] }
const range = (
  key: string,
  label: string,
  min: number,
  max: number,
  step: number,
  value: number,
  unit = ''
): RangeControl => ({ type: 'range', key, label, min, max, step, value, unit })
const select = (key: string, label: string, options: string[], value: string): SelectControl => ({
  type: 'select',
  key,
  label,
  value,
  options: options.map((option) => ({ value: option, label: option }))
})

export const LABS: Record<LabKind, Definition> = {
  rounding: {
    title: '01 / Watch continuous values become discrete levels',
    description:
      'Change the bit width, then move the input. The solid staircase is the decoded value; the dashed line is exact identity.',
    controls: [
      range('bits', 'Stored bits', 2, 8, 1, 4, ' bits'),
      range('input', 'Input value', -2, 2, 0.01, 0.65)
    ]
  },
  clipping: {
    title: '02 / Trade rounding error against clipping error',
    description:
      'A deterministic 64-value example has one outlier at 8. Open circles are original values; crosses are their low-bit reconstructions.',
    controls: [
      range('clip', 'Clipping bound', 0.5, 8, 0.1, 8),
      range('bits', 'Stored bits', 2, 8, 1, 4, ' bits')
    ]
  },
  groups: {
    title: '03 / Limit how many values share an outlier’s scale',
    description:
      'Each bar is one weight’s absolute reconstruction error. Groups use their own maximum absolute value and one FP16 scale.',
    controls: [
      select('group', 'Weights per group', ['4', '8', '16', '32', '64'], '16'),
      range('outlier', 'Last weight magnitude', 1, 12, 0.1, 8)
    ]
  },
  rescaling: {
    title: '04 / Move range between activations and weights',
    description:
      'Four invented channel maxima. Rescaling changes each side of a product while preserving the exact dot product.',
    controls: [range('alpha', 'Rescaling strength α', 0, 1, 0.01, 0.5)]
  },
  memory: {
    title: '05 / Count the bytes beyond the weight codes',
    description:
      'A derived footprint for a hypothetical decoder. The model has 32 layers, 8 KV heads, head width 128, an FP16 cache, and 1 GiB of workspace.',
    controls: [
      range('params', 'Parameters', 1, 70, 1, 8, 'B'),
      range('bits', 'Weight bits', 2, 16, 1, 4, ' bits'),
      select('group', 'Weights per FP16 scale', ['32', '64', '128', '256'], '128'),
      range('context', 'Cached tokens per request', 1, 128, 1, 8, ' × 1024'),
      range('batch', 'Concurrent requests', 1, 8, 1, 1)
    ]
  },
  runtime: {
    title: '06 / Find the bottleneck after compression',
    description:
      'An idealized 8B decoder: 1 TB/s weight bandwidth, 100 TFLOP/s compute, one weight read per batch. KV traffic, metadata, and launch costs are omitted.',
    controls: [
      range('bits', 'Weight bits', 2, 8, 1, 4, ' bits'),
      range('batch', 'Tokens in decode batch', 1, 256, 1, 16),
      range('overhead', 'Added low-bit overhead', 0, 20, 0.1, 0, ' ms')
    ]
  },
  patching: {
    title: 'Experiment / One path can hide another',
    description:
      'A two-path causal toy. Compare restoration through each path and through both; the chart reports the output margin, not a real transformer result.',
    controls: [
      select(
        'rule',
        'How the paths combine',
        ['Additive', 'Redundant', 'Both required'],
        'Redundant'
      ),
      range('strength', 'Restored signal strength', 0, 1, 0.01, 1)
    ]
  },
  coverage: {
    title: 'Experiment / A clean label can still miss positives',
    description:
      'A fixed set of 48 synthetic examples, half positive. Absorption sets some positive examples’ detector activations to zero.',
    controls: [
      range('threshold', 'Detector threshold', 0.05, 0.95, 0.01, 0.5),
      range('absorption', 'Positive examples absorbed', 0, 20, 1, 6, ' of 24')
    ]
  },
  steering: {
    title: 'Experiment / Steering can move a second behavior',
    description:
      'A local linear toy. The target reads the steering direction; a second task reads a direction separated by the angle below.',
    controls: [
      range('alpha', 'Steering coefficient', -3, 3, 0.1, 1),
      range('angle', 'Angle to the second task', 0, 90, 1, 30, '°')
    ]
  },
  monitoring: {
    title: 'Experiment / Disclosure limits the monitor’s recall',
    description:
      'A hypothetical population of 1,000 runs, including 100 shortcut uses. This monitor only detects explicit disclosures.',
    controls: [
      range('disclosure', 'Shortcut uses disclosed', 0, 100, 1, 25, '%'),
      range('sensitivity', 'Disclosures detected', 0, 100, 1, 80, '%'),
      range('falseAlarm', 'False alarm rate on other runs', 0, 20, 1, 5, '%')
    ]
  },
  geometry: {
    title: 'Experiment / Rotate the coordinates, keep the geometry',
    description:
      'Three fixed feature directions in two dimensions. A coordinate rotation changes neuron readouts while preserving all pairwise angles.',
    controls: [
      range('angle', 'Coordinate rotation', 0, 180, 1, 0, '°'),
      select('feature', 'Active feature', ['A', 'B', 'C'], 'A')
    ]
  },
  neuron: {
    title: 'Experiment / The token alone can hide the pattern',
    description:
      'Invented activation examples for a toy closing-delimiter detector. Reveal the surrounding text, then inspect the lower-scoring cases.',
    controls: [
      select('context', 'What the viewer can see', ['Token only', 'Full context'], 'Token only'),
      range('threshold', 'Minimum activation shown', 0, 1, 0.05, 0.65)
    ]
  },
  editing: {
    title: 'Experiment / A rank-one update follows key similarity',
    description:
      'A two-dimensional linear memory. The target key is (1, 0); a neighboring unit key shares the similarity below.',
    controls: [
      range('similarity', 'Neighbor–target similarity', 0, 0.99, 0.01, 0.6),
      range('strength', 'Target update magnitude', 0, 2, 0.05, 1)
    ]
  },
  locality: {
    title: 'Experiment / Protecting a neighbor can amplify another change',
    description:
      'Keep the target update at 1. An optional constraint cancels the update on one neighbor; the orthogonal key can still move.',
    controls: [
      range('similarity', 'Neighbor–target similarity', 0, 0.99, 0.01, 0.6),
      select('protect', 'Preserve the neighbor', ['No', 'Yes'], 'Yes')
    ]
  }
}

export function defaults(kind: LabKind): LabValues {
  return Object.fromEntries(LABS[kind].controls.map((control) => [control.key, control.value]))
}
export const clamp = (value: number, low: number, high: number) =>
  Math.max(low, Math.min(high, value))
export function symmetricQuantize(value: number, bits: number, bound: number) {
  const qmax = 2 ** (bits - 1) - 1
  const scale = bound > 0 ? bound / qmax : 1
  const code = clamp(Math.sign(value) * Math.floor(Math.abs(value / scale) + 0.5), -qmax, qmax)
  return { code, scale, decoded: code * scale, levels: 2 * qmax + 1 }
}
export function toyWeights(outlier = 8) {
  return Array.from({ length: 64 }, (_, i) =>
    i === 63 ? outlier : 0.7 * Math.sin(i * 1.7) + 0.24 * Math.cos(i * 0.47)
  )
}
export function groupQuantize(values: number[], bits: number, group: number) {
  return values.map((value, index) => {
    const start = Math.floor(index / group) * group
    const bound = Math.max(...values.slice(start, start + group).map(Math.abs))
    return symmetricQuantize(value, bits, bound).decoded
  })
}
export const mse = (a: number[], b: number[]) =>
  a.reduce((sum, value, i) => sum + (value - b[i]) ** 2, 0) / a.length
export function memoryBudget(
  params: number,
  bits: number,
  group: number,
  context: number,
  batch: number
) {
  const n = params * 1e9
  // One percent of parameters remain FP16; scales apply only to compressed weights.
  const codes = (n * 0.99 * bits) / 8
  const scales = Math.ceil((n * 0.99) / group) * 2
  const retained = n * 0.01 * 2
  const kv = 2 * 32 * 8 * 128 * 2 * context * 1024 * batch
  const workspace = 2 ** 30
  return {
    codes,
    scales,
    retained,
    kv,
    workspace,
    total: codes + scales + retained + kv + workspace
  }
}
export function runtimeBudget(bits: number, batch: number, overhead: number) {
  const compute = ((2 * 8e9 * batch) / 100e12) * 1000
  const reference = Math.max(((8e9 * 2) / 1e12) * 1000, compute)
  const lowbit = Math.max(((8e9 * bits) / 8 / 1e12) * 1000, compute) + overhead
  return { reference, lowbit, compute, speedup: reference / lowbit }
}
export function patchMargin(rule: string, a: number, b: number) {
  const signal = rule === 'Additive' ? (a + b) / 2 : rule === 'Redundant' ? a + b - a * b : a * b
  return -2 + 6 * signal
}
export function detectorCounts(threshold: number, absorption: number) {
  const counts = { tp: 0, fp: 0, fn: 0, tn: 0 }
  for (let i = 0; i < 48; i++) {
    const positive = i < 24
    const score = positive ? (i < absorption ? 0 : 0.25 + (i % 12) / 16) : 0.05 + (i % 12) / 20
    const detected = score > threshold
    if (positive && detected) counts.tp++
    if (positive && !detected) counts.fn++
    if (!positive && detected) counts.fp++
    if (!positive && !detected) counts.tn++
  }
  return counts
}
export function monitorCounts(disclosure: number, sensitivity: number, falseAlarm: number) {
  const disclosed = disclosure
  const caught = (disclosed * sensitivity) / 100
  const falsePositives = (900 * falseAlarm) / 100
  return {
    disclosed,
    caught,
    missed: 100 - caught,
    falsePositives,
    precision: caught + falsePositives ? caught / (caught + falsePositives) : null
  }
}
export function editEffects(similarity: number, strength: number, protect: boolean) {
  const orthogonal = Math.sqrt(1 - similarity ** 2)
  const v2 = protect ? -similarity / orthogonal : 0
  return {
    target: strength,
    neighbor: protect ? 0 : strength * similarity,
    other: strength * v2,
    norm: Math.abs(strength) * Math.hypot(1, v2)
  }
}

const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char
  )
const fmt = (value: number, digits = 2) =>
  Number(value.toFixed(digits)).toLocaleString('en-US', { maximumFractionDigits: digits })
const gib = (bytes: number) => `${(bytes / 2 ** 30).toFixed(2)} GiB`
const percent = (numerator: number, denominator: number) =>
  denominator ? `${fmt((numerator / denominator) * 100, 1)}%` : 'Undefined'
export type Point = { x: number; y: number }
export type Series = { label: string; points: Point[]; dashed?: boolean; dots?: boolean }
export function svgStart(width: number, height: number, title: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escape(title)}"><title>${escape(title)}</title>`
}
export function lineChart(
  width: number,
  series: Series[],
  xDomain: [number, number],
  yDomain: [number, number],
  xLabel: string,
  yLabel: string,
  guide?: number
) {
  const height = 264,
    left = 48,
    right = width - 16,
    top = 30,
    bottom = height - 44
  const x = (v: number) => left + ((v - xDomain[0]) / (xDomain[1] - xDomain[0])) * (right - left)
  const y = (v: number) => bottom - ((v - yDomain[0]) / (yDomain[1] - yDomain[0])) * (bottom - top)
  let svg = svgStart(
    width,
    height,
    `${yLabel} against ${xLabel}. ${series.map((s) => s.label).join('; ')}.`
  )
  for (let i = 0; i < 4; i++) {
    const xv = xDomain[0] + (i / 3) * (xDomain[1] - xDomain[0])
    const yv = yDomain[0] + (i / 3) * (yDomain[1] - yDomain[0])
    svg += `<path class="grid" d="M${left} ${y(yv)}H${right}"/><text x="${left - 8}" y="${y(yv) + 4}" text-anchor="end">${fmt(yv, 1)}</text><text x="${x(xv)}" y="${bottom + 20}" text-anchor="${i === 0 ? 'start' : i === 3 ? 'end' : 'middle'}">${fmt(xv, 1)}</text>`
  }
  svg += `<rect class="frame" x="${left}" y="${top}" width="${right - left}" height="${bottom - top}"/><text x="${left}" y="16">${escape(yLabel)}</text><text x="${right}" y="${height - 4}" text-anchor="end">${escape(xLabel)}</text>`
  if (guide !== undefined) svg += `<path class="guide" d="M${x(guide)} ${top}V${bottom}"/>`
  for (const s of series) {
    if (!s.dots)
      svg += `<path class="series ${s.dashed ? 'secondary' : ''}" d="${s.points.map((p, i) => `${i ? 'L' : 'M'}${x(p.x).toFixed(2)} ${y(p.y).toFixed(2)}`).join(' ')}"/>`
    if (s.dots)
      for (const p of s.points) {
        const px = x(p.x),
          py = y(p.y)
        svg += s.dashed
          ? `<path class="series" d="M${px - 3} ${py - 3}l6 6m-6 0l6 -6"><title>${escape(s.label)}: ${fmt(p.y, 3)} at ${fmt(p.x)}</title></path>`
          : `<circle class="point" cx="${px}" cy="${py}" r="3"><title>${escape(s.label)}: ${fmt(p.y, 3)} at ${fmt(p.x)}</title></circle>`
      }
  }
  return svg + '</svg>'
}
export type Bar = { label: string; value: number; secondary?: boolean }
export function bars(width: number, values: Bar[], unit: string, min = 0, max?: number) {
  const top = 34,
    bottom = 28,
    row = 48,
    labelWidth = width < 400 ? 112 : 130,
    right = width - 70
  const domainMin = Math.min(min, ...values.map((v) => v.value))
  const domainMax = max ?? Math.max(1, ...values.map((v) => v.value))
  const x = (value: number) =>
    labelWidth + ((value - domainMin) / (domainMax - domainMin)) * (right - labelWidth)
  let svg = svgStart(
    width,
    top + row * values.length + bottom,
    `Comparison in ${unit}. ${values.map((v) => `${v.label}: ${fmt(v.value)}`).join('; ')}.`
  )
  svg += `<text x="${labelWidth}" y="16">${escape(unit)}</text>`
  values.forEach((bar, i) => {
    const yy = top + i * row
    svg += `<text x="0" y="${yy + 18}">${escape(bar.label)}</text><path class="grid" d="M${labelWidth} ${yy + 27}H${right}"/><rect class="bar ${bar.secondary ? 'secondary-fill' : ''}" x="${Math.min(x(0), x(bar.value))}" y="${yy + 4}" width="${Math.max(1, Math.abs(x(bar.value) - x(0)))}" height="22"><title>${escape(bar.label)}: ${fmt(bar.value, 3)} ${escape(unit)}</title></rect><text x="${width - 2}" y="${yy + 18}" text-anchor="end">${fmt(bar.value, 2)}</text>`
  })
  return svg + '</svg>'
}
function vectors(width: number, angle: number, active: string) {
  const height = 268,
    cx = width / 2,
    cy = height / 2,
    radius = Math.min(width / 2 - 38, 90)
  const points = [0, 60, 120].map((deg) => {
    const theta = ((deg - angle) * Math.PI) / 180
    return { x: Math.cos(theta), y: Math.sin(theta) }
  })
  let svg = svgStart(
    width,
    height,
    'Three directions in two dimensions after a coordinate rotation. A–B and B–C have cosine 0.5; A–C has cosine −0.5.'
  )
  svg += `<path class="grid" d="M${cx - radius - 20} ${cy}H${cx + radius + 20}M${cx} ${cy - radius - 20}V${cy + radius + 20}"/><circle class="frame" cx="${cx}" cy="${cy}" r="${radius}"/>`
  points.forEach((p, i) => {
    const selected = String.fromCharCode(65 + i) === active
    const x = cx + p.x * radius,
      y = cy - p.y * radius
    svg += `<path class="series ${selected ? '' : 'secondary'}" d="M${cx} ${cy}L${x} ${y}"/><circle class="${selected ? 'bar' : 'point'}" cx="${x}" cy="${y}" r="5"/><text x="${cx + p.x * (radius + 18)}" y="${cy - p.y * (radius + 18) + 4}" text-anchor="middle">${String.fromCharCode(65 + i)}</text>`
  })
  return { svg: svg + '</svg>', points }
}

export type LabState = {
  chart: string
  metrics: { label: string; value: string }[]
  detail: string
  legend?: string
}
export function renderLab(
  kind: LabKind,
  input: LabValues = defaults(kind),
  requestedWidth = 520
): LabState {
  // Normalize at the model boundary as well as relying on native input constraints.
  const v = { ...defaults(kind) }
  for (const control of LABS[kind].controls) {
    const raw = input[control.key]
    if (control.type === 'range') {
      const parsed = Number(raw)
      v[control.key] = Number.isFinite(parsed)
        ? clamp(parsed, control.min, control.max)
        : control.value
    } else if (control.options.some((option) => option.value === raw)) v[control.key] = String(raw)
  }
  const n = (key: string) => Number(v[key])
  const width = Math.max(240, Math.round(requestedWidth))
  const state: LabState = { chart: '', metrics: [], detail: '' }
  const metric = (label: string, value: string) => state.metrics.push({ label, value })
  if (kind === 'rounding') {
    const q = symmetricQuantize(n('input'), n('bits'), 2)
    const qmax = 2 ** (n('bits') - 1) - 1
    const staircase: Point[] = [{ x: -2, y: -2 }]
    for (let code = -qmax; code < qmax; code++) {
      const boundary = (code + 0.5) * q.scale
      staircase.push({ x: boundary, y: code * q.scale }, { x: boundary, y: (code + 1) * q.scale })
    }
    staircase.push({ x: 2, y: 2 })
    state.chart = lineChart(
      width,
      [
        {
          label: 'Exact',
          dashed: true,
          points: [
            { x: -2, y: -2 },
            { x: 2, y: 2 }
          ]
        },
        {
          label: 'Decoded',
          points: staircase
        },
        { label: 'Selected input', dots: true, points: [{ x: n('input'), y: q.decoded }] }
      ],
      [-2, 2],
      [-2.2, 2.2],
      'Input value',
      'Decoded value',
      n('input')
    )
    metric('Scale / step', fmt(q.scale, 4))
    metric('Integer code', String(q.code))
    metric('Decoded', fmt(q.decoded, 4))
    state.detail = `${q.levels} symmetric levels; one signed code is unused. Absolute error ${fmt(Math.abs(q.decoded - n('input')), 4)}. Rounding ties go away from zero.`
  } else if (kind === 'clipping' || kind === 'groups') {
    const values = toyWeights(kind === 'groups' ? n('outlier') : 8)
    const decoded =
      kind === 'groups'
        ? groupQuantize(values, 4, n('group'))
        : values.map((x) => symmetricQuantize(x, n('bits'), n('clip')).decoded)
    const errors = values.map((value, i) => Math.abs(value - decoded[i]))
    if (kind === 'clipping') {
      state.chart = lineChart(
        width,
        [
          { label: 'Original', dots: true, points: values.map((y, x) => ({ x, y })) },
          { label: 'Decoded', dots: true, dashed: true, points: decoded.map((y, x) => ({ x, y })) }
        ],
        [0, 63],
        [-1.2, 8.5],
        'Weight index',
        'Weight value'
      )
      metric('Clipped values', String(values.filter((x) => Math.abs(x) > n('clip')).length))
      state.legend = '○ Original · × Quantized'
    } else {
      const max = Math.max(0.01, ...errors) * 1.15
      const h = 250,
        l = 48,
        r = width - 16,
        t = 30,
        b = 210,
        bw = (r - l) / 64
      let svg = svgStart(
        width,
        h,
        'Absolute error for each of 64 weights, with dashed group boundaries.'
      )
      svg += `<text x="${l}" y="16">Absolute error</text><path class="grid" d="M${l} ${b}H${r}"/><text x="${l - 8}" y="${t + 5}" text-anchor="end">${fmt(max, 2)}</text><text x="${l - 8}" y="${b + 4}" text-anchor="end">0</text>`
      errors.forEach((e, i) => {
        const hh = (e / max) * (b - t)
        svg += `<rect class="bar" x="${l + i * bw}" y="${b - hh}" width="${Math.max(1, bw - 1)}" height="${hh}"><title>Weight ${i}: error ${fmt(e, 4)}</title></rect>`
        if (i % n('group') === 0) svg += `<path class="guide" d="M${l + i * bw} ${t}V${b}"/>`
      })
      state.chart =
        svg +
        `<text x="${l}" y="230">0</text><text x="${r}" y="230" text-anchor="end">63</text><text x="${r}" y="247" text-anchor="end">Weight index</text></svg>`
      metric('Scale overhead', `${fmt(16 / n('group'), 2)} bits/weight`)
    }
    metric('All-value MSE', fmt(mse(values, decoded), 4))
    metric('Non-outlier MSE', fmt(mse(values.slice(0, -1), decoded.slice(0, -1)), 4))
    state.detail =
      kind === 'groups'
        ? `One outlier shares a scale with ${n('group') - 1} neighbors. Smaller groups cost more scale bytes.`
        : 'Lower bounds can improve small values while clipping the outlier. The total MSE includes that clipped value.'
  } else if (kind === 'rescaling') {
    const activations = [0.5, 0.7, 1, 12],
      weights = [1.5, 0.8, 2, 0.25]
    const scales = activations.map((x, i) => x ** n('alpha') / weights[i] ** (1 - n('alpha')))
    const a = activations.map((x, i) => x / scales[i]),
      w = weights.map((x, i) => x * scales[i])
    const qa = a.map((x) => symmetricQuantize(x, 4, Math.max(...a)).decoded)
    const qw = w.map((x) => symmetricQuantize(x, 4, Math.max(...w)).decoded)
    const exact = activations.reduce((sum, x, i) => sum + x * weights[i], 0)
    const approximated = qa.reduce((sum, x, i) => sum + x * qw[i], 0)
    state.chart = bars(
      width,
      a.flatMap((x, i) => [
        { label: `Ch ${i + 1} · X′`, value: x },
        { label: `Ch ${i + 1} · W′`, value: w[i], secondary: true }
      ]),
      'Magnitude'
    )
    metric('Exact dot product', fmt(exact, 3))
    metric('4-bit dot product', fmt(approximated, 3))
    metric('Absolute error', fmt(Math.abs(approximated - exact), 3))
    state.detail =
      'Solid bars: rescaled activations. Outlined bars: rescaled weights. Each side uses one symmetric 4-bit scale. This is a toy, not a SmoothQuant reproduction.'
  } else if (kind === 'memory') {
    const m = memoryBudget(n('params'), n('bits'), n('group'), n('context'), n('batch'))
    state.chart = bars(
      width,
      [
        { label: 'Weight codes', value: m.codes / 2 ** 30 },
        { label: 'FP16 scales', value: m.scales / 2 ** 30, secondary: true },
        { label: 'Retained FP16', value: m.retained / 2 ** 30, secondary: true },
        { label: 'KV cache', value: m.kv / 2 ** 30 },
        { label: 'Workspace', value: 1, secondary: true }
      ],
      'GiB, shared scale'
    )
    metric('Total resident estimate', gib(m.total))
    metric('Stored weight payload', gib(m.codes + m.scales + m.retained))
    metric(
      'Effective weight bits',
      fmt(((m.codes + m.scales + m.retained) * 8) / (n('params') * 1e9), 3)
    )
    state.detail =
      'Assumes 1% of weights stay FP16 and one FP16 scale per group for the rest. No zero points, packing padding, fragmentation, or offload. Cache geometry stays fixed when parameters change.'
  } else if (kind === 'runtime') {
    const m = runtimeBudget(n('bits'), n('batch'), n('overhead'))
    const batches = Array.from({ length: 129 }, (_, i) => 2 ** (i / 16))
    state.chart = lineChart(
      width,
      [
        {
          label: 'FP16 lower bound',
          dashed: true,
          points: batches.map((batch) => ({
            x: Math.log2(batch),
            y: runtimeBudget(n('bits'), batch, n('overhead')).reference
          }))
        },
        {
          label: 'Low-bit plus overhead',
          points: batches.map((batch) => ({
            x: Math.log2(batch),
            y: runtimeBudget(n('bits'), batch, n('overhead')).lowbit
          }))
        }
      ],
      [0, 8],
      [0, Math.max(44, 41 + n('overhead'))],
      'log₂(batch), 0=1, 8=256',
      'Decode step, ms',
      Math.log2(n('batch'))
    )
    metric('FP16 step', `${fmt(m.reference)} ms`)
    metric('Low-bit step', `${fmt(m.lowbit)} ms`)
    metric('Modeled speed ratio', `${fmt(m.speedup)}×`)
    state.legend = 'Dashed: FP16 · Solid: low-bit + overhead'
    state.detail =
      'Analytical bound, not a hardware benchmark. Compute throughput is held constant; native low-bit kernels can change it. Ratios below 1 mean the modeled low-bit path is slower.'
  } else if (kind === 'patching') {
    const strength = n('strength')
    const single = patchMargin(String(v.rule), strength, 0),
      joint = patchMargin(String(v.rule), strength, strength)
    state.chart = bars(
      width,
      [
        { label: 'No patch', value: -2 },
        { label: 'Path A only', value: single },
        { label: 'Path B only', value: single, secondary: true },
        { label: 'Both paths', value: joint }
      ],
      'Output logit margin',
      -2,
      4
    )
    metric('Single-path recovery', percent(single + 2, 6))
    metric('Joint recovery', percent(joint + 2, 6))
    state.detail =
      'Reference margin 4; contrast margin −2. Recovery is relative to that six-unit gap. The combination rule is chosen by you, not inferred from the chart.'
  } else if (kind === 'coverage') {
    const c = detectorCounts(n('threshold'), n('absorption'))
    state.chart = bars(
      width,
      [
        { label: 'True positive', value: c.tp },
        { label: 'False negative', value: c.fn, secondary: true },
        { label: 'False positive', value: c.fp, secondary: true },
        { label: 'True negative', value: c.tn }
      ],
      'Examples',
      0,
      24
    )
    metric('Precision', percent(c.tp, c.tp + c.fp))
    metric('Recall', percent(c.tp, 24))
    metric('Missed positives', `${c.fn} / 24`)
    state.detail =
      'The underlying labels remain fixed. A threshold change alters the detector, not whether the synthetic concept is present.'
  } else if (kind === 'steering') {
    const other = n('alpha') * Math.cos((n('angle') * Math.PI) / 180)
    state.chart = bars(
      width,
      [
        { label: 'Target task', value: n('alpha') },
        { label: 'Second task', value: other, secondary: true }
      ],
      'Local score change',
      -3,
      3
    )
    metric('Target change', fmt(n('alpha')))
    metric('Second-task change', fmt(other))
    metric('Direction overlap', fmt(Math.cos((n('angle') * Math.PI) / 180)))
    state.detail =
      'This assumes two linear readers and a fixed gradient. Orthogonality prevents this particular linear spillover, not all nonlinear interactions.'
  } else if (kind === 'monitoring') {
    const c = monitorCounts(n('disclosure'), n('sensitivity'), n('falseAlarm'))
    state.chart = bars(
      width,
      [
        { label: 'Shortcut uses', value: 100 },
        { label: 'Disclosed', value: c.disclosed, secondary: true },
        { label: 'Caught', value: c.caught },
        { label: 'Missed', value: c.missed, secondary: true },
        { label: 'False alarms', value: c.falsePositives, secondary: true }
      ],
      'Expected runs',
      0,
      Math.max(100, c.falsePositives)
    )
    metric('Overall recall', `${fmt(c.caught)}%`)
    metric('Alert precision', c.precision === null ? 'Undefined' : `${fmt(c.precision * 100, 1)}%`)
    metric('True alerts', `${fmt(c.caught)} / 1,000`)
    state.detail =
      'The detector is assumed to have no signal on undisclosed shortcuts. Expected counts can be fractional. A different monitor could detect more than explicit disclosures.'
  } else if (kind === 'geometry') {
    const chart = vectors(width, n('angle'), String(v.feature))
    const point = chart.points[['A', 'B', 'C'].indexOf(String(v.feature))]
    state.chart = chart.svg
    metric('Neuron 1 readout', fmt(point.x, 3))
    metric('Neuron 2 readout', fmt(point.y, 3))
    metric('A–B cosine', '0.5')
    state.detail =
      'This rotates a linear coordinate system. An elementwise nonlinearity in a real network can privilege its native basis; arbitrary rotation need not preserve that network.'
  } else if (kind === 'neuron') {
    const examples = [
      ['a', 'print(a → next: )', 0.98],
      ['x', 'f(x → next: )', 0.91],
      ['b', 'items[b → next: ]', 0.85],
      ['7', 'pair(7 → next: )', 0.72],
      ['x', 'x + y → next: +', 0.43],
      ['a', 'a cat → next: sleeps', 0.12],
      ['7', 'route 7 → next: ends', 0.05]
    ]
    const rows = examples.filter((row) => Number(row[2]) >= n('threshold'))
    state.chart = `<div class="sample-list" role="table" aria-label="Synthetic activation examples"><div role="row"><b role="columnheader">${v.context === 'Full context' ? 'Context → continuation' : 'Visible token'}</b><b role="columnheader">Score</b></div>${rows.map((row) => `<div role="row"><code role="cell">${escape(String(row[v.context === 'Full context' ? 1 : 0]))}</code><span role="cell">${Number(row[2]).toFixed(2)}</span></div>`).join('')}</div>`
    metric('Visible examples', String(rows.length))
    metric('Fixture size', String(examples.length))
    state.detail =
      'These values are authored fixtures. Revealing context changes what you can infer, not the detector activations. Lowering the threshold exposes a false positive.'
  } else {
    const m = editEffects(
      n('similarity'),
      kind === 'editing' ? n('strength') : 1,
      kind === 'locality' && v.protect === 'Yes'
    )
    state.chart = bars(
      width,
      [
        { label: 'Target key', value: m.target },
        { label: 'Neighbor key', value: m.neighbor, secondary: true },
        { label: 'Orthogonal key', value: m.other, secondary: true }
      ],
      'Output change',
      Math.min(0, m.other)
    )
    metric('Target change', fmt(m.target))
    metric('Neighbor change', fmt(m.neighbor))
    metric('Update norm', fmt(m.norm))
    state.detail =
      kind === 'editing'
        ? 'The update is ΔW = u·vᵀ with v = (1, 0). A neighboring key moves in proportion to its dot product with v. This is not a ROME implementation.'
        : 'Canceling one neighbor uses v = (1, −ρ/√(1−ρ²)). Near-parallel keys require a larger update and amplify changes on the orthogonal key.'
  }
  return state
}
