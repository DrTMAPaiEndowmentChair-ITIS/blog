import { HTMLElement, type Node as HtmlNode } from 'node-html-parser'

/**
 * Allowlist sanitizer for feed HTML.
 *
 * Runs on an already-parsed `node-html-parser` tree so we do not need
 * `sanitize-html` (and its second htmlparser2/entities stack). Behavior matches
 * the previous sanitize-html options used by `feed.ts`.
 */

const MATHML_TAGS = new Set([
  'math',
  'semantics',
  'annotation-xml',
  'maction',
  'menclose',
  'merror',
  'mfenced',
  'mfrac',
  'mi',
  'mmultiscripts',
  'mn',
  'mo',
  'mover',
  'mpadded',
  'mphantom',
  'mprescripts',
  'mroot',
  'mrow',
  'ms',
  'mspace',
  'msqrt',
  'mstyle',
  'msub',
  'msubsup',
  'msup',
  'mtable',
  'mtd',
  'mtext',
  'mtr',
  'munder',
  'munderover',
  'none'
])

const ALLOWED_TAGS = new Set([
  'address',
  'article',
  'aside',
  'footer',
  'header',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hgroup',
  'main',
  'nav',
  'section',
  'blockquote',
  'dd',
  'div',
  'dl',
  'dt',
  'figcaption',
  'figure',
  'hr',
  'li',
  'menu',
  'ol',
  'p',
  'pre',
  'ul',
  'a',
  'abbr',
  'b',
  'bdi',
  'bdo',
  'br',
  'cite',
  'code',
  'data',
  'dfn',
  'em',
  'i',
  'kbd',
  'mark',
  'q',
  'rb',
  'rp',
  'rt',
  'rtc',
  'ruby',
  's',
  'samp',
  'small',
  'span',
  'strong',
  'sub',
  'sup',
  'time',
  'u',
  'var',
  'wbr',
  'caption',
  'col',
  'colgroup',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'img',
  ...MATHML_TAGS
])

/** Drop element and descendants (no text leakage). */
const DROP_TAGS = new Set(['script', 'style', 'noscript', 'template', 'textarea', 'title'])

const GLOBAL_ATTRS = new Set(['class', 'id', 'dir', 'lang'])

const TAG_ATTRS: Record<string, ReadonlySet<string>> = {
  a: new Set(['href', 'title', 'rel', 'name']),
  img: new Set(['src', 'alt', 'title', 'width', 'height', 'loading', 'decoding']),
  td: new Set(['colspan', 'rowspan', 'align']),
  th: new Set(['colspan', 'rowspan', 'align', 'scope']),
  time: new Set(['datetime']),
  math: new Set(['display', 'xmlns']),
  mo: new Set(['stretchy', 'fence', 'separator', 'lspace', 'rspace', 'maxsize', 'minsize']),
  mi: new Set(['mathvariant']),
  mn: new Set(['mathvariant']),
  ms: new Set(['mathvariant']),
  mtext: new Set(['mathvariant']),
  mspace: new Set(['width', 'height', 'depth']),
  mstyle: new Set(['displaystyle', 'scriptlevel', 'mathvariant']),
  mtable: new Set(['columnalign', 'rowspacing', 'columnspacing', 'displaystyle']),
  mtd: new Set(['columnalign', 'colspan', 'rowspan']),
  mover: new Set(['accent']),
  munder: new Set(['accentunder']),
  munderover: new Set(['accent', 'accentunder']),
  mpadded: new Set(['width', 'height', 'depth', 'lspace', 'voffset'])
}

const URL_ATTRS = new Set(['href', 'src'])
const ALLOWED_SCHEMES = /^(?:https?|mailto):/i

function isElement(node: HtmlNode): node is HTMLElement {
  return node instanceof HTMLElement
}

function isAllowedAttr(tag: string, name: string) {
  if (GLOBAL_ATTRS.has(name)) return true
  return TAG_ATTRS[tag]?.has(name) ?? false
}

function isSafeUrl(value: string) {
  // Browsers ignore ASCII controls in URL schemes; normalize before checking.
  // eslint-disable-next-line no-control-regex
  const trimmed = value.replace(/[\u0000-\u0020\u007f]/g, '').trim()
  if (!trimmed) return false
  // Allow in-page / relative paths used after absolutizeUrls.
  if (trimmed.startsWith('#') || trimmed.startsWith('/') || trimmed.startsWith('./')) return true
  if (ALLOWED_SCHEMES.test(trimmed)) return true
  // Protocol-relative
  if (trimmed.startsWith('//')) return true
  // Reject javascript:/data: etc.; allow bare relative filenames.
  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed)) return false
  return true
}

/**
 * Sanitize `root` in place and return its serialized HTML.
 */
export function sanitizeFeedHtml(root: HTMLElement): string {
  sanitizeNode(root)
  return root.toString().trim()
}

function sanitizeNode(node: HTMLElement) {
  // Copy first — mutation while iterating childNodes is unsafe.
  const children = [...node.childNodes]

  for (const child of children) {
    if (!isElement(child)) continue

    const tag = child.rawTagName.toLowerCase()

    if (DROP_TAGS.has(tag)) {
      child.remove()
      continue
    }

    if (!ALLOWED_TAGS.has(tag)) {
      // Unwrap: keep children, drop the element shell.
      sanitizeNode(child)
      child.replaceWith(...child.childNodes)
      continue
    }

    const allowed = Object.keys(child.attributes).filter((name) => {
      const lower = name.toLowerCase()
      if (lower.startsWith('on')) return false
      if (!isAllowedAttr(tag, lower)) return false
      if (URL_ATTRS.has(lower) && !isSafeUrl(child.getAttribute(name) ?? '')) return false
      return true
    })
    const keep = new Set(allowed)
    for (const name of Object.keys(child.attributes)) {
      if (!keep.has(name)) child.removeAttribute(name)
    }

    sanitizeNode(child)
  }
}
