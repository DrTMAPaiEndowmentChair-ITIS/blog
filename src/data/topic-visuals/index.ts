import type { TopicVisualRegistry } from '../../types/topic-visuals'

const modules = import.meta.glob<Record<string, TopicVisualRegistry>>(['./*.ts', '!./index.ts'], {
  eager: true
})

export const topicVisuals: TopicVisualRegistry = {}
for (const module of Object.values(modules)) {
  for (const registry of Object.values(module)) {
    for (const [slug, entry] of Object.entries(registry)) {
      if (Object.hasOwn(topicVisuals, slug)) {
        throw new Error(`Duplicate visual explanations for ${slug}`)
      }
      topicVisuals[slug] = entry
    }
  }
}
