import type { APIRoute } from 'astro'
import { getFilteredPosts } from '@/utils/draft'
import { generateThumbnail } from '@/utils/thumbnail'

export const GET: APIRoute = async () => {
  const posts = await getFilteredPosts()
  const symbols = posts.map((post) => {
    const { markup, viewBox } = generateThumbnail(post.id, post.data.category, 'row')
    return `<symbol id="row-${post.id}" viewBox="${viewBox}">${markup}</symbol>`
  })

  return new Response(
    `<svg xmlns="http://www.w3.org/2000/svg"><defs>${symbols.join('')}</defs></svg>`,
    { headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' } }
  )
}
