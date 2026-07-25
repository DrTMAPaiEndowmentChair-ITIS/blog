import { createHash } from 'node:crypto'
import { readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { getContainerRenderer as mdxContainerRenderer } from '@astrojs/mdx/container-renderer'
import type { APIContext } from 'astro'
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { loadRenderers } from 'astro:container'
import { getCollection, render, type CollectionEntry } from 'astro:content'
import { Feed, type Item } from 'feed'
import { parse as parseHtml, type HTMLElement } from 'node-html-parser'
import sanitizeHtml from 'sanitize-html'
import { themeConfig } from '@/config'

/**
 * Feed generation.
 *
 * Posts are MDX: they import `.astro` components, use KaTeX math and GFM
 * footnotes, and their images are optimised at build time. Rendering the raw
 * Markdown source would leak `import` statements and unrendered JSX into the
 * feed, so each entry is rendered through Astro's container API — the same
 * pipeline the site itself uses — and the resulting HTML is then rewritten for
 * offline readers (absolute URLs, MathML-only math, no scripts or styles).
 */

const MATHML_TAGS = [
  'math',
  'semantics',
  'annotation-xml',
  'maction',
  'menclose',
  'merror',
  'mfenced',
  'mfrac',
  'mi',
  'mmultiscripts',
  'mn',
  'mo',
  'mover',
  'mpadded',
  'mphantom',
  'mprescripts',
  'mroot',
  'mrow',
  'ms',
  'mspace',
  'msqrt',
  'mstyle',
  'msub',
  'msubsup',
  'msup',
  'mtable',
  'mtd',
  'mtext',
  'mtr',
  'munder',
  'munderover',
  'none'
]

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    ...sanitizeHtml.defaults.allowedTags,
    'img',
    'figure',
    'figcaption',
    ...MATHML_TAGS
  ],
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    '*': ['class', 'id', 'dir', 'lang'],
    a: ['href', 'title', 'rel', 'name'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading', 'decoding'],
    td: ['colspan', 'rowspan', 'align'],
    th: ['colspan', 'rowspan', 'align', 'scope'],
    time: ['datetime'],
    // MathML carries its layout in attributes, so keep the ones KaTeX emits.
    math: ['display', 'xmlns'],
    mo: ['stretchy', 'fence', 'separator', 'lspace', 'rspace', 'maxsize', 'minsize'],
    mi: ['mathvariant'],
    mn: ['mathvariant'],
    ms: ['mathvariant'],
    mtext: ['mathvariant'],
    mspace: ['width', 'height', 'depth'],
    mstyle: ['displaystyle', 'scriptlevel', 'mathvariant'],
    mtable: ['columnalign', 'rowspacing', 'columnspacing', 'displaystyle'],
    mtd: ['columnalign', 'colspan', 'rowspan'],
    mover: ['accent'],
    munder: ['accentunder'],
    munderover: ['accent', 'accentunder'],
    mpadded: ['width', 'height', 'depth', 'lspace', 'voffset']
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  // Drop the contents too, instead of flattening them into stray text.
  nonTextTags: ['script', 'style', 'noscript', 'template', 'textarea', 'title']
}

/**
 * Astro stamps every element that came from a component with a scoped-style
 * marker. Markdown-authored elements never carry one, which makes it a reliable
 * way to tell prose apart from component output.
 */
const SCOPE_ATTRIBUTE = /^data-astro-cid-/

let containerPromise: Promise<AstroContainer> | null = null

async function getContainer() {
  if (!containerPromise) {
    containerPromise = (async () => {
      const renderers = await loadRenderers([mdxContainerRenderer()])
      return AstroContainer.create({ renderers })
    })()
  }
  return containerPromise
}

function absoluteUrl(value: string, base: string) {
  try {
    return new URL(value, base).toString()
  } catch {
    return value
  }
}

/** Text content of an element, collapsed to a single line. */
function textOf(element: HTMLElement | null | undefined) {
  return element?.text.replace(/\s+/g, ' ').trim() ?? ''
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * KaTeX emits both MathML and a pile of styled spans. The spans are meaningless
 * without KaTeX's stylesheet, so keep only the MathML — readers that understand
 * it render real math, and the rest degrade to the plain symbol text.
 */
function rewriteMath(root: HTMLElement) {
  for (const annotation of root.querySelectorAll('annotation')) {
    annotation.remove()
  }

  for (const katex of root.querySelectorAll('.katex')) {
    const math = katex.querySelector('math')
    if (math) {
      katex.replaceWith(math.toString())
    } else {
      katex.replaceWith(`<code>${escapeHtml(textOf(katex))}</code>`)
    }
  }

  // The display wrapper only exists to centre KaTeX's spans; MathML carries its
  // own `display="block"`.
  for (const display of root.querySelectorAll('.katex-display')) {
    display.replaceWith(display.innerHTML)
  }
}

/**
 * The `viz/*` components are CSS-grid diagrams and interactive widgets, so they
 * are shipped as images pre-rendered by `scripts/generate-viz-figures.ts`. Data
 * tables read better as markup and are kept inline. Anything the manifest does
 * not cover — a new or edited component — degrades to a captioned link.
 */
function rewriteInteractiveBlocks(
  root: HTMLElement,
  { slug, postUrl, siteUrl }: { slug: string; postUrl: string; siteUrl: string }
) {
  const isScoped = (element: HTMLElement | null | undefined) =>
    !!element?.attributes &&
    Object.keys(element.attributes).some((name) => SCOPE_ATTRIBUTE.test(name))

  // Only the outermost element of each component gets replaced.
  const blocks = root.querySelectorAll('*').filter((element) => {
    if (!isScoped(element)) return false
    for (let parent = element.parentNode; parent; parent = parent.parentNode) {
      if (isScoped(parent as HTMLElement)) return false
    }
    return true
  })

  blocks.forEach((element, index) => {
    const caption = findCaption(element)
    const tables = element.querySelectorAll('table')

    if (tables.length) {
      // Tabular data reads better as markup: selectable, and it reflows.
      const markup = tables.map((table) => table.toString()).join('\n')
      element.replaceWith(caption ? wrapWithCaption(caption, markup) : markup)
      return
    }

    const figure = findFigure(slug, index, element)
    if (figure) {
      const src = absoluteUrl(`feeds/figures/${figure.file}`, siteUrl)
      // Prefer the caption; fall back to the diagram's own labels so the image
      // is not opaque to a screen reader.
      const alt = caption.replace(/<[^>]+>/g, '').trim() || truncate(textOf(element), 300)
      element.replaceWith(
        wrapWithCaption(
          caption || '<strong>Figure</strong>',
          `<img src="${src}" width="${figure.width}" height="${figure.height}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async" />`
        )
      )
      return
    }

    element.replaceWith(
      wrapWithCaption(
        caption || '<strong>Figure</strong>',
        `<p><a href="${postUrl}">View this figure on the site &#8594;</a></p>`
      )
    )
  })
}

/**
 * Looks up the pre-rendered image for a block. The text hash guards against a
 * component being edited without `bun run viz-figures` being re-run — a stale
 * picture is worse than a link, so a mismatch falls back and says so.
 */
function findFigure(slug: string, index: number, element: HTMLElement) {
  const figure = figureManifest().get(`${slug}:${index}`)
  if (!figure) {
    warnOnce(`[feed] No pre-rendered figure for ${slug} #${index}; linking instead.`)
    return undefined
  }

  const textHash = createHash('sha256').update(textOf(element)).digest('hex').slice(0, 16)
  if (textHash !== figure.textHash) {
    warnOnce(`[feed] Figure ${figure.file} is out of date; run \`bun run viz-figures\`.`)
    return undefined
  }

  return figure
}

const warned = new Set<string>()

function warnOnce(message: string) {
  if (warned.has(message)) return
  warned.add(message)
  console.warn(message)
}

type FigureRecord = {
  slug: string
  index: number
  file: string
  textHash: string
  width: number
  height: number
}

let manifest: Map<string, FigureRecord> | null = null

function figureManifest() {
  if (!manifest) {
    manifest = new Map()
    try {
      const raw = readFileSync(path.resolve('src/data/viz-figures.json'), 'utf8')
      for (const figure of JSON.parse(raw).figures as FigureRecord[]) {
        manifest.set(`${figure.slug}:${figure.index}`, figure)
      }
    } catch {
      warnOnce('[feed] No figure manifest found; run `bun run viz-figures` to render diagrams.')
    }
  }
  return manifest
}

function wrapWithCaption(caption: string, body: string) {
  return `<figure><figcaption>${caption}</figcaption>${body}</figure>`
}

/**
 * Caption markup for a component block: the first heading-like label found in
 * document order. Captions are commonly a bold title followed by a subtitle in
 * a sibling element, so parts are joined explicitly — the raw text nodes would
 * otherwise run together.
 */
function findCaption(element: HTMLElement) {
  const LABEL_TAGS = new Set(['figcaption', 'caption', 'h2', 'h3', 'h4'])

  for (const candidate of element.querySelectorAll('*')) {
    const isLabel =
      LABEL_TAGS.has(candidate.rawTagName?.toLowerCase() ?? '') ||
      /(^|[\s-])title([\s-]|$)/.test(candidate.getAttribute('class') ?? '')
    if (!isLabel) continue

    const parts = candidate.childNodes
      .map((child) => child.text.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
    const [title, ...rest] = parts.length ? parts : [textOf(candidate)]
    if (!title) continue

    const subtitle = rest.join(' ')
    return `<strong>${escapeHtml(truncate(title))}</strong>${
      subtitle ? ` — ${escapeHtml(truncate(subtitle))}` : ''
    }`
  }

  return ''
}

function truncate(value: string, limit = 200) {
  return value.length > limit ? `${value.slice(0, limit - 1).trimEnd()}…` : value
}

/** Rewrite every relative reference so the entry stands alone in a reader. */
function absolutizeUrls(root: HTMLElement, siteUrl: string, postUrl: string) {
  for (const picture of root.querySelectorAll('picture')) {
    const img = picture.querySelector('img')
    if (img) picture.replaceWith(img)
    else picture.remove()
  }

  for (const img of root.querySelectorAll('img')) {
    // Responsive candidates point at build hashes a reader cannot resolve.
    img.removeAttribute('srcset')
    img.removeAttribute('sizes')
    const src = img.getAttribute('src')
    if (src) img.setAttribute('src', absoluteUrl(src, siteUrl))
  }

  for (const anchor of root.querySelectorAll('a')) {
    const href = anchor.getAttribute('href')
    if (!href) continue
    // In-page anchors (footnotes, headings) must resolve against the post.
    anchor.setAttribute('href', absoluteUrl(href, href.startsWith('#') ? postUrl : siteUrl))
  }
}

async function renderPostContent(
  post: CollectionEntry<'posts'>,
  { slug, siteUrl, postUrl }: { slug: string; siteUrl: string; postUrl: string }
) {
  const { Content } = await render(post)
  const container = await getContainer()
  const html = await container.renderToString(Content, { request: new Request(postUrl) })

  const root = parseHtml(html, { comment: false })

  for (const element of root.querySelectorAll('script, style, noscript, button, template, link')) {
    element.remove()
  }

  rewriteMath(root)
  rewriteInteractiveBlocks(root, { slug, postUrl, siteUrl })
  absolutizeUrls(root, siteUrl, postUrl)

  return sanitizeHtml(root.toString(), SANITIZE_OPTIONS).trim()
}

/**
 * Pre-rendered cover art doubles as the entry enclosure. Readers expect a real
 * byte length, so the file is stat-ed and the enclosure dropped when missing.
 */
function coverArt(slug: string, siteUrl: string) {
  const relativePath = `og/gen/${slug}.png`
  try {
    const { size } = statSync(path.resolve('public', relativePath))
    return { url: absoluteUrl(relativePath, siteUrl), type: 'image/png', length: size }
  } catch {
    return undefined
  }
}

let itemsPromise: Promise<Item[]> | null = null

async function buildItems(siteUrl: string) {
  const posts = await getCollection(
    'posts',
    ({ id }: CollectionEntry<'posts'>) => !id.startsWith('_')
  )
  const sorted = posts.sort(
    (a: CollectionEntry<'posts'>, b: CollectionEntry<'posts'>) =>
      b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
  )

  const items: Item[] = []
  for (const post of sorted) {
    const slug = post.id.replace(/\.[^/.]+$/, '')
    // Trailing slash keeps guids identical to the canonical URLs in the sitemap.
    const postUrl = absoluteUrl(`${slug}/`, siteUrl)

    let content: string
    try {
      content = await renderPostContent(post, { slug, siteUrl, postUrl })
    } catch (error) {
      console.error(`[feed] Failed to render "${post.id}", falling back to its description.`, error)
      content = `<p>${escapeHtml(post.data.description)}</p>`
    }

    items.push({
      title: post.data.title,
      id: postUrl,
      link: postUrl,
      description: post.data.description,
      content,
      date: post.data.pubDate,
      published: post.data.pubDate,
      author: [{ name: post.data.author || themeConfig.site.author, link: siteUrl }],
      category: [post.data.category, ...post.data.topics].map((name) => ({ name })),
      image: coverArt(slug, siteUrl)
    })
  }

  return items
}

async function generateFeedInstance(context: APIContext) {
  const siteUrl = `${(context.site?.toString() || themeConfig.site.website).replace(/\/$/, '')}/`
  const { title = '', description = '', author = '', language = 'en-US' } = themeConfig.site

  const feed = new Feed({
    title,
    description,
    id: siteUrl,
    link: siteUrl,
    language,
    copyright: `Copyright © ${new Date().getFullYear()} ${author}`,
    updated: new Date(),
    generator: 'Astro',
    image: absoluteUrl('og/og-logo.png', siteUrl),
    favicon: absoluteUrl('favicon.svg', siteUrl),
    feedLinks: {
      rss: absoluteUrl('rss.xml', siteUrl),
      atom: absoluteUrl('atom.xml', siteUrl),
      json: absoluteUrl('feed.json', siteUrl)
    },
    author: {
      name: author,
      link: siteUrl
    }
  })

  // Rendering every post is expensive; share the work across the three feeds.
  if (!itemsPromise) itemsPromise = buildItems(siteUrl)
  for (const item of await itemsPromise) {
    feed.addItem(item)
  }

  return feed
}

function withStylesheet(xml: string, stylesheet: string) {
  return xml.replace(
    /^<\?xml[^>]*\?>/,
    (declaration) => `${declaration}\n<?xml-stylesheet type="text/xsl" href="${stylesheet}"?>`
  )
}

const FEED_CACHE_CONTROL = 'public, max-age=3600, s-maxage=86400'

/**
 * RSS 2.0
 */
export async function generateRSS(context: APIContext) {
  const feed = await generateFeedInstance(context)
  return new Response(withStylesheet(feed.rss2(), '/feeds/rss-style.xsl'), {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': FEED_CACHE_CONTROL
    }
  })
}

/**
 * Atom 1.0
 */
export async function generateAtom(context: APIContext) {
  const feed = await generateFeedInstance(context)
  return new Response(withStylesheet(feed.atom1(), '/feeds/atom-style.xsl'), {
    headers: {
      'Content-Type': 'application/atom+xml; charset=utf-8',
      'Cache-Control': FEED_CACHE_CONTROL
    }
  })
}

/**
 * JSON Feed 1.0
 */
export async function generateJSONFeed(context: APIContext) {
  const feed = await generateFeedInstance(context)
  return new Response(feed.json1(), {
    headers: {
      'Content-Type': 'application/feed+json; charset=utf-8',
      'Cache-Control': FEED_CACHE_CONTROL
    }
  })
}
