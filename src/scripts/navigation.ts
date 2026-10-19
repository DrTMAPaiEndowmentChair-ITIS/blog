import { PageCache, pageKey } from '../utils/navigation-cache'

type Page = { document: Document }
type Asset = { ready: Promise<void>; link: HTMLLinkElement; loaded: boolean }
const cache = new PageCache<Page>()
const pending = new Map<string, Promise<Page | undefined>>()
const assets = new Map<string, Asset>()
const parser = new DOMParser()
let active = 0
let loadingTimer = 0

function warmAsset(href: string, base: string, module: boolean) {
  const url = new URL(href, base)
  if (url.origin !== location.origin) return Promise.resolve()
  const key = `${module ? 'module' : 'style'}:${url.href}`
  const existing = assets.get(key)
  if (existing && (existing.loaded || existing.link.isConnected)) return existing.ready
  if (
    document.querySelector(
      `link[rel="stylesheet"][href="${CSS.escape(href)}"], script[src="${CSS.escape(href)}"]`
    )
  )
    return Promise.resolve()
  const link = document.createElement('link')
  const asset: Asset = { link, loaded: false, ready: Promise.resolve() }
  asset.ready = new Promise<void>((resolve) => {
    link.rel = module ? 'modulepreload' : 'preload'
    if (!module) link.as = 'style'
    link.href = url.href
    link.fetchPriority = 'low'
    link.onload = link.onerror = () => {
      asset.loaded = true
      resolve()
    }
    document.head.append(link)
  })
  assets.set(key, asset)
  return asset.ready
}

function warmStyles(doc: Document, url: string) {
  return Promise.all(
    [...doc.querySelectorAll<HTMLLinkElement>('head link[rel="stylesheet"]')].map((link) =>
      warmAsset(link.getAttribute('href') ?? '', url, false)
    )
  )
}

function preparePage(html: string, url: string): Page | undefined {
  const doc = parser.parseFromString(html, 'text/html')
  if (!doc.querySelector('meta[name="astro-view-transitions-enabled"]')) return
  doc.querySelectorAll('noscript').forEach((node) => node.remove())
  void warmStyles(doc, url)
  for (const script of doc.querySelectorAll<HTMLScriptElement>('script[type="module"][src]')) {
    void warmAsset(script.getAttribute('src') ?? '', url, true)
  }
  return { document: doc }
}

function preload(key: string): Promise<Page | undefined> {
  const ready = cache.get(key)
  if (ready) return Promise.resolve(ready)
  const inFlight = pending.get(key)
  if (inFlight) return inFlight
  const request = (async () => {
    try {
      const response = await fetch(key, {
        priority: 'low',
        credentials: 'same-origin',
        signal: AbortSignal.timeout(8000)
      })
      // Redirects and non-HTML responses stay with Astro's normal loader.
      if (
        !response.ok ||
        response.redirected ||
        !response.headers.get('content-type')?.includes('text/html')
      )
        return
      const html = await response.text()
      const page = preparePage(html, key)
      if (page) cache.set(key, page, html.length * 2)
      return page
    } catch {
      return
    } finally {
      pending.delete(key)
    }
  })()
  pending.set(key, request)
  return request
}

function eligibleLink(target: EventTarget | null) {
  if (!(target instanceof Element)) return
  const link = target.closest<HTMLAnchorElement>('a[href]')
  if (
    !link ||
    link.hasAttribute('download') ||
    link.hasAttribute('data-astro-reload') ||
    link.dataset.astroPrefetch === 'false' ||
    (link.target && link.target !== '_self')
  )
    return
  const key = pageKey(link.href, location.href)
  if (!key || key === pageKey(location.href, location.href)) return
  return key
}

// Conserve data on constrained connections. Explicit navigation always uses the router.
function canWarm() {
  const connection = Reflect.get(navigator, 'connection')
  return (
    navigator.onLine &&
    !connection?.saveData &&
    !['slow-2g', '2g'].includes(connection?.effectiveType)
  )
}

function warmLink(target: EventTarget | null) {
  const key = eligibleLink(target)
  if (key && canWarm()) void preload(key)
}

// Intent events do not have a hover timer, and reuse any viewport request in flight.
for (const name of ['pointerover', 'focusin', 'pointerdown', 'touchstart']) {
  document.addEventListener(name, (event) => warmLink(event.target), { passive: true })
}

let observer: IntersectionObserver | undefined
const queue = new Set<string>()
let backgroundBudget = 4
let observedPage = location.href
function pump() {
  while (active < 2 && queue.size && backgroundBudget > 0 && canWarm()) {
    const key = queue.values().next().value
    if (!key) break
    queue.delete(key)
    if (cache.get(key) || pending.has(key)) continue
    backgroundBudget--
    active++
    void preload(key).finally(() => {
      active--
      pump()
    })
  }
}
function observeLinks() {
  observer?.disconnect()
  queue.clear()
  if (!canWarm()) return
  observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const key = eligibleLink(entry.target)
      if (!key) continue
      if (entry.isIntersecting) {
        queue.add(key)
        observer?.unobserve(entry.target)
      }
      // An offscreen row may duplicate a visible hero; it must not cancel that request.
    }
    pump()
  })
  for (const link of document.querySelectorAll(
    '.hero-card, [data-post] a[href], .back-button, .prose a[href]'
  )) {
    if (eligibleLink(link)) observer.observe(link)
  }
}

document.addEventListener('astro:before-preparation', (event) => {
  observer?.disconnect()
  queue.clear()
  clearTimeout(loadingTimer)
  loadingTimer = window.setTimeout(
    () => document.documentElement.setAttribute('data-navigating', ''),
    140
  )
  const key = pageKey(event.to.href, location.href)
  if (!key || event.formData || event.sourceElement?.closest('form, [data-astro-reload]')) return
  const ready = cache.get(key)
  const request = pending.get(key)
  const originalLoader = event.loader
  event.loader = async () => {
    const page = ready ?? (await request)
    if (event.signal.aborted) return
    if (page) {
      await warmStyles(page.document, event.to.href)
      const snapshot = page.document.cloneNode(true)
      if (!event.signal.aborted && snapshot instanceof Document) event.newDocument = snapshot
      return
    }
    // Cache misses and failed speculative requests retain Astro's own loader,
    // including redirects, non-HTML responses, and full-navigation fallbacks.
    await originalLoader()
    const resolvedKey = pageKey(event.to.href, location.href)
    if (resolvedKey && !event.signal.aborted && !event.defaultPrevented) {
      const html = event.newDocument.documentElement.outerHTML
      const loaded = preparePage(html, resolvedKey)
      if (loaded) cache.set(resolvedKey, loaded, html.length * 2)
    }
  }
})

document.addEventListener('astro:before-swap', (event) => {
  // Skip page snapshots/fades; theme switching uses its own independent transition.
  void event.viewTransition.ready.catch(() => {})
  event.viewTransition.skipTransition()
})
for (const name of ['astro:after-swap', 'astro:page-load'])
  document.addEventListener(name, () => {
    clearTimeout(loadingTimer)
    document.documentElement.removeAttribute('data-navigating')
  })
document.addEventListener('astro:page-load', () => {
  if (observedPage !== location.href) backgroundBudget = 4
  observedPage = location.href
  observeLinks()
})
const connection = Reflect.get(navigator, 'connection')
if (connection instanceof EventTarget) connection.addEventListener('change', observeLinks)
requestAnimationFrame(observeLinks)
