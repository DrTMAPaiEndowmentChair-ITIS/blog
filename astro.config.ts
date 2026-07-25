import { defineConfig } from 'astro/config'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import playformInline from '@playform/inline'
import remarkMath from 'remark-math'
import remarkDirective from 'remark-directive'
import rehypeKatex from 'rehype-katex'
import remarkEmbeddedMedia from './src/plugins/remark-embedded-media.mjs'
import remarkReadingTime from './src/plugins/remark-reading-time.mjs'
import rehypeCleanup from './src/plugins/rehype-cleanup.mjs'
import rehypeImageProcessor from './src/plugins/rehype-image-processor.mjs'
import rehypeCopyCode from './src/plugins/rehype-copy-code.mjs'
import remarkTOC from './src/plugins/remark-toc.mjs'
import { themeConfig } from './src/config'
import { imageConfig } from './src/utils/image-config'
import path from 'path'
import netlify from '@astrojs/netlify'

export default defineConfig({
  adapter: netlify(), // Set adapter for deployment, or set `linkCard` to `false` in `src/config.ts`
  site: themeConfig.site.website,
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
      config: imageConfig
    }
  },
  // Every internal link warms itself on hover/focus (and on touchstart for
  // pointerless devices), so by the time a click lands the HTML is usually
  // already in cache and navigation is just a swap.
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover'
  },
  experimental: {
    // Upgrades those prefetches to real speculation-rules prerenders where the
    // browser supports it: the next page is parsed and painted off-screen, so
    // the transition starts against a live document instead of a fresh parse.
    clientPrerender: true
  },
  // Conventional feed paths readers probe for, pointing at the real endpoints.
  redirects: {
    '/feed': '/rss.xml',
    '/feed.xml': '/rss.xml',
    '/rss': '/rss.xml',
    '/index.xml': '/rss.xml',
    '/atom': '/atom.xml'
  },
  markdown: {
    shikiConfig: {
      theme: 'css-variables',
      wrap: false
    },
    remarkPlugins: [remarkMath, remarkDirective, remarkEmbeddedMedia, remarkReadingTime, remarkTOC],
    rehypePlugins: [rehypeKatex, rehypeCleanup, rehypeImageProcessor, rehypeCopyCode]
  },
  integrations: [
    playformInline({
      Exclude: [(file) => file.toLowerCase().includes('katex')]
    }),
    mdx(),
    sitemap()
  ],
  vite: {
    resolve: {
      alias: {
        '@': path.resolve('./src')
      }
    }
  },
  devToolbar: {
    enabled: false
  },
  server: {
    // Bind all interfaces so the dev server is reachable over the network and
    // from tooling that can't resolve Astro's default IPv6-only localhost.
    host: true
  }
})
