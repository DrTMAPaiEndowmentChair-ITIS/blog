/**
 * Rasterises every diagram component into a WebP image for the feeds.
 *
 * The `viz/*` components draw with CSS grid, custom properties and media
 * queries. A feed reader receives HTML without the stylesheet, so the only
 * faithful way to syndicate them is as pixels. This script renders each post in
 * a headless browser, screenshots every component block, and writes a manifest
 * that `src/utils/feed.ts` reads at build time.
 *
 * Images are committed (unlike `public/open-graph/`) so the site build never needs a
 * browser. Re-run `bun run viz-figures` after changing a `viz/*` component; the
 * feed falls back to a captioned link for any block the manifest does not cover,
 * and logs a warning naming it.
 */
import { createHash } from 'node:crypto'
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { dev } from 'astro'
import { parse as parseHtml, type HTMLElement } from 'node-html-parser'
import { chromium } from 'playwright'
import sharp from 'sharp'

const OUTPUT_DIR = path.resolve('public/feeds/figures')
// Kept out of `public/` so it is not served alongside the images it describes.
const MANIFEST_PATH = path.resolve('src/data/viz-figures.json')
const POSTS_DIR = path.resolve('src/content/posts')

/** Wide enough that no component drops to its mobile layout (breakpoints ≤ 768px). */
const VIEWPORT = { width: 1024, height: 1400 }
const DEVICE_SCALE = 2
const MAX_WIDTH = 1200
const WEBP_QUALITY = 82
const NO_MOTION =
  '*, *::before, *::after { animation: none !important; transition: none !important }'

type Figure = {
  slug: string
  index: number
  file: string
  /** Normalised text of the block, so the feed can detect a stale image. */
  textHash: string
  /** Display size in CSS pixels; the file itself is `DEVICE_SCALE` times larger. */
  width: number
  height: number
}

/**
 * Collects a post's component blocks in the same order `feed.ts` does: every
 * element carrying Astro's scoped-style marker that has no such ancestor,
 * restricted to the slotted MDX content (the layout's own components sit
 * before the title or outside `.prose`).
 *
 * Passed as source rather than a function: the bundler rewrites local functions
 * with helpers that do not exist in the page context.
 */
const COLLECT_BLOCKS = `(() => {
  const prose = document.querySelector('.prose')
  if (!prose) return []

  const title = prose.querySelector(':scope > .title')
  const content = []
  for (let node = title && title.nextElementSibling; node; node = node.nextElementSibling) {
    content.push(node)
  }

  const isScoped = (element) =>
    Array.from(element.attributes).some((attribute) => attribute.name.startsWith('data-astro-cid-'))

  const blocks = []
  for (const node of content) {
    for (const candidate of [node, ...node.querySelectorAll('*')]) {
      if (!isScoped(candidate)) continue
      if (blocks.some((block) => block.contains(candidate))) continue
      blocks.push(candidate)
    }
  }

  return blocks.map((block, index) => {
    block.setAttribute('data-viz-figure', String(index))
    return { index, text: (block.textContent || '').replace(/\\s+/g, ' ').trim() }
  })
})()`

function hashText(text: string) {
  return createHash('sha256').update(text).digest('hex').slice(0, 16)
}

/**
 * The same collection, run over the server HTML instead of the live page.
 *
 * Screenshots are taken after the page's scripts run, which mutates the text of
 * the interactive components. The feed only ever sees pre-hydration markup, so
 * the staleness hashes have to come from that same state.
 */
function collectServerBlocks(html: string) {
  const root = parseHtml(html, { comment: false })
  for (const element of root.querySelectorAll('script, style, noscript, button, template, link')) {
    element.remove()
  }

  const prose = root.querySelector('.prose')
  if (!prose) return []

  const children = prose.childNodes.filter((node) => node instanceof Object && 'tagName' in node)
  const titleIndex = children.findIndex((node) =>
    ((node as HTMLElement).getAttribute?.('class') ?? '').split(/\s+/).includes('title')
  )

  const isScoped = (element: HTMLElement) =>
    Object.keys(element.attributes ?? {}).some((name) => name.startsWith('data-astro-cid-'))

  const blocks: HTMLElement[] = []
  for (const node of children.slice(titleIndex + 1) as HTMLElement[]) {
    for (const candidate of [node, ...node.querySelectorAll('*')]) {
      if (!isScoped(candidate)) continue
      if (blocks.some((block) => block.querySelectorAll('*').includes(candidate))) continue
      blocks.push(candidate)
    }
  }

  return blocks.map((block) => hashText(block.text.replace(/\s+/g, ' ').trim()))
}

// Astro's glob loader lowercases collection ids, and the feed keys off those.
const slugs = (await readdir(POSTS_DIR))
  .filter((file) => /\.mdx?$/.test(file) && !file.startsWith('_'))
  .map((file) => file.replace(/\.[^.]+$/, '').toLowerCase())
  .sort()

await rm(OUTPUT_DIR, { recursive: true, force: true })
await mkdir(OUTPUT_DIR, { recursive: true })

const server = await dev({ root: process.cwd(), logLevel: 'error' })
const { port } = server.address

const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: VIEWPORT,
  deviceScaleFactor: DEVICE_SCALE,
  colorScheme: 'light',
  reducedMotion: 'reduce'
})
// The theme manager reads this before first paint; feeds render light. The
// `colorScheme` above already forces light, this pins it against a stored value.
await context.addInitScript({ content: "window.localStorage.setItem('itis-theme', 'light')" })

const page = await context.newPage()
const figures: Figure[] = []
let totalBytes = 0

for (const slug of slugs) {
  const url = `http://localhost:${port}/${slug}/`
  const hashes = collectServerBlocks(await (await fetch(url)).text())

  await page.goto(url, { waitUntil: 'networkidle' })
  await page.addStyleTag({ content: NO_MOTION })
  await page.evaluate('document.fonts.ready')

  const blocks = (await page.evaluate(COLLECT_BLOCKS)) as Array<{ index: number; text: string }>

  if (blocks.length !== hashes.length) {
    throw new Error(
      `${slug}: found ${blocks.length} blocks in the page but ${hashes.length} in its HTML; ` +
        'the feed and these images would disagree.'
    )
  }

  for (const { index } of blocks) {
    const png = await page
      .locator(`[data-viz-figure="${index}"]`)
      .screenshot({ type: 'png', animations: 'disabled' })

    const source = sharp(png)
    const { width = 0 } = await source.metadata()
    const output = await (width > MAX_WIDTH ? source.resize({ width: MAX_WIDTH }) : source)
      .webp({ quality: WEBP_QUALITY, effort: 6 })
      .toBuffer()
    const { width: finalWidth = 0, height: finalHeight = 0 } = await sharp(output).metadata()

    const file = `${slug}-${index}.webp`
    await writeFile(path.join(OUTPUT_DIR, file), output)
    totalBytes += output.byteLength

    figures.push({
      slug,
      index,
      file,
      textHash: hashes[index],
      width: Math.round(finalWidth / DEVICE_SCALE),
      height: Math.round(finalHeight / DEVICE_SCALE)
    })
  }

  console.warn(`${slug}: ${blocks.length} figure(s)`)
}

await writeFile(MANIFEST_PATH, `${JSON.stringify({ figures }, null, 2)}\n`)

await context.close()
await browser.close()
await server.stop()

console.warn(
  `\nWrote ${figures.length} figures (${(totalBytes / 1024 / 1024).toFixed(2)} MB) to ${path.relative(process.cwd(), OUTPUT_DIR)}`
)

// The dev server leaves handles open that `stop()` does not always release.
process.exit(0)
