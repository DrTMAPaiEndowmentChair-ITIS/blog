import { generateJSONFeed } from '@/utils/feed'
import type { APIContext } from 'astro'

export const prerender = true

export const GET = (context: APIContext) => generateJSONFeed(context)
