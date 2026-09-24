import { toString } from 'mdast-util-to-string'

/** Words per minute — matches the classic `reading-time` default. */
const WPM = 200

/**
 * Remark plugin: word-count reading time on Astro frontmatter.
 * Local implementation — no `reading-time` dependency.
 */
export default function remarkReadingTime() {
  return function (tree, file) {
    const textOnPage = toString(tree)
    const words = countWords(textOnPage)
    const minutes = Math.max(1, Math.round(words / WPM))
    const time = Math.round((words / WPM) * 60_000)

    file.data.astro ??= {}
    file.data.astro.frontmatter ??= {}
    file.data.astro.frontmatter.minutesRead = `${minutes}min`
    file.data.astro.frontmatter.readingTime = {
      text: `${minutes}min`,
      minutes,
      time,
      words
    }
  }
}

function countWords(text) {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}
