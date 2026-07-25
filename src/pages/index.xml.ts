import { generateRSS } from '@/utils/feed'
import type { APIContext } from 'astro'

/** The other conventional probe path. See `feed.xml.ts` for why it is served
 * rather than redirected. */
export const prerender = true

export const GET = (context: APIContext) => generateRSS(context)
