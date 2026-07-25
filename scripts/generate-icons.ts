/**
 * Rasterise `public/favicon.svg` into the icon sizes that can't be served as
 * SVG: the Apple touch icon and a small PNG fallback.
 *
 * The SVG is the single source of the artwork, so the tab mark and the home
 * screen icon can never drift apart. Two transforms are applied on the way out:
 *
 * - the CSS custom properties are inlined. `favicon.svg` carries its palette in
 *   `:root` and swaps it under `prefers-color-scheme`, which browsers honour but
 *   the rasteriser behind sharp does not reliably resolve. Substituting the
 *   light-mode values by hand means the PNGs are the light palette by intent
 *   rather than by whatever a missing `var()` happens to fall back to.
 * - the plate corners are squared off. iOS applies its own mask to a touch
 *   icon, and a rounded plate under that mask reads as a double-rounded corner
 *   with a sliver of transparency at each edge.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.resolve(__dirname, '../public')
const source = path.join(publicDir, 'favicon.svg')

/** `--plate-hi` — what the squared-off corners get filled with. */
const PLATE_BG = '#f7f7f3'

const OUTPUTS = [
  // Referenced by `<link rel="apple-touch-icon">`. 180px is the largest size
  // current iPhones ask for; everything smaller is downscaled from it. Opaque,
  // because iOS discards the alpha channel and composites the icon on black.
  { file: 'apple-touch-icon.png', size: 180, opaque: true },
  // Fallback for the handful of contexts that won't take an SVG icon. Keeps its
  // rounded corners and the transparency outside them.
  { file: 'favicon-32.png', size: 32, opaque: false }
] as const

/**
 * Replace every `var(--name)` with the literal declared for it in the `:root`
 * block. Only the first block is read, which is the light palette — the
 * `prefers-color-scheme` override that follows is deliberately ignored.
 */
const inlineCustomProperties = (svg: string): string => {
  const root = /:root\s*\{([^}]*)\}/.exec(svg)
  if (!root?.[1]) throw new Error('favicon.svg has no :root block to read the palette from')

  const palette = new Map<string, string>()
  for (const [, name, value] of root[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    palette.set(name, value.trim())
  }

  return svg.replace(/var\((--[\w-]+)\)/g, (_, name: string) => {
    const value = palette.get(name)
    if (!value) throw new Error(`favicon.svg references ${name}, which :root does not declare`)
    return value
  })
}

const svg = inlineCustomProperties(readFileSync(source, 'utf8'))

for (const { file, size, opaque } of OUTPUTS) {
  const markup = opaque ? svg.replace(/rx="7\.5"/g, 'rx="0"') : svg

  // Render at 4× and downsample: the rasteriser antialiases a 32px viewBox
  // poorly at small output sizes, and the block's edges are all shallow
  // diagonals, which is exactly where undersampling shows.
  const render = sharp(Buffer.from(markup), { density: 72 * ((size * 4) / 32) }).resize(size, size)

  const png = await (opaque ? render.flatten({ background: PLATE_BG }) : render)
    .png({ compressionLevel: 9 })
    .toBuffer()

  writeFileSync(path.join(publicDir, file), png)
  console.warn(`[icons] ${file} (${size}×${size})`)
}
