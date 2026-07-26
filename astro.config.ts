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

export default defineConfig({
  // No adapter: every route is prerendered, so the build is a directory of
  // static files that any host can serve.
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
  // Extensionless conveniences for anyone typing one into a browser. A static
  // build renders these as an HTML meta refresh rather than a 301, so the paths
  // a feed reader actually probes — /feed.xml and /index.xml — are served as
  // real feeds by their own endpoints instead of listed here.
  redirects: {
    '/feed': '/rss.xml',
    '/rss': '/rss.xml',
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
      Exclude: [(file) => file.toLowerCase().includes('katex')],
      Beasties: {
        /*
          Inlining decides per page which rules are needed above the fold, but
          it defaults to deleting whatever it inlines from the shared
          stylesheet. Anything it judges non-critical for one page is then gone
          for that page — `.prose table` survived on 33 posts and vanished from
          the one long enough to push its first table below the fold, which
          took the table's own horizontal scrolling with it and let the page
          widen past the viewport.

          Keep the stylesheet whole. The inlined copy still buys the faster
          first paint; it just stops being the only copy.
        */
        pruneSource: false
      }
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
