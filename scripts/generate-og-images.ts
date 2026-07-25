/**
 * Pre-render every social card to `public/open-graph/`.
 *
 * Runs in `prebuild`, so the cards are plain static files by the time Astro
 * builds: `<meta property="og:image">` points straight at one, and the feeds
 * reuse the same file as each entry's cover art. `_site.png` is the card for
 * the index and any other standalone page.
 *
 * The directory keeps the URL the old image endpoint served from, so previews
 * already cached against `/open-graph/<slug>.png` keep resolving.
 *
 * The drawing on each card is the same seeded artwork the post's own thumbnail
 * and banner use, so a shared link, the index row and the page all agree.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { themeConfig } from '../src/config'
import { POST_CATEGORIES } from '../src/data/taxonomy'
import { formatDate } from '../src/utils/date'
import { renderOgCard } from '../src/utils/og-card'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const postsDir = path.resolve(__dirname, '../src/content/posts')
const outputDir = path.resolve(__dirname, '../public/open-graph')

/** Not a post slug, so it can never collide with one. */
const SITE_CARD = '_site'

const FALLBACK_CATEGORY = POST_CATEGORIES[0]

/**
 * Pull a single scalar out of the leading frontmatter block. The schema in
 * `src/content.config.ts` keeps every field we need on one line, so a full YAML
 * parser would be more machinery than the job needs.
 */
const readFrontmatterField = (source: string, field: string): string | undefined => {
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(source)
  if (!frontmatter?.[1]) return undefined

  const match = new RegExp(`^${field}:\\s*(.+)$`, 'm').exec(frontmatter[1])
  if (!match?.[1]) return undefined

  return match[1].trim().replace(/^['"]|['"]$/g, '')
}

if (!existsSync(postsDir)) {
  console.warn(`[og] no posts directory at ${postsDir}, skipping`)
  process.exit(0)
}

mkdirSync(outputDir, { recursive: true })

const postFiles = readdirSync(postsDir).filter(
  (file) => /\.(md|mdx)$/.test(file) && !file.startsWith('_')
)

const written = new Set<string>()

for (const file of postFiles) {
  const slug = file.replace(/\.(md|mdx)$/, '')
  const source = readFileSync(path.join(postsDir, file), 'utf8')
  const category = readFrontmatterField(source, 'category') ?? FALLBACK_CATEGORY
  const title = readFrontmatterField(source, 'title') ?? slug
  const description = readFrontmatterField(source, 'description') ?? ''
  const pubDate = readFrontmatterField(source, 'pubDate')
  const date = pubDate ? new Date(pubDate) : undefined

  const card = await renderOgCard({
    eyebrow: category,
    title,
    description,
    footerLeft: themeConfig.site.title,
    footerRight: date && !Number.isNaN(date.valueOf()) ? formatDate(date) : undefined,
    art: { seed: slug, category }
  })

  writeFileSync(path.join(outputDir, `${slug}.png`), card)
  written.add(`${slug}.png`)
}

// The index, the 404 and anything else without a post behind it.
const host = new URL(themeConfig.site.website).host.replace(/^www\./, '')
const siteCard = await renderOgCard({
  eyebrow: host,
  title: themeConfig.site.title,
  description: themeConfig.site.description,
  footerLeft: `${POST_CATEGORIES[0]} · ${POST_CATEGORIES[1]}`,
  footerRight: `${POST_CATEGORIES[2]} · ${POST_CATEGORIES[3]}`,
  // Seeded to land on the attention matrix: the one motif that reads as the
  // whole subject rather than any single category.
  art: { seed: 'itis', category: 'Models & Training' }
})
writeFileSync(path.join(outputDir, `${SITE_CARD}.png`), siteCard)
written.add(`${SITE_CARD}.png`)

// Cards for deleted or renamed posts would otherwise be published forever.
for (const stale of readdirSync(outputDir).filter((file) => !written.has(file))) {
  rmSync(path.join(outputDir, stale), { force: true })
}

console.warn(
  `[og] rendered ${written.size} social card${written.size === 1 ? '' : 's'} to public/open-graph`
)
