import { existsSync } from 'node:fs'
import path from 'node:path'
import { getCollection } from 'astro:content'
import { OGImageRoute } from 'astro-og-canvas'
import { themeConfig } from '../../config'

const collectionEntries = await getCollection('posts')

// Map the array of content collection entries to create an object.
// Converts [{ id: 'post.md', data: { title: 'Example', pubDate: Date } }]
// to { 'post.md': { title: 'Example', pubDate: Date } }
const pages = Object.fromEntries(
  collectionEntries.map(({ id, data }) => [id.replace(/\.(md|mdx)$/, ''), data])
)

// Per-post generative backgrounds are pre-rendered by `scripts/generate-og-art.ts`
// during `prebuild`. Fall back to the static background if one is missing.
const generatedBgDir = path.resolve('public/og/gen')
const bgImagePath = (slug: string) => {
  const generated = path.join(generatedBgDir, `${slug}.png`)
  return existsSync(generated) ? `public/og/gen/${slug}.png` : 'public/og/og-bg.png'
}

export const { getStaticPaths, GET } = await OGImageRoute({
  param: 'route',
  pages,
  getImageOptions: (routePath, page) => ({
    title: page.title,
    description: themeConfig.site.title,
    logo: {
      path: 'public/og/og-logo.png',
      size: [80, 80]
    },
    bgGradient: [[255, 255, 255]],
    bgImage: {
      path: bgImagePath(routePath),
      fit: 'fill'
    },
    padding: 64,
    font: {
      title: {
        color: [28, 28, 28],
        size: 68,
        weight: 'SemiBold',
        families: ['PingFang SC']
      },
      description: {
        color: [180, 180, 180],
        size: 40,
        weight: 'Medium',
        families: ['PingFang SC']
      }
    },
    fonts: [
      'https://cdn.jsdelivr.net/npm/font-pingfang-sc-font-weight-improved@latest/PingFangSC-Medium.woff2',
      'https://cdn.jsdelivr.net/npm/font-pingfang-sc-font-weight-improved@latest/PingFangSC-Semibold.woff2'
    ]
  })
})
