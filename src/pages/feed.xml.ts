import { generateRSS } from '@/utils/feed'
import type { APIContext } from 'astro'

/**
 * `/feed.xml` is one of the paths readers probe by convention. It used to be a
 * host-level 301 to `/rss.xml`; without a server in front of the site the only
 * redirect a static build can emit is an HTML meta refresh, which a browser
 * follows and a feed reader does not. Serve the feed itself instead — its
 * `rel="self"` still points at `/rss.xml`, so a subscription made here is the
 * same subscription.
 */
export const prerender = true

export const GET = (context: APIContext) => generateRSS(context)
