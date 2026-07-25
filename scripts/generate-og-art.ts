/**
 * Pre-render the generative post artwork to PNG for use as Open Graph
 * backgrounds. Runs in `prebuild` so `src/pages/open-graph/[...route].ts` can
 * point `bgImage.path` at a per-post file.
 *
 * The result is that the index thumbnail, the post banner and the social card
 * are all the same drawing, seeded from the same slug.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { generateThumbnailSvg } from '../src/utils/thumbnail'
import { POST_CATEGORIES } from '../src/data/taxonomy'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const postsDir = path.resolve(__dirname, '../src/content/posts')
const outputDir = path.resolve(__dirname, '../public/og/gen')

const FALLBACK_CATEGORY = POST_CATEGORIES[0]

/** Pull a single scalar field out of the leading frontmatter block. */
const readFrontmatterField = (source: string, field: string): string | undefined => {
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(source)
  if (!frontmatter?.[1]) return undefined

  const match = new RegExp(`^${field}:\\s*(.+)$`, 'm').exec(frontmatter[1])
  if (!match?.[1]) return undefined

  return match[1].trim().replace(/^['"]|['"]$/g, '')
}

if (!existsSync(postsDir)) {
  console.warn(`[og-art] no posts directory at ${postsDir}, skipping`)
  process.exit(0)
}

mkdirSync(outputDir, { recursive: true })

const postFiles = readdirSync(postsDir).filter((file) => /\.(md|mdx)$/.test(file))
let written = 0

for (const file of postFiles) {
  const slug = file.replace(/\.(md|mdx)$/, '')
  const source = readFileSync(path.join(postsDir, file), 'utf8')
  const category = readFrontmatterField(source, 'category') ?? FALLBACK_CATEGORY

  const svg = generateThumbnailSvg(slug, category, 'og', '#1c1c1c')
  const outputPath = path.join(outputDir, `${slug}.png`)

  await sharp({
    create: { width: 1200, height: 630, channels: 4, background: '#ffffff' }
  })
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toFile(outputPath)

  written += 1
}

console.log(`[og-art] rendered ${written} background${written === 1 ? '' : 's'} to public/og/gen`)
