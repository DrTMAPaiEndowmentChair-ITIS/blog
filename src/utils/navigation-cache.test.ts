import { expect, test } from 'bun:test'
import { PageCache, pageKey } from './navigation-cache'

test('navigation keys preserve route semantics and reject downloads or external origins', () => {
  const base = 'https://blog.ecitis.org/'
  expect(pageKey('/article/#section', base)).toBe(base + 'article')
  expect(pageKey('/article?version=2#section', base)).toBe(base + 'article?version=2')
  expect(pageKey('/?category=Models#results', base)).toBe(base)
  for (const url of [
    'https://example.org/article',
    '//example.org/',
    'mailto:a@example.org',
    'javascript:alert(1)',
    '/rss.xml',
    '/fonts/font.woff2',
    '/_astro/entry.js'
  ])
    expect(pageKey(url, base)).toBeUndefined()
})
test('cache expiry is absolute and cannot be extended by frequent reads', () => {
  let now = 0
  const cache = new PageCache<string>(3, 100, 10, () => now)
  cache.set('a', 'first', 10)
  now = 9
  expect(cache.get('a')).toBe('first')
  now = 10
  expect(cache.get('a')).toBeUndefined()
  cache.set('a', 'new release', 10)
  expect(cache.get('a')).toBe('new release')
})
test('entry and byte limits evict the least recently used document', () => {
  const cache = new PageCache<string>(2, 100)
  cache.set('a', 'a', 40)
  cache.set('b', 'b', 40)
  expect(cache.get('a')).toBe('a')
  cache.set('c', 'c', 40)
  expect(cache.get('b')).toBeUndefined()
  expect(cache.get('a')).toBe('a')
  cache.set('d', 'd', 70)
  expect(cache.get('a')).toBeUndefined()
  expect(cache.get('c')).toBeUndefined()
  expect(cache.get('d')).toBe('d')
  cache.set('oversize', 'too large', 101)
  expect(cache.get('oversize')).toBeUndefined()
  expect(cache.get('d')).toBe('d')
})
test('replacing or expiring a document releases its accounted bytes', () => {
  let now = 0
  const cache = new PageCache<string>(8, 100, 10, () => now)
  cache.set('a', 'large', 90)
  cache.set('a', 'small', 10)
  cache.set('b', 'other', 80)
  expect(cache.get('a')).toBe('small')
  expect(cache.get('b')).toBe('other')
  now = 10
  expect(cache.get('a')).toBeUndefined()
  expect(cache.get('b')).toBeUndefined()
  cache.set('c', 'full', 100)
  expect(cache.get('c')).toBe('full')
})
