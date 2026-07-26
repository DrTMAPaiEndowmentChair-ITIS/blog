import { visit } from 'unist-util-visit'

/**
 * Rehype plugin that puts each table in its own scroll container.
 *
 * A table can't scroll itself: `overflow-x` needs `display: block`, which drops
 * the table box out of the parent's layout and lets it shrink to its content —
 * so `width: 100%` stops applying and the row backgrounds end short of the
 * border. The wrapper takes the scrolling (and the frame) so the table can stay
 * a real table.
 */
export default function rehypeTableWrap() {
  return (tree) => {
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'table' || !parent || index === undefined) {
        return
      }
      if (parent.type === 'element' && parent.properties?.className?.includes('table-wrap')) {
        return
      }

      parent.children[index] = {
        type: 'element',
        tagName: 'div',
        properties: {
          className: ['table-wrap'],
          // A scroll container is unreachable by keyboard unless it can be
          // focused; Firefox does this on its own, other browsers don't.
          tabindex: 0
        },
        children: [node]
      }

      // Skip the wrapper we just inserted, resume inside it.
      return [visit.SKIP, index + 1]
    })
  }
}
