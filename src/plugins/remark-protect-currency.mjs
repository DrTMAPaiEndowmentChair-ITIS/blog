import { visit } from 'unist-util-visit'

/**
 * Undo currency false positives from remark-math.
 *
 * remark-math / micromark-extension-math tokenize `$…$` at parse time, so a
 * pre-pass cannot escape currency. After math nodes exist, turn spans that are
 * clearly money prose (e.g. `$150M … $800M`, `$2 to $60`) back into literal
 * text. Real TeX is left as `inlineMath` / `math`.
 *
 * Must run after `remark-math` and before `remark-has-math`.
 */
export default function remarkProtectCurrency() {
  return (tree) => {
    visit(tree, 'inlineMath', (node, index, parent) => {
      if (index == null || !parent) return
      if (!isCurrencyFalsePositive(node.value)) return

      // Restore both delimiters: micromark consumed the closer, which is often
      // the opener of the next amount (`$2 to $60` → math "2 to " + text "60").
      parent.children[index] = {
        type: 'text',
        value: `$${node.value}$`
      }
    })
  }
}

function isCurrencyFalsePositive(inner) {
  const trimmed = inner.trim()
  if (!trimmed) return false

  // Pure number between dollars is intentional math (`$2048$`, `$30$`).
  if (/^[\d.]+$/.test(trimmed)) return false

  // TeX markers / simple expressions — keep as math.
  if (/[\\^_{}=]/.test(inner)) return false
  if (/[\d.]\s*\/\s*[A-Za-z\\]/.test(inner)) return false
  if (/[A-Za-z\\]\s*\/\s*[\dA-Za-z\\]/.test(inner)) return false

  // `$150M…`, `$340K…`, `$18.8M…`
  if (/^\d[\d.]*[KMBTkb]\b/.test(trimmed)) return true

  // `$3,499…` spanning to a later `$`
  if (/^\d{1,3}(,\d{3})+/.test(trimmed)) return true

  // `$30.74 billion…`, `$2.1 million…`
  if (/^\d[\d.]*\s+(million|billion|trillion)\b/i.test(trimmed)) return true
  if (/\b(million|billion|trillion)\b/i.test(inner) && /^\d/.test(trimmed)) return true

  // `$2 to …`, `$70 USB…` — number then prose, no TeX.
  if (/^\d[\d.]*\s+[A-Za-z]/.test(trimmed)) return true

  return false
}
