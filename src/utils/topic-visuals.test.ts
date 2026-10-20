import { describe, expect, test } from 'bun:test'
import { readdir } from 'node:fs/promises'
import type { TopicVisualRegistry } from '../types/topic-visuals'

const registryDirectory = new URL('../data/topic-visuals/', import.meta.url)
const modules = await Promise.all(
  (await readdir(registryDirectory))
    .filter((file) => file.endsWith('.ts') && file !== 'index.ts')
    .map((file) => import(new URL(file, registryDirectory).href))
)
const registries: TopicVisualRegistry[] = modules.flatMap((module) => Object.values(module))
const allEntries = registries.flatMap((registry) => Object.entries(registry))
const allVisuals = allEntries.flatMap(([, entry]) => entry.visuals)
const postSlugs = (await readdir(new URL('../content/posts/', import.meta.url)))
  .filter((file) => file.endsWith('.mdx'))
  // Astro's glob loader normalizes uppercase filenames such as HPC-guide.mdx.
  .map((file) => file.slice(0, -4).toLowerCase())

describe('article visual coverage', () => {
  test('every published article has one registered pair', () => {
    const slugs = allEntries.map(([slug]) => slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    expect([...slugs].sort()).toEqual([...postSlugs].sort())
    for (const [slug, entry] of allEntries) {
      expect(entry.visuals.length, slug).toBe(2)
      expect(new Set(entry.visuals.map((visual) => visual.kind)).size, slug).toBe(2)
    }
  })

  test('figure identifiers cannot collide across the complete site', () => {
    const ids = allVisuals.map((visual) => visual.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[a-zA-Z][a-zA-Z0-9-]+$/)
  })

  test('numeric plots have usable domains, units, and finite values', () => {
    for (const visual of allVisuals) {
      if (visual.kind === 'bars') {
        expect(visual.unit.trim().length, visual.id).toBeGreaterThan(0)
        expect(visual.rows.length, visual.id).toBeGreaterThan(1)
        for (const row of visual.rows) expect(Number.isFinite(row.value), visual.id).toBe(true)
      }
      if (visual.kind === 'line') {
        expect(visual.xLabel.trim().length, visual.id).toBeGreaterThan(0)
        expect(visual.yLabel.trim().length, visual.id).toBeGreaterThan(0)
        expect(visual.points.length, visual.id).toBeGreaterThan(1)
        expect(new Set(visual.points.map((point) => point.x)).size, visual.id).toBeGreaterThan(1)
        for (const point of visual.points) {
          expect(Number.isFinite(point.x) && Number.isFinite(point.y), visual.id).toBe(true)
        }
      }
    }
  })

  test('matrix rows agree with their column headers', () => {
    for (const visual of allVisuals) {
      if (visual.kind !== 'matrix') continue
      for (const row of visual.rows) expect(row.cells.length, visual.id).toBe(visual.columns.length)
    }
  })

  test('every figure contains its explanation and visible data', () => {
    for (const visual of allVisuals) {
      for (const text of [visual.title, visual.description, visual.takeaway]) {
        expect(text.trim().length, visual.id).toBeGreaterThan(0)
      }
      if (visual.kind === 'flow' || visual.kind === 'sequence') {
        expect(visual.steps.length, visual.id).toBeGreaterThan(1)
        for (const step of visual.steps)
          expect(step.detail.trim().length, visual.id).toBeGreaterThan(0)
      }
      if (visual.kind === 'compare') {
        expect(visual.columns.length, visual.id).toBeGreaterThan(1)
        for (const column of visual.columns)
          expect(column.points.length, visual.id).toBeGreaterThan(0)
      }
      for (const source of visual.sources ?? []) {
        const url = new URL(source.href, 'https://blog.ecitis.org')
        expect(['http:', 'https:'].includes(url.protocol), visual.id).toBe(true)
      }
    }
  })
})
