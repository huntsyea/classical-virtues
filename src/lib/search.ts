/**
 * Story search that works without Basehub's hosted index.
 *
 * Shared by the server-rendered `/search?q=` page (the no-JS path) and the
 * client search box (its fallback when Basehub search is unavailable). Pure
 * and dependency-free so it is safe in both bundles.
 */

export interface SearchDoc {
  slug: string
  title: string
  summary: string
  /** Display virtue (the story eyebrow). */
  virtue: string
  canonicalVirtue: string | null
  subVirtue: string | null
  source: string | null
  /** Plain story text, for matching only. */
  text: string
  hasAudio: boolean
  readAloudMinutes: number
}

export interface SearchMatch<T extends SearchDoc = SearchDoc> {
  doc: T
  score: number
}

/** Lowercase, strip accents and punctuation, keep word characters. */
export function normalize(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

const STOP_WORDS = new Set(['a', 'an', 'and', 'the', 'of', 'to', 'in', 'on', 'for', 'story', 'stories', 'about'])

function tokenize(query: string): string[] {
  const tokens = normalize(query).split(' ').filter(Boolean)
  const meaningful = tokens.filter((t) => !STOP_WORDS.has(t))
  return meaningful.length ? meaningful : tokens
}

const FIELD_WEIGHTS: [keyof SearchDoc, number][] = [
  ['title', 10],
  ['canonicalVirtue', 7],
  ['subVirtue', 7],
  ['virtue', 6],
  ['source', 4],
  ['summary', 3],
  ['text', 1],
]

/** Word-start match ("hon" finds "honesty"), with a bonus for whole words. */
function fieldScore(field: string, token: string): number {
  const words = field.split(' ')
  if (words.includes(token)) return 1.5
  if (words.some((w) => w.startsWith(token))) return 1
  return token.length >= 4 && field.includes(token) ? 0.5 : 0
}

/**
 * Rank documents for a query. Every query word must match somewhere; matches
 * in the title and virtue outrank matches deep in the prose.
 */
export function searchDocs<T extends SearchDoc>(docs: T[], query: string, limit = 20): SearchMatch<T>[] {
  const tokens = tokenize(query)
  if (!tokens.length) return []

  const prepared = docs.map((doc) => ({
    doc,
    fields: FIELD_WEIGHTS.map(([key, weight]) => [normalize(String(doc[key] ?? '')), weight] as const),
  }))

  const matches: SearchMatch<T>[] = []
  for (const { doc, fields } of prepared) {
    let score = 0
    let allMatched = true
    for (const token of tokens) {
      let best = 0
      for (const [text, weight] of fields) best = Math.max(best, fieldScore(text, token) * weight)
      if (!best) {
        allMatched = false
        break
      }
      score += best
    }
    if (allMatched) matches.push({ doc, score })
  }

  return matches.sort((a, b) => b.score - a.score || a.doc.title.localeCompare(b.doc.title)).slice(0, limit)
}

/** Strip Markdown to plain words for the search index. */
export function markdownToText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_~`|-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
