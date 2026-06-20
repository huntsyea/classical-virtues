/**
 * SEO-surface hardening helpers.
 *
 * These keep the metadata / OpenGraph / structured-data path resilient: a
 * missing CMS field (summary, image alt) or an over-long string (OG overlay
 * text) degrades gracefully instead of producing an empty meta description or a
 * broken share image. None of these touch the story body or prose. They only
 * harden the technical SEO surfaces named in the SEO contract (`SEO.md`).
 */

/** Brand-safe default used when a story has no usable summary at all. */
export const DEFAULT_SUMMARY =
  'A short story from the Classical Virtues anthology, teaching virtue through character and choice.'

/**
 * Collapse whitespace and trim a string into a single clean line, or '' when
 * there is nothing usable.
 */
function clean(value: string | null | undefined): string {
  return value?.replace(/\s+/g, ' ').trim() ?? ''
}

/**
 * Truncate at a word boundary and append an ellipsis. Falls back to a hard cut
 * when there is no sensible space to break on.
 */
function truncate(value: string, maxLen: number): string {
  if (value.length <= maxLen) return value
  const slice = value.slice(0, maxLen - 1)
  const lastSpace = slice.lastIndexOf(' ')
  const body = lastSpace > Math.floor(maxLen / 2) ? slice.slice(0, lastSpace) : slice
  return `${body.trimEnd()}…`
}

/**
 * Resolve the summary used for the meta description, OG/Twitter description,
 * and Article schema. Fallback chain so the field is never empty (it is a
 * single point of failure across four SEO surfaces):
 *   1. the editorial `summary`
 *   2. a trimmed excerpt of the story prose
 *   3. a brand default
 */
export function resolveSummary(
  summary: string | null | undefined,
  plainText?: string | null,
): string {
  const editorial = clean(summary)
  if (editorial) return editorial

  const excerpt = clean(plainText)
  if (excerpt) return truncate(excerpt, 155)

  return DEFAULT_SUMMARY
}

/**
 * Image alt text with a concrete, descriptive fallback when the CMS alt is
 * empty or whitespace-only. Keeps the `<img alt>` wired end-to-end.
 */
export function resolveImageAlt(
  alt: string | null | undefined,
  title: string,
): string {
  return clean(alt) || `Illustration for ${title}`
}

/**
 * Fit overlay text into the fixed 1200×630 OG canvas. Longer strings get a
 * smaller font and anything beyond `max` characters is hard-truncated, so the
 * "classicalvirtues.com" footer can never be pushed off the image.
 */
export function fitOgText(
  value: string,
  { max = 180, large = 36, medium = 30, small = 24 }: {
    max?: number
    large?: number
    medium?: number
    small?: number
  } = {},
): { text: string; fontSize: number } {
  const text = truncate(clean(value), max)
  let fontSize = large
  if (text.length > 80) fontSize = medium
  if (text.length > 140) fontSize = small
  return { text, fontSize }
}

/**
 * Fit the OG title (the prominent heading). Same idea as {@link fitOgText} but
 * with a larger type scale and a tighter character budget.
 */
export function fitOgTitle(
  value: string,
  fallback = 'Classical Virtues',
): { text: string; fontSize: number } {
  const source = clean(value) || fallback
  const text = truncate(source, 90)
  let fontSize = 64
  if (text.length > 36) fontSize = 52
  if (text.length > 60) fontSize = 44
  return { text, fontSize }
}
