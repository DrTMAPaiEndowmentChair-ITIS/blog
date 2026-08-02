import { POST_CATEGORIES, type PostCategory } from '@/data/taxonomy'

/**
 * Deterministic generative artwork for post thumbnails.
 *
 * Every post gets a drawing seeded from its slug, so the same post always
 * renders the same art. The category selects the motif family; the slug hash
 * selects the instance within that family. Output is stroke-only SVG using
 * `currentColor`, so it inherits the monochrome theme tokens and needs no
 * separate light/dark palette.
 */

export type ThumbnailVariant = 'row' | 'card' | 'feature' | 'banner' | 'og'

interface VariantGeometry {
  /** viewBox width in drawing units */
  w: number
  /** viewBox height in drawing units */
  h: number
  /** Scales how many marks a motif emits. 1 is full detail. */
  density: number
  /** Rendered stroke width. Device pixels for SVG (non-scaling), units for raster. */
  stroke: number
  /** Multiplies every mark's opacity. Keeps OG backgrounds from fighting the title. */
  fade: number
  /** When true, strokes scale with the viewBox instead of staying hairline. */
  scaleStroke: boolean
}

const VARIANTS: Record<ThumbnailVariant, VariantGeometry> = {
  row: { w: 120, h: 80, density: 0.4, stroke: 1, fade: 1, scaleStroke: false },
  card: { w: 160, h: 90, density: 1, stroke: 1, fade: 1, scaleStroke: false },
  // Composed for the taller lead slot in the hero mosaic, so it isn't a
  // crop of the 16:9 card.
  feature: { w: 160, h: 120, density: 1.2, stroke: 1, fade: 1, scaleStroke: false },
  banner: { w: 320, h: 80, density: 1, stroke: 1, fade: 1, scaleStroke: false },
  // The social card's masthead strip. Same 4:1-ish proportion as the banner on
  // the post page itself, drawn at full strength because nothing sits on top of
  // it — the title lives below the strip, not behind it.
  og: { w: 1200, h: 168, density: 1, stroke: 1.6, fade: 1, scaleStroke: true }
}

// ---------------------------------------------------------------------------
// Seeded randomness
// ---------------------------------------------------------------------------

const fnv1a = (input: string): number => {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

type Rng = {
  /** Float in [0, 1) */
  next: () => number
  /** Float in [min, max) */
  range: (min: number, max: number) => number
  /** Integer in [min, max] */
  int: (min: number, max: number) => number
  /** True with probability p */
  chance: (p: number) => boolean
  /** Uniform pick from a non-empty list */
  pick: <T>(items: readonly T[]) => T
}

const createRng = (seed: number): Rng => {
  let state = seed || 1
  const next = () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const range = (min: number, max: number) => min + next() * (max - min)
  return {
    next,
    range,
    int: (min, max) => Math.floor(range(min, max + 1)),
    chance: (p) => next() < p,
    pick: (items) => items[Math.floor(next() * items.length)] as (typeof items)[number]
  }
}

// ---------------------------------------------------------------------------
// Mark emitters
// ---------------------------------------------------------------------------

const round = (value: number) => Math.round(value * 100) / 100

interface MarkContext {
  stroke: number
  fade: number
  scaleStroke: boolean
}

const strokeAttrs = (ctx: MarkContext, opacity: number, width = 1) => {
  const w = ctx.scaleStroke ? ctx.stroke * width : width
  const vectorEffect = ctx.scaleStroke ? '' : ' vector-effect="non-scaling-stroke"'
  return `stroke="currentColor" stroke-width="${round(w)}" stroke-opacity="${round(
    Math.min(1, opacity * ctx.fade)
  )}" fill="none"${vectorEffect}`
}

const fillAttrs = (ctx: MarkContext, opacity: number) =>
  `fill="currentColor" fill-opacity="${round(Math.min(1, opacity * ctx.fade))}"`

const line = (ctx: MarkContext, x1: number, y1: number, x2: number, y2: number, o: number, w = 1) =>
  `<line x1="${round(x1)}" y1="${round(y1)}" x2="${round(x2)}" y2="${round(y2)}" ${strokeAttrs(ctx, o, w)}/>`

const path = (ctx: MarkContext, d: string, o: number, w = 1) =>
  `<path d="${d}" ${strokeAttrs(ctx, o, w)} stroke-linecap="round" stroke-linejoin="round"/>`

const rect = (
  ctx: MarkContext,
  x: number,
  y: number,
  w: number,
  h: number,
  o: number,
  filled = false
) => {
  const geo = `x="${round(x)}" y="${round(y)}" width="${round(Math.max(0, w))}" height="${round(Math.max(0, h))}"`
  return filled ? `<rect ${geo} ${fillAttrs(ctx, o)}/>` : `<rect ${geo} ${strokeAttrs(ctx, o)}/>`
}

const dot = (ctx: MarkContext, cx: number, cy: number, r: number, o: number) =>
  `<circle cx="${round(cx)}" cy="${round(cy)}" r="${round(r)}" ${fillAttrs(ctx, o)}/>`

// ---------------------------------------------------------------------------
// Motifs — one per category
// ---------------------------------------------------------------------------

type Motif = (rng: Rng, geo: VariantGeometry, ctx: MarkContext) => string[]

/**
 * Flip a drawing horizontally about half the time. Only worth applying to
 * motifs with no inherent left-to-right meaning — a mirrored loss curve would
 * read as loss climbing, so those keep their direction.
 */
const mirror = (rng: Rng, geo: VariantGeometry, marks: string[]): string[] =>
  rng.chance(0.45)
    ? [`<g transform="translate(${round(geo.w)} 0) scale(-1 1)">${marks.join('')}</g>`]
    : marks

/**
 * Models & Training — a comb of tokens routed into a small bank of experts.
 * One expert is the focal "selected" cell: the paths that reach it are drawn
 * up, everything else recedes. That hierarchy is what keeps it from reading
 * like a flat diagram.
 */
const routing: Motif = (rng, geo, ctx) => {
  const marks: string[] = []
  const padX = geo.w * 0.11
  const padY = geo.h * 0.16
  const innerH = geo.h - padY * 2
  const tokenX = padX
  const tickW = geo.w * 0.035
  const expertW = geo.w * 0.085
  const expertX = geo.w - padX - expertW

  const tokenCount = Math.min(14, Math.max(4, Math.round(rng.int(6, 11) * geo.density)))
  const expertCount = Math.max(
    2,
    Math.min(5, Math.round(rng.int(2, 5) * Math.min(1, geo.density * 1.6)))
  )
  const focal = rng.int(0, expertCount - 1)
  // Layout knobs, so nine posts in this family don't all draw the same fan.
  const clustered = rng.chance(0.4)
  const straightEdges = rng.chance(0.35)
  const spread = rng.range(0.72, 1)

  const tokenTop = padY + (innerH - innerH * spread) / 2
  const tokens = Array.from({ length: tokenCount }, (_, i) => {
    const t = i / Math.max(1, tokenCount - 1)
    // Clustered layouts bunch tokens toward the middle instead of spacing them
    // evenly, which changes the silhouette of the comb entirely.
    const offset = clustered ? (t - 0.5) * Math.abs(t - 0.5) * 2 + 0.5 : t
    return {
      y: tokenTop + innerH * spread * offset,
      w: tickW * rng.range(0.45, 1.15)
    }
  })

  const slotH = innerH / expertCount
  const experts = Array.from({ length: expertCount }, (_, i) => {
    const h = slotH * rng.range(0.38, 0.8)
    return { y: padY + slotH * i + (slotH - h) / 2, h }
  })

  // Edges first so the nodes sit on top of them.
  tokens.forEach((token, i) => {
    const targets = new Set<number>([rng.int(0, expertCount - 1)])
    if (rng.chance(0.3)) targets.add(rng.int(0, expertCount - 1))
    // Guarantee the focal expert actually attracts traffic.
    if (i % 3 === 0) targets.add(focal)

    for (const index of targets) {
      const expert = experts[index]
      if (!expert) continue
      const x0 = tokenX + token.w
      const y0 = token.y
      const y1 = expert.y + expert.h / 2
      const opacity = index === focal ? 0.4 : 0.13
      if (straightEdges) {
        marks.push(line(ctx, x0, y0, expertX, y1, opacity))
      } else {
        const bend = x0 + (expertX - x0) * rng.range(0.4, 0.65)
        marks.push(
          path(
            ctx,
            `M${round(x0)} ${round(y0)} C${round(bend)} ${round(y0)} ${round(bend)} ${round(y1)} ${round(expertX)} ${round(y1)}`,
            opacity
          )
        )
      }
    }
  })

  for (const token of tokens) {
    marks.push(line(ctx, tokenX, token.y, tokenX + token.w, token.y, 0.5))
  }

  experts.forEach((expert, i) => {
    if (i === focal) marks.push(rect(ctx, expertX, expert.y, expertW, expert.h, 0.13, true))
    marks.push(rect(ctx, expertX, expert.y, expertW, expert.h, i === focal ? 0.85 : 0.32))
  })

  return mirror(rng, geo, marks)
}

/**
 * Inference & Deployment — a staggered pipeline schedule. Bars cascade down and
 * to the right the way stages actually slide across time, over a faint tick grid.
 */
const pipeline: Motif = (rng, geo, ctx) => {
  const marks: string[] = []
  const padX = geo.w * 0.09
  const padY = geo.h * 0.16
  const usableW = geo.w - padX * 2
  const innerH = geo.h - padY * 2
  const rowCount = Math.max(4, Math.min(11, Math.round(rng.int(6, 8) * geo.density)))
  const rowH = innerH / rowCount
  const barH = Math.min(rowH * 0.5, geo.h * 0.075)
  const radius = barH / 2
  const focal = rng.int(0, rowCount - 1)

  // Tick grid sits underneath everything as the time axis.
  const ticks = 5
  for (let t = 1; t < ticks; t += 1) {
    const x = padX + (usableW * t) / ticks
    marks.push(line(ctx, x, padY, x, geo.h - padY, 0.07))
  }

  for (let i = 0; i < rowCount; i += 1) {
    const y = padY + rowH * i + (rowH - barH) / 2
    // Each stage starts later than the one above it — the cascade is the point.
    let cursor = padX + usableW * (i / rowCount) * rng.range(0.45, 0.7)
    const segments = rng.int(1, 3)

    for (let s = 0; s < segments; s += 1) {
      const remaining = padX + usableW - cursor
      if (remaining <= usableW * 0.05) break
      const width = Math.min(usableW * rng.range(0.16, 0.32), remaining)
      const isFocal = i === focal && s === 0
      const geoAttrs = `x="${round(cursor)}" y="${round(y)}" width="${round(width)}" height="${round(barH)}" rx="${round(radius)}"`
      if (isFocal || rng.chance(0.34)) {
        marks.push(`<rect ${geoAttrs} ${fillAttrs(ctx, isFocal ? 0.55 : 0.16)}/>`)
      }
      marks.push(`<rect ${geoAttrs} ${strokeAttrs(ctx, isFocal ? 0.85 : 0.42)}/>`)
      cursor += width + usableW * rng.range(0.035, 0.08)
    }
  }

  return marks
}

/**
 * Hardware & Systems — Manhattan traces routed across a grid with pads at the
 * ends and vias at the turns. One net is live; the rest are substrate.
 */
const circuit: Motif = (rng, geo, ctx) => {
  const marks: string[] = []
  const padX = geo.w * 0.07
  const padY = geo.h * 0.12
  const innerW = geo.w - padX * 2
  const innerH = geo.h - padY * 2
  const cols = 10
  const rows = 6
  const cellW = innerW / cols
  const cellH = innerH / rows
  const traceCount = Math.max(3, Math.min(9, Math.round(rng.int(4, 6) * geo.density)))
  const live = rng.int(0, traceCount - 1)
  const padSize = Math.min(cellW, cellH) * 0.3

  for (let t = 0; t < traceCount; t += 1) {
    let gx = 0
    let gy = rng.int(0, rows)
    const points: Array<[number, number]> = [[gx, gy]]

    while (gx < cols) {
      gx = Math.min(cols, gx + rng.int(2, 4))
      points.push([gx, gy])
      if (gx >= cols) break
      gy = Math.max(0, Math.min(rows, gy + rng.int(1, 2) * (rng.chance(0.5) ? 1 : -1)))
      points.push([gx, gy])
    }

    const px = (x: number) => padX + x * cellW
    const py = (y: number) => padY + y * cellH
    const isLive = t === live
    const d = points
      .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${round(px(x))} ${round(py(y))}`)
      .join(' ')
    marks.push(path(ctx, d, isLive ? 0.8 : rng.range(0.16, 0.3)))

    // Pads terminate the net so traces don't just fall off the edge.
    const first = points[0]
    const last = points[points.length - 1]
    for (const end of [first, last]) {
      if (!end) continue
      marks.push(
        rect(
          ctx,
          px(end[0]) - padSize / 2,
          py(end[1]) - padSize / 2,
          padSize,
          padSize,
          isLive ? 0.8 : 0.28,
          true
        )
      )
    }

    for (let i = 1; i < points.length - 1; i += 2) {
      const point = points[i]
      if (!point || !(isLive || rng.chance(0.4))) continue
      marks.push(dot(ctx, px(point[0]), py(point[1]), padSize * 0.42, isLive ? 0.7 : 0.25))
    }
  }

  return marks
}

/**
 * Ecosystems & Tooling — recursive binary subdivision into packed modules.
 * A single anchor cell carries the weight; the rest are outlines and nested
 * insets, so the map has a focal point instead of uniform grey.
 */
const modules: Motif = (rng, geo, ctx) => {
  const cells: Array<{ x: number; y: number; w: number; h: number }> = []
  const inset = Math.min(geo.w, geo.h) * 0.08
  const maxDepth = Math.max(2, Math.round(3 + geo.density))
  // Without a floor the random stop can fire at depth 0 and emit a single
  // empty rectangle, so every drawing subdivides at least this far.
  const minDepth = Math.min(3, maxDepth)
  const gap = Math.min(geo.w, geo.h) * 0.028
  // Derived from the shorter side so wide banners keep subdividing instead of
  // stalling into a picket fence of full-height columns.
  const minSide = Math.min(geo.w, geo.h) * 0.16

  const split = (x: number, y: number, w: number, h: number, depth: number) => {
    if (
      w < minSide ||
      h < minSide ||
      depth >= maxDepth ||
      (depth >= minDepth && rng.chance(0.24))
    ) {
      cells.push({ x, y, w, h })
      return
    }
    const horizontal = w >= h
    const t = rng.range(0.36, 0.64)
    if (horizontal) {
      const cut = w * t
      split(x, y, cut - gap / 2, h, depth + 1)
      split(x + cut + gap / 2, y, w - cut - gap / 2, h, depth + 1)
    } else {
      const cut = h * t
      split(x, y, w, cut - gap / 2, depth + 1)
      split(x, y + cut + gap / 2, w, h - cut - gap / 2, depth + 1)
    }
  }

  split(inset, inset, geo.w - inset * 2, geo.h - inset * 2, 0)

  // The anchor is the largest cell, so the focal point is compositional rather
  // than random — it lands wherever the subdivision left the most room.
  let anchor = 0
  cells.forEach((cell, i) => {
    const best = cells[anchor]
    if (best && cell.w * cell.h > best.w * best.h) anchor = i
  })

  const marks: string[] = []
  cells.forEach((cell, i) => {
    const isAnchor = i === anchor
    if (isAnchor) marks.push(rect(ctx, cell.x, cell.y, cell.w, cell.h, 0.16, true))
    else if (rng.chance(0.22)) marks.push(rect(ctx, cell.x, cell.y, cell.w, cell.h, 0.07, true))
    marks.push(rect(ctx, cell.x, cell.y, cell.w, cell.h, isAnchor ? 0.7 : 0.34))

    // A nested inset reads as a module containing something.
    const pad = Math.min(cell.w, cell.h) * 0.22
    if (rng.chance(isAnchor ? 0.9 : 0.28) && cell.w - pad * 2 > 1 && cell.h - pad * 2 > 1) {
      marks.push(
        rect(
          ctx,
          cell.x + pad,
          cell.y + pad,
          cell.w - pad * 2,
          cell.h - pad * 2,
          isAnchor ? 0.45 : 0.2
        )
      )
    }
  })

  return marks
}

/**
 * Models & Training — an attention matrix. Cell weight varies, and roughly half
 * the time it's causally masked so the upper triangle drops out.
 */
const attention: Motif = (rng, geo, ctx) => {
  const marks: string[] = []
  const inset = Math.min(geo.w, geo.h) * 0.12
  const innerW = geo.w - inset * 2
  const innerH = geo.h - inset * 2
  const rows = Math.max(4, Math.min(14, Math.round(rng.int(6, 9) * geo.density)))
  const cell = innerH / rows
  const cols = Math.max(3, Math.floor(innerW / cell))
  const gridW = cols * cell
  const originX = inset + (innerW - gridW) / 2
  const causal = rng.chance(0.5)
  const gap = cell * 0.14

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      // Diagonal band carries the most weight, which is what attention
      // actually looks like — falls off with distance.
      const diag = Math.abs(c - (r * cols) / rows) / cols
      if (causal && c > (r + 1) * (cols / rows)) continue
      const weight = Math.max(0, 1 - diag * rng.range(1.6, 3.2))
      if (weight < 0.06) continue
      marks.push(
        rect(
          ctx,
          originX + c * cell,
          inset + r * cell,
          cell - gap,
          cell - gap,
          0.1 + weight * 0.62,
          true
        )
      )
    }
  }

  marks.push(rect(ctx, originX, inset, gridW, rows * cell, 0.22))
  return marks
}

/**
 * Models & Training — a family of loss curves decaying to a floor, one run
 * emphasised against the rest.
 */
const curves: Motif = (rng, geo, ctx) => {
  const marks: string[] = []
  const padX = geo.w * 0.1
  const padY = geo.h * 0.14
  const innerW = geo.w - padX * 2
  const innerH = geo.h - padY * 2
  const count = Math.max(2, Math.min(8, Math.round(rng.int(2, 6) * geo.density)))
  const focal = rng.int(0, count - 1)
  const steps = 30
  // Loss decaying to a floor, or a metric saturating toward a ceiling. Same
  // machinery, mirrored vertically, and they read as different charts.
  const rising = rng.chance(0.4)
  const gridded = rng.chance(0.4)

  if (gridded) {
    for (let g = 1; g < 4; g += 1) {
      const y = padY + (innerH * g) / 4
      marks.push(line(ctx, padX, y, geo.w - padX, y, 0.07))
    }
  }

  const baseline = rising ? padY + innerH * 0.94 : padY + innerH * 0.92
  marks.push(line(ctx, padX, baseline, geo.w - padX, baseline, 0.14))

  for (let i = 0; i < count; i += 1) {
    const decay = rng.range(1.8, 6)
    const start = rng.range(0.04, 0.26)
    const end = rng.range(0.7, 0.94)
    const noise = rng.range(0.004, 0.026)
    const points: string[] = []

    for (let s = 0; s <= steps; s += 1) {
      const t = s / steps
      const eased = start + (end - start) * (1 - Math.exp(-decay * t)) + rng.range(-noise, noise)
      const y = rising ? 1 - eased : eased
      points.push(`${s === 0 ? 'M' : 'L'}${round(padX + innerW * t)} ${round(padY + innerH * y)}`)
    }
    marks.push(path(ctx, points.join(' '), i === focal ? 0.8 : 0.2))
  }

  return marks
}

/**
 * Inference & Deployment — generated tokens streaming out row by row, with the
 * cursor position marked. Rows ragged like real decode lengths.
 */
const stream: Motif = (rng, geo, ctx) => {
  const marks: string[] = []
  const padX = geo.w * 0.09
  const padY = geo.h * 0.15
  const innerW = geo.w - padX * 2
  const rowCount = Math.max(3, Math.min(10, Math.round(rng.int(5, 7) * geo.density)))
  const rowH = (geo.h - padY * 2) / rowCount
  const tokenH = Math.min(rowH * 0.5, geo.h * 0.07)
  const unit = innerW / 18
  const cursorRow = rng.int(0, rowCount - 1)

  for (let r = 0; r < rowCount; r += 1) {
    const y = padY + rowH * r + (rowH - tokenH) / 2
    let x = padX
    const limit = padX + innerW * rng.range(0.45, 1)

    while (x < limit) {
      const w = unit * rng.range(0.7, 2.4)
      if (x + w > padX + innerW) break
      const isCursor = r === cursorRow && x + w * 2 > limit
      marks.push(
        `<rect x="${round(x)}" y="${round(y)}" width="${round(w)}" height="${round(tokenH)}" rx="${round(tokenH * 0.35)}" ${
          isCursor ? fillAttrs(ctx, 0.72) : fillAttrs(ctx, rng.range(0.12, 0.34))
        }/>`
      )
      x += w + unit * 0.35
    }
  }

  return marks
}

/**
 * Inference & Deployment — a right-skewed latency distribution with a tail
 * marker, which is the shape every serving graph actually has.
 */
const histogram: Motif = (rng, geo, ctx) => {
  const marks: string[] = []
  const padX = geo.w * 0.1
  const padY = geo.h * 0.16
  const innerW = geo.w - padX * 2
  const innerH = geo.h - padY * 2
  const bars = Math.max(6, Math.min(26, Math.round(rng.int(10, 15) * geo.density)))
  const slot = innerW / bars
  const gap = slot * 0.28
  const peak = rng.range(0.18, 0.32)
  const spread = rng.range(0.1, 0.2)
  const baseY = padY + innerH

  for (let i = 0; i < bars; i += 1) {
    const t = i / (bars - 1)
    // Log-normal-ish: fast rise, long tail.
    const shape = Math.exp(-Math.pow(Math.log((t + 0.02) / peak), 2) / (2 * spread))
    const h = innerH * Math.max(0.04, shape * rng.range(0.82, 1)) * 0.92
    marks.push(rect(ctx, padX + i * slot, baseY - h, slot - gap, h, 0.3, true))
  }

  // Tail marker out in the p99 region.
  const markerX = padX + innerW * rng.range(0.72, 0.88)
  marks.push(line(ctx, markerX, padY * 0.6, markerX, baseY, 0.7))
  marks.push(line(ctx, padX, baseY, geo.w - padX, baseY, 0.35))
  return marks
}

/**
 * Hardware & Systems — a die floorplan: a repeated compute array alongside a
 * few larger fixed-function blocks.
 */
const floorplan: Motif = (rng, geo, ctx) => {
  const marks: string[] = []
  const inset = Math.min(geo.w, geo.h) * 0.1
  const innerW = geo.w - inset * 2
  const innerH = geo.h - inset * 2
  const arrayW = innerW * rng.range(0.5, 0.66)

  // Repeated core array.
  const cell = Math.min(arrayW / rng.int(5, 8), innerH / rng.int(3, 5))
  const cols = Math.max(2, Math.floor(arrayW / cell))
  const rows = Math.max(2, Math.floor(innerH / cell))
  const gap = cell * 0.18
  const hot = { r: rng.int(0, rows - 1), c: rng.int(0, cols - 1) }

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const x = inset + c * cell
      const y = inset + r * cell
      const isHot = r === hot.r && c === hot.c
      if (isHot) marks.push(rect(ctx, x, y, cell - gap, cell - gap, 0.45, true))
      marks.push(rect(ctx, x, y, cell - gap, cell - gap, isHot ? 0.8 : 0.3))
    }
  }

  // Fixed-function blocks down the right edge.
  const blockX = inset + cols * cell + gap
  const blockW = geo.w - inset - blockX
  if (blockW > innerW * 0.08) {
    const blocks = rng.int(2, 4)
    let y = inset
    for (let b = 0; b < blocks; b += 1) {
      const h = (innerH / blocks) * rng.range(0.72, 0.96)
      marks.push(rect(ctx, blockX, y, blockW, h, 0.1, true))
      marks.push(rect(ctx, blockX, y, blockW, h, 0.4))
      y += innerH / blocks
    }
  }

  return mirror(rng, geo, marks)
}

/**
 * Hardware & Systems — the memory hierarchy as nested bands, fastest innermost,
 * with bus lines reaching out to the edge.
 */
const hierarchy: Motif = (rng, geo, ctx) => {
  const marks: string[] = []
  const levels = rng.int(3, 5)
  const maxW = geo.w * rng.range(0.72, 0.9)
  const maxH = geo.h * rng.range(0.7, 0.88)
  // Nesting either shrinks about the centre or collapses toward one corner —
  // two quite different silhouettes from the same idea.
  const cornered = rng.chance(0.45)
  const anchorX = cornered ? rng.pick([0, 1]) : 0.5
  const anchorY = cornered ? rng.pick([0, 1]) : 0.5
  const originX = (geo.w - maxW) / 2
  const originY = (geo.h - maxH) / 2
  const shrink = rng.range(0.62, 0.8)

  let w = maxW
  let h = maxH
  for (let i = 0; i < levels; i += 1) {
    const x = originX + (maxW - w) * anchorX
    const y = originY + (maxH - h) * anchorY
    const innermost = i === levels - 1
    if (innermost) marks.push(rect(ctx, x, y, w, h, 0.4, true))
    marks.push(rect(ctx, x, y, w, h, innermost ? 0.8 : 0.18 + i * 0.12))
    w *= shrink
    h *= shrink
  }

  // Buses leaving the outermost band, along one axis or both.
  const axis = rng.pick(['h', 'v', 'both'] as const)
  const buses = rng.int(2, 4)
  for (let b = 0; b < buses; b += 1) {
    const spanY = originY + maxH * ((b + 1) / (buses + 1))
    const spanX = originX + maxW * ((b + 1) / (buses + 1))
    if (axis === 'h' || axis === 'both') {
      marks.push(line(ctx, 0, spanY, originX, spanY, 0.25))
      marks.push(line(ctx, originX + maxW, spanY, geo.w, spanY, 0.25))
    }
    if (axis === 'v' || axis === 'both') {
      marks.push(line(ctx, spanX, 0, spanX, originY, 0.25))
      marks.push(line(ctx, spanX, originY + maxH, spanX, geo.h, 0.25))
    }
  }

  return marks
}

/**
 * Ecosystems & Tooling — a layered dependency graph, one path through it lit up.
 */
const graph: Motif = (rng, geo, ctx) => {
  const marks: string[] = []
  const padX = geo.w * 0.11
  const padY = geo.h * 0.15
  const innerW = geo.w - padX * 2
  const innerH = geo.h - padY * 2
  const layers = Math.max(3, Math.min(6, Math.round(rng.int(3, 4) * Math.min(1.5, geo.density))))
  const nodeW = Math.min(innerW / (layers * 2.4), geo.w * 0.09)
  const nodeH = Math.min(geo.h * 0.09, innerH * 0.16)

  const columns = Array.from({ length: layers }, (_, l) => {
    const count = rng.int(2, 4)
    const x = padX + (innerW - nodeW) * (l / Math.max(1, layers - 1))
    return Array.from({ length: count }, (_, n) => ({
      x,
      y: padY + (innerH - nodeH) * (count === 1 ? 0.5 : n / (count - 1))
    }))
  })

  // Pick one node per layer as the lit path.
  const litPath = columns.map((col) => rng.int(0, col.length - 1))

  for (let l = 0; l < layers - 1; l += 1) {
    const from = columns[l]
    const to = columns[l + 1]
    if (!from || !to) continue
    from.forEach((a, ai) => {
      to.forEach((b, bi) => {
        if (!(ai === litPath[l] && bi === litPath[l + 1]) && !rng.chance(0.45)) return
        const isLit = ai === litPath[l] && bi === litPath[l + 1]
        const x0 = a.x + nodeW
        const y0 = a.y + nodeH / 2
        const y1 = b.y + nodeH / 2
        const mid = x0 + (b.x - x0) / 2
        marks.push(
          path(
            ctx,
            `M${round(x0)} ${round(y0)} C${round(mid)} ${round(y0)} ${round(mid)} ${round(y1)} ${round(b.x)} ${round(y1)}`,
            isLit ? 0.6 : 0.14
          )
        )
      })
    })
  }

  columns.forEach((col, l) => {
    col.forEach((node, n) => {
      const isLit = n === litPath[l]
      if (isLit) marks.push(rect(ctx, node.x, node.y, nodeW, nodeH, 0.35, true))
      marks.push(rect(ctx, node.x, node.y, nodeW, nodeH, isLit ? 0.85 : 0.34))
    })
  })

  return mirror(rng, geo, marks)
}

/**
 * Ecosystems & Tooling — a stack diagram: slabs of varying subdivision, one
 * layer carrying the weight.
 */
const layers: Motif = (rng, geo, ctx) => {
  const marks: string[] = []
  const padX = geo.w * 0.09
  const padY = geo.h * 0.12
  const innerW = geo.w - padX * 2
  const innerH = geo.h - padY * 2
  const count = Math.max(3, Math.min(8, Math.round(rng.int(4, 6) * Math.min(1.4, geo.density))))
  const slabH = innerH / count
  const vGap = slabH * 0.2
  const focal = rng.int(0, count - 1)

  for (let i = 0; i < count; i += 1) {
    const y = padY + slabH * i
    const h = slabH - vGap
    const segments = rng.int(1, 4)
    const hGap = innerW * 0.014
    let x = padX

    for (let s = 0; s < segments; s += 1) {
      const remaining = padX + innerW - x
      const w = s === segments - 1 ? remaining : remaining * rng.range(0.3, 0.6)
      const isFocal = i === focal
      if (isFocal) marks.push(rect(ctx, x, y, w - hGap, h, 0.2, true))
      marks.push(rect(ctx, x, y, w - hGap, h, isFocal ? 0.75 : 0.3))
      x += w
    }
  }

  return marks
}

/**
 * Serving & Runtime — a paged block table. A logical run of blocks maps to
 * scattered physical pages, which is the one picture that explains why the
 * whole category exists. Free pages stay hollow so occupancy reads at a glance.
 */
const pages: Motif = (rng, geo, ctx) => {
  const marks: string[] = []
  const padX = geo.w * 0.08
  const padY = geo.h * 0.14
  const cols = Math.max(4, Math.min(12, Math.round(rng.int(6, 9) * geo.density)))
  const rows = Math.max(2, Math.round(rng.int(3, 4) * Math.min(1.2, geo.density)))
  const cellW = (geo.w - padX * 2) / cols
  const cellH = (geo.h - padY * 2) / rows
  const gap = Math.min(cellW, cellH) * 0.22

  // Which cells belong to the tracked sequence. Deliberately non-contiguous.
  const owned = new Set<number>()
  const want = Math.max(3, Math.round(cols * rows * rng.range(0.28, 0.42)))
  while (owned.size < want) owned.add(rng.int(0, cols * rows))

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const i = r * cols + c
      const x = padX + c * cellW
      const y = padY + r * cellH
      const held = owned.has(i)
      if (held) marks.push(rect(ctx, x, y, cellW - gap, cellH - gap, 0.24, true))
      marks.push(rect(ctx, x, y, cellW - gap, cellH - gap, held ? 0.7 : 0.26))
    }
  }

  // The block table: a run along the top edge, tying logical order to the grid.
  const tableY = padY * 0.5
  marks.push(line(ctx, padX, tableY, geo.w - padX, tableY, 0.3))
  const ticks = Math.min(want, 5)
  for (let i = 0; i < ticks; i += 1) {
    const x = padX + ((i + 0.5) * (geo.w - padX * 2)) / ticks
    marks.push(line(ctx, x, tableY - cellH * 0.14, x, tableY + cellH * 0.14, 0.55))
  }
  return marks
}

/**
 * Serving & Runtime — request bars on a shared timeline. They start and end at
 * unrelated points, which is the shape continuous batching exploits and static
 * batching wastes.
 */
const requests: Motif = (rng, geo, ctx) => {
  const marks: string[] = []
  const padX = geo.w * 0.08
  const padY = geo.h * 0.16
  const innerW = geo.w - padX * 2
  const lanes = Math.max(3, Math.min(10, Math.round(rng.int(5, 7) * geo.density)))
  const laneH = (geo.h - padY * 2) / lanes
  const barH = laneH * 0.46

  for (let i = 0; i < lanes; i += 1) {
    const y = padY + i * laneH + (laneH - barH) / 2
    const start = rng.range(0, 0.45)
    // Long-tailed lengths: most short, occasionally one that runs to the edge.
    const len = rng.chance(0.22) ? rng.range(0.5, 1 - start) : rng.range(0.12, 0.34)
    const x = padX + innerW * start
    const w = innerW * Math.min(len, 1 - start)
    marks.push(rect(ctx, x, y, w, barH, 0.26, true))
    marks.push(rect(ctx, x, y, w, barH, 0.6))
    // Arrival tick to the left of each bar.
    marks.push(line(ctx, x - laneH * 0.16, y + barH / 2, x, y + barH / 2, 0.4))
  }

  const stepX = padX + innerW * rng.range(0.5, 0.72)
  marks.push(line(ctx, stepX, padY * 0.5, stepX, geo.h - padY * 0.5, 0.65))
  return marks
}

/**
 * Serving & Runtime — a memory hierarchy drawn as nested bands with a transfer
 * arc crossing them. Weights and cache move down; the arc is the cost.
 */
const tiers: Motif = (rng, geo, ctx) => {
  const marks: string[] = []
  const padX = geo.w * 0.1
  const padY = geo.h * 0.14
  const bands = Math.max(3, Math.min(5, Math.round(rng.int(3, 5) * Math.min(1.1, geo.density))))
  const bandH = (geo.h - padY * 2) / bands
  const focal = rng.int(0, bands)

  for (let i = 0; i < bands; i += 1) {
    // Each tier is narrower than the one above it: capacity shrinks going down.
    const inset = padX * (0.4 + i * 0.55)
    const y = padY + i * bandH
    const h = bandH * 0.66
    const w = geo.w - inset * 2
    if (i === focal) marks.push(rect(ctx, inset, y, w, h, 0.22, true))
    marks.push(rect(ctx, inset, y, w, h, i === focal ? 0.72 : 0.32))
  }

  const x = padX + (geo.w - padX * 2) * rng.range(0.3, 0.7)
  marks.push(
    path(
      ctx,
      `M ${round(x)} ${round(padY)} L ${round(x)} ${round(padY + bands * bandH - bandH * 0.34)}`,
      0.5
    )
  )
  marks.push(dot(ctx, x, padY + bands * bandH - bandH * 0.34, Math.max(1, bandH * 0.1), 0.7))
  return marks
}

/**
 * Theory & Mathematics — a point set with one unit-distance circle drawn in.
 * Discrete geometry's basic gesture: fixed points, a distance that repeats.
 */
const pointset: Motif = (rng, geo, ctx) => {
  const marks: string[] = []
  const padX = geo.w * 0.12
  const padY = geo.h * 0.16
  const cols = Math.max(4, Math.min(11, Math.round(rng.int(5, 8) * geo.density)))
  const rows = Math.max(3, Math.round(rng.int(3, 5) * Math.min(1.2, geo.density)))
  const stepX = (geo.w - padX * 2) / Math.max(1, cols - 1)
  const stepY = (geo.h - padY * 2) / Math.max(1, rows - 1)
  const r = Math.min(stepX, stepY)

  const fx = rng.int(1, Math.max(2, cols - 1))
  const fy = rng.int(1, Math.max(2, rows - 1))
  const cx = padX + fx * stepX
  const cy = padY + fy * stepY

  marks.push(
    `<circle cx="${round(cx)}" cy="${round(cy)}" r="${round(r)}" ${strokeAttrs(ctx, 0.5)}/>`
  )

  for (let j = 0; j < rows; j += 1) {
    for (let i = 0; i < cols; i += 1) {
      const x = padX + i * stepX
      const y = padY + j * stepY
      const d = Math.hypot(x - cx, y - cy)
      // Points sitting on the circle are the ones the problem is about.
      const onCircle = Math.abs(d - r) < Math.min(stepX, stepY) * 0.18
      marks.push(
        dot(ctx, x, y, Math.max(0.7, r * (onCircle ? 0.09 : 0.055)), onCircle ? 0.85 : 0.4)
      )
      if (onCircle) marks.push(line(ctx, cx, cy, x, y, 0.4))
    }
  }
  return marks
}

/**
 * Theory & Mathematics — an upper and a lower bound closing on an unknown
 * value. The gap between the brackets is the result; the dashed span is what
 * stays open.
 */
const boundgap: Motif = (rng, geo, ctx) => {
  const marks: string[] = []
  const padX = geo.w * 0.1
  const padY = geo.h * 0.18
  const steps = Math.max(3, Math.min(8, Math.round(rng.int(4, 6) * geo.density)))
  const rowH = (geo.h - padY * 2) / steps
  let lo = rng.range(0.04, 0.16)
  let hi = rng.range(0.82, 0.96)

  for (let i = 0; i < steps; i += 1) {
    const y = padY + i * rowH + rowH / 2
    const x1 = padX + (geo.w - padX * 2) * lo
    const x2 = padX + (geo.w - padX * 2) * hi
    const cap = rowH * 0.3
    const focal = i === steps - 1
    marks.push(line(ctx, x1, y, x2, y, focal ? 0.7 : 0.34))
    marks.push(line(ctx, x1, y - cap, x1, y + cap, focal ? 0.8 : 0.45))
    marks.push(line(ctx, x2, y - cap, x2, y + cap, focal ? 0.8 : 0.45))
    // Each successive row tightens, but never to zero.
    lo += (hi - lo) * rng.range(0.12, 0.3)
    hi -= (hi - lo) * rng.range(0.12, 0.3)
  }

  const truth = padX + (geo.w - padX * 2) * ((lo + hi) / 2)
  marks.push(line(ctx, truth, padY * 0.5, truth, geo.h - padY * 0.5, 0.5))
  return marks
}

/**
 * Theory & Mathematics — a complete graph on a handful of vertices with its
 * edges split between two weights. Ramsey-style: the question is whether a
 * monochromatic clique is forced.
 */
const clique: Motif = (rng, geo, ctx) => {
  const marks: string[] = []
  const cx = geo.w / 2
  const cy = geo.h / 2
  const r = Math.min(geo.w, geo.h) * 0.36
  const n = Math.max(5, Math.min(9, Math.round(rng.int(5, 7) * Math.min(1.2, geo.density))))
  const phase = rng.range(0, Math.PI * 2)

  const pts = Array.from({ length: n }, (_, i) => {
    const a = phase + (i / n) * Math.PI * 2
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * (geo.h < geo.w ? 0.92 : 1) }
  })

  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const a = pts[i]
      const b = pts[j]
      if (!a || !b) continue
      // Two "colours" rendered as two weights, since the art is monochrome.
      const strong = rng.chance(0.42)
      marks.push(line(ctx, a.x, a.y, b.x, b.y, strong ? 0.55 : 0.16, strong ? 1 : 0.6))
    }
  }
  for (const p of pts) marks.push(dot(ctx, p.x, p.y, Math.max(1, r * 0.075), 0.85))
  return marks
}

// Three motifs per category. They share a grammar within each family — nodes
// and edges for models, time and throughput for inference, orthogonal grids for
// hardware, packed rectangles for ecosystems, allocation and queueing for
// serving, and discrete point/bound geometry for theory — so the category still
// reads at a glance while no two posts in it look alike.
const MOTIFS: Record<PostCategory, readonly Motif[]> = {
  'Models & Training': [routing, attention, curves],
  'Inference & Deployment': [pipeline, stream, histogram],
  'Serving & Runtime': [pages, requests, tiers],
  'Hardware & Systems': [circuit, floorplan, hierarchy],
  'Ecosystems & Tooling': [modules, graph, layers],
  'Theory & Mathematics': [pointset, boundgap, clique]
}

const isPostCategory = (value: string): value is PostCategory =>
  (POST_CATEGORIES as readonly string[]).includes(value)

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ThumbnailArt {
  /** Inner SVG markup — no <svg> wrapper. */
  markup: string
  width: number
  height: number
  viewBox: string
}

export const generateThumbnail = (
  slug: string,
  category: string,
  variant: ThumbnailVariant = 'card'
): ThumbnailArt => {
  const geo = VARIANTS[variant]
  // Mixing the category into the seed keeps two posts with the same slug shape
  // from colliding across motif families.
  const rng = createRng(fnv1a(`${slug}::${category}`))
  const family = isPostCategory(category) ? MOTIFS[category] : MOTIFS['Ecosystems & Tooling']
  // Drawn from a dedicated hash rather than the shared stream, so which motif a
  // post gets stays stable across variants and doesn't shift the marks after it.
  const motif = family[fnv1a(`motif::${slug}`) % family.length] ?? routing
  const ctx: MarkContext = {
    stroke: geo.stroke,
    fade: geo.fade,
    scaleStroke: geo.scaleStroke
  }

  return {
    markup: motif(rng, geo, ctx).join(''),
    width: geo.w,
    height: geo.h,
    viewBox: `0 0 ${geo.w} ${geo.h}`
  }
}

/** Standalone SVG document — used by the OG pre-render script. */
export const generateThumbnailSvg = (
  slug: string,
  category: string,
  variant: ThumbnailVariant = 'og',
  color = '#1c1c1c'
): string => {
  const { markup, width, height, viewBox } = generateThumbnail(slug, category, variant)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}" color="${color}">${markup}</svg>`
}
