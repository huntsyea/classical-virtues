/**
 * Typesetting only: straight typewriter quotes become curly quotes, as a
 * printer would set them. The words and punctuation marks are unchanged; only
 * the glyphs differ. Use it for any reader-facing text (titles, deks, morals,
 * source lines); leave metadata and structured data raw. Pure, so it is safe
 * in server and client components alike. Cases: `typography.test.mjs`.
 */
const OPENER = '(^|[\\s(\\[{\\u2014\\u2013/\\u201C\\u2018])'

/**
 * Elisions that take an apostrophe even where an opening quote would go:
 * 'tis, 'twas and 'til; lowercase 'neath, 'round and 'em ("'Em" at a quote's start is usually a name),
 * the 'n' of rock 'n' roll, and decades like '90s. A bare "'N" ("'N-no") or
 * "'10" ("'10 men came,' she said") stays an opening quote.
 */
const ELISION = new RegExp(OPENER + "'(?=(?:[Tt]is|[Tt]was|[Tt]il|neath|round|em)\\b|n'(?:\\s|$)|\\d0s\\b)", 'gm')

export function smartQuotes<T extends string | null | undefined>(text: T): T {
  if (!text) return text
  return text
    .replace(new RegExp(OPENER + '"', 'gm'), '$1“')
    .replace(/"/g, '”')
    .replace(ELISION, '$1’')
    .replace(new RegExp(OPENER + "'", 'gm'), '$1‘')
    .replace(/'/g, '’') as T
}
