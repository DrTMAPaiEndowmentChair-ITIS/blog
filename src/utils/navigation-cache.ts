/** Tab-local, short-lived HTML only. Never persists a document across releases/reloads. */
export class PageCache<T> {
  private entries = new Map<string, { value: T; bytes: number; expires: number }>()
  private bytes = 0
  constructor(
    private readonly maxEntries = 8,
    private readonly maxBytes = 3 * 1024 * 1024,
    private readonly lifetime = 60_000,
    private readonly now = Date.now
  ) {}
  get(key: string): T | undefined {
    const entry = this.entries.get(key)
    if (!entry) return
    if (entry.expires <= this.now()) {
      this.delete(key)
      return
    }
    this.entries.delete(key)
    this.entries.set(key, entry)
    return entry.value
  }
  set(key: string, value: T, bytes: number) {
    this.delete(key)
    if (bytes > this.maxBytes) return
    while (
      this.entries.size &&
      (this.entries.size >= this.maxEntries || this.bytes + bytes > this.maxBytes)
    ) {
      const oldest = this.entries.keys().next().value
      if (oldest === undefined) break
      this.delete(oldest)
    }
    this.entries.set(key, { value, bytes, expires: this.now() + this.lifetime })
    this.bytes += bytes
  }
  private delete(key: string) {
    const entry = this.entries.get(key)
    if (entry) this.bytes -= entry.bytes
    this.entries.delete(key)
  }
}

/** Only the static site's HTML routes. Homepage query parameters are client-side filters. */
export function pageKey(href: string, base: string): string | undefined {
  try {
    const url = new URL(href, base)
    if (url.origin !== new URL(base).origin || !/^\/(?:[a-z0-9_-]+\/?)?$/i.test(url.pathname))
      return
    url.hash = ''
    if (url.pathname === '/') url.search = ''
    else url.pathname = url.pathname.replace(/\/$/, '')
    return url.href
  } catch {
    return
  }
}
