import { visit } from 'unist-util-visit'

/**
 * Open a post's reference links in a new tab.
 *
 * The `## References` list at the foot of a post is remark's footnotes section,
 * built from the `[^n]: [title](url)` definitions in the source. It holds two
 * kinds of anchor: the source itself, and the `↩` back-links to each place it
 * was cited. Only the source leaves the site, so only the source gets a new
 * tab — sending a back-link to one would strand the reader in a second copy of
 * the page they are already reading.
 *
 * Links in the body are left alone. A reference is somewhere you go to check a
 * claim and then come back from, which is the case a new tab is actually for.
 */
export default function rehypeReferenceLinks() {
  return (tree) => {
    visit(tree, 'element', (section) => {
      if (section.tagName !== 'section') return

      // `data-footnotes` reaches hast camel-cased; the class is checked too so
      // the plugin survives either one being dropped.
      const properties = section.properties ?? {}
      const classes = properties.className ?? []
      const isFootnotes =
        properties.dataFootnotes !== undefined ||
        (Array.isArray(classes) ? classes.includes('footnotes') : classes === 'footnotes')
      if (!isFootnotes) return

      visit(section, 'element', (link) => {
        if (link.tagName !== 'a') return

        const href = link.properties?.href
        // Anything that is not an absolute http(s) URL stays in this tab: the
        // back-links are `#fragment`, and an internal reference is still a page
        // of this site.
        if (typeof href !== 'string' || !/^https?:\/\//i.test(href)) return

        link.properties.target = '_blank'
        link.properties.rel = ['noopener', 'noreferrer']
      })
    })
  }
}
