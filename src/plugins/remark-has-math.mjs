import { visit } from 'unist-util-visit'

/**
 * Sets `hasMath` on Astro frontmatter when the document contains math nodes
 * produced by remark-math, so layouts can ship KaTeX CSS only on those pages.
 */
export default function remarkHasMath() {
  return (tree, file) => {
    let hasMath = false

    visit(tree, (node) => {
      if (node.type === 'math' || node.type === 'inlineMath') {
        hasMath = true
        return false
      }
    })

    file.data.astro ??= {}
    file.data.astro.frontmatter ??= {}
    file.data.astro.frontmatter.hasMath = hasMath
  }
}
