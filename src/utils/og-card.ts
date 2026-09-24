import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import type { CanvasKit, FontMgr, Paragraph, ParagraphStyle } from 'canvaskit-wasm'
import sharp from 'sharp'
import { generateThumbnail } from './thumbnail'

/**
 * Social card rendering.
 *
 * The card is the post page in miniature: the generative artwork as a masthead
 * strip, then the category, the title in the site's display face, the standfirst
 * and a rule over the footer. Nothing here invents a visual language — every
 * measurement, colour and typeface is lifted from `global.css` and `post.css`,
 * so a shared link looks like the page it points at.
 *
 * Shapes and rules are drawn as SVG and rasterised by sharp; text is drawn by
 * CanvasKit, which does the line breaking and can read the site's own woff2
 * files directly. Both run at build time from `scripts/generate-og-images.ts`.
 */

const require_ = createRequire(import.meta.url)

// --- Canvas geometry -------------------------------------------------------

// Kept private: importing anything from this module pulls sharp and CanvasKit
// in with it, which has no business in the site bundle. The `og:image:width`
// and `og:image:height` tags in `BaseHead.astro` state the same numbers.
const OG_WIDTH = 1200
const OG_HEIGHT = 630

/** Masthead strip height. Matches the 4:1 banner above a post's title. */
const BANNER_H = 168
const PAD_X = 72
const PAD_BOTTOM = 48
const CONTENT_W = OG_WIDTH - PAD_X * 2

const EYEBROW_SIZE = 20
const EYEBROW_LINE = 26
const TITLE_SIZE = 44
const TITLE_LINE_HEIGHT = 1.24
const TITLE_MAX_LINES = 3
const DESC_SIZE = 23
const DESC_LINE_HEIGHT = 1.5
const DESC_MAX_LINES = 2
const FOOTER_SIZE = 19
const FOOTER_LINE = 26

/** Gap between the eyebrow and the title, and between the title and the standfirst. */
const EYEBROW_GAP = 22
const TITLE_GAP = 24

const FOOTER_TOP = OG_HEIGHT - PAD_BOTTOM - FOOTER_LINE
const FOOTER_RULE_Y = FOOTER_TOP - 26
/**
 * Vertical band the text block is centred in, between the strip and the rule.
 * `maxLines` caps the block at roughly 305pt — a three-line title over a
 * two-line standfirst — which is what sets the size of this band.
 */
const BLOCK_TOP = BANNER_H + 26
const BLOCK_BOTTOM = FOOTER_RULE_Y - 28

// --- Palette ---------------------------------------------------------------
// Light theme only: a shared card has no way to follow the reader's scheme.

/** `--bg` */
const PAGE_BG = '#fafaf8'
/** `--surface`, the well the artwork sits in on the site. */
const BANNER_BG = '#f1f1ed'
/** The ink the artwork and dividers are drawn in. */
const INK = '#1c1c1c'
const RULE_OPACITY = 0.1

const TITLE_COLOR: RGBA = [26, 26, 25, 1]
const DESC_COLOR: RGBA = [0, 0, 0, 0.58]
const META_COLOR: RGBA = [0, 0, 0, 0.45]

type RGBA = [r: number, g: number, b: number, a: number]

// --- Fonts -----------------------------------------------------------------
// The site's own files, read off disk. No build-time network fetch, and the
// card's letterforms are the page's letterforms.

/** `--display` — post titles. `500` registers as its own family. */
const DISPLAY_FAMILY = ['DM Mono Medium', 'DM Mono']
/** `--display` at regular weight — the eyebrow and footer. */
const MONO_FAMILY = ['DM Mono']
/** `--sans` — the standfirst. */
const SANS_FAMILY = ['Inter Variable']

const FONT_FILES = [
  'public/fonts/dm-mono-latin-400-normal.woff2',
  'public/fonts/dm-mono-latin-500-normal.woff2',
  'public/fonts/Inter.woff2'
]

let canvasKitPromise: Promise<CanvasKit> | null = null

async function getCanvasKit() {
  if (!canvasKitPromise) {
    canvasKitPromise = import('canvaskit-wasm/full').then(({ default: init }) =>
      init({ locateFile: (file: string) => require_.resolve(`canvaskit-wasm/bin/full/${file}`) })
    )
  }
  return canvasKitPromise
}

let fontsPromise: Promise<FontMgr> | null = null

/** CanvasKit wants plain `ArrayBuffer`s, not Node's views onto a shared pool. */
async function readAsArrayBuffer(file: string): Promise<ArrayBuffer> {
  const buffer = await readFile(path.resolve(file))
  const copy = new ArrayBuffer(buffer.byteLength)
  new Uint8Array(copy).set(buffer)
  return copy
}

async function getFonts(kit: CanvasKit) {
  if (!fontsPromise) {
    fontsPromise = Promise.all(FONT_FILES.map(readAsArrayBuffer)).then((buffers) => {
      const manager = kit.FontMgr.FromData(...buffers)
      if (!manager) throw new Error('[og] CanvasKit could not read the site fonts')
      return manager
    })
  }
  return fontsPromise
}

// --- Background ------------------------------------------------------------

export interface OgArt {
  /** Seeds the drawing. Post slug, or any stable key for a standalone page. */
  seed: string
  /** Selects the motif family. */
  category: string
}

/**
 * Page ground, artwork strip and the two hairlines, rasterised in one pass.
 * Text is drawn over this by CanvasKit.
 */
async function renderBackground(art: OgArt) {
  const { markup, viewBox } = generateThumbnail(art.seed, art.category, 'og')
  const rule = (x: number, y: number, width: number) =>
    `<rect x="${x}" y="${y}" width="${width}" height="1" fill="${INK}" fill-opacity="${RULE_OPACITY}"/>`

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}" color="${INK}">
    <rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="${PAGE_BG}"/>
    <rect width="${OG_WIDTH}" height="${BANNER_H}" fill="${BANNER_BG}"/>
    <svg x="0" y="0" width="${OG_WIDTH}" height="${BANNER_H}" viewBox="${viewBox}">${markup}</svg>
    ${rule(0, BANNER_H - 1, OG_WIDTH)}
    ${rule(PAD_X, FOOTER_RULE_Y, CONTENT_W)}
  </svg>`

  return sharp(Buffer.from(svg)).png().toBuffer()
}

// --- Text ------------------------------------------------------------------

interface TextSpec {
  text: string
  families: string[]
  size: number
  lineHeight: number
  color: RGBA
  letterSpacing?: number
  maxLines?: number
  align?: 'left' | 'right'
}

function buildParagraph(kit: CanvasKit, fonts: FontMgr, spec: TextSpec, width: number) {
  const style: ParagraphStyle = new kit.ParagraphStyle({
    textAlign: spec.align === 'right' ? kit.TextAlign.Right : kit.TextAlign.Left,
    maxLines: spec.maxLines,
    ellipsis: spec.maxLines ? '…' : undefined,
    textStyle: {
      color: kit.Color(...spec.color),
      fontFamilies: spec.families,
      fontSize: spec.size,
      heightMultiplier: spec.lineHeight,
      letterSpacing: spec.letterSpacing
    }
  })

  const builder = kit.ParagraphBuilder.Make(style, fonts)
  builder.addText(spec.text)
  const paragraph = builder.build()
  paragraph.layout(width)
  builder.delete()
  return paragraph
}

// --- Card ------------------------------------------------------------------

export interface OgCardSpec {
  /** Small capitalised line above the title — the post's category. */
  eyebrow: string
  title: string
  description: string
  /** Footer, split either side of the content column. */
  footerLeft: string
  footerRight?: string
  art: OgArt
}

/** Renders one 1200×630 PNG. */
export async function renderOgCard(spec: OgCardSpec): Promise<Buffer> {
  const kit = await getCanvasKit()
  const [fonts, background] = await Promise.all([getFonts(kit), renderBackground(spec.art)])

  const surface = kit.MakeSurface(OG_WIDTH, OG_HEIGHT)
  if (!surface) throw new Error('[og] CanvasKit could not allocate a surface')
  const canvas = surface.getCanvas()

  const backgroundImage = kit.MakeImageFromEncoded(background)
  if (backgroundImage) {
    canvas.drawImage(backgroundImage, 0, 0, new kit.Paint())
    backgroundImage.delete()
  }

  const eyebrow = buildParagraph(
    kit,
    fonts,
    {
      text: spec.eyebrow.toUpperCase(),
      families: MONO_FAMILY,
      size: EYEBROW_SIZE,
      lineHeight: 1.3,
      color: META_COLOR,
      letterSpacing: EYEBROW_SIZE * 0.12,
      maxLines: 1
    },
    CONTENT_W
  )

  const title = buildParagraph(
    kit,
    fonts,
    {
      text: spec.title,
      families: DISPLAY_FAMILY,
      size: TITLE_SIZE,
      lineHeight: TITLE_LINE_HEIGHT,
      color: TITLE_COLOR,
      // `--spacing` on `.prose .title h1` is -0.035em.
      letterSpacing: TITLE_SIZE * -0.035,
      maxLines: TITLE_MAX_LINES
    },
    CONTENT_W
  )

  const description = buildParagraph(
    kit,
    fonts,
    {
      text: spec.description,
      families: SANS_FAMILY,
      size: DESC_SIZE,
      lineHeight: DESC_LINE_HEIGHT,
      color: DESC_COLOR,
      maxLines: DESC_MAX_LINES
    },
    CONTENT_W
  )

  // Centre the block in the band between the strip and the footer rule, so a
  // one-line title and a three-line one both sit comfortably. Anything that
  // still will not fit rides up toward the strip — never down onto the rule.
  const blockHeight =
    EYEBROW_LINE + EYEBROW_GAP + title.getHeight() + TITLE_GAP + description.getHeight()
  const blockTop = Math.min(
    Math.max(BLOCK_TOP, BLOCK_TOP + (BLOCK_BOTTOM - BLOCK_TOP - blockHeight) / 2),
    BLOCK_BOTTOM - blockHeight
  )

  canvas.drawParagraph(eyebrow, PAD_X, blockTop)
  const titleTop = blockTop + EYEBROW_LINE + EYEBROW_GAP
  canvas.drawParagraph(title, PAD_X, titleTop)
  canvas.drawParagraph(description, PAD_X, titleTop + title.getHeight() + TITLE_GAP)

  const footer: TextSpec = {
    text: spec.footerLeft,
    families: MONO_FAMILY,
    size: FOOTER_SIZE,
    lineHeight: 1.3,
    color: META_COLOR,
    maxLines: 1
  }
  const footerLeft = buildParagraph(kit, fonts, footer, CONTENT_W)
  canvas.drawParagraph(footerLeft, PAD_X, FOOTER_TOP)

  let footerRight: Paragraph | undefined
  if (spec.footerRight) {
    footerRight = buildParagraph(
      kit,
      fonts,
      { ...footer, text: spec.footerRight, align: 'right' },
      CONTENT_W
    )
    canvas.drawParagraph(footerRight, PAD_X, FOOTER_TOP)
  }

  const snapshot = surface.makeImageSnapshot()
  const bytes = snapshot.encodeToBytes(kit.ImageFormat.PNG, 100)

  for (const paragraph of [eyebrow, title, description, footerLeft, footerRight]) {
    paragraph?.delete()
  }
  snapshot.delete()
  surface.dispose()

  if (!bytes) throw new Error('[og] CanvasKit produced no image data')
  return Buffer.from(bytes)
}
