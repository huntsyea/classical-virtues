import type { StoryData } from '@/lib/stories'
import { getVirtueSlugForStoryVirtue } from '@/lib/canon'

/**
 * The subset of StoryData that teasers need. Richer fields (read-aloud time,
 * narration length, blur placeholder, canon mapping, source) are optional so
 * cards render the same from a full story or from a lighter record.
 */
export type StoryLike = Pick<
  StoryData,
  'slug' | 'title' | 'image' | 'summary' | 'virtue' | 'audioUrl' | 'wordCount'
> &
  Partial<
    Pick<
      StoryData,
      | 'id'
      | 'dek'
      | 'imageAlt'
      | 'source'
      | 'readAloudMinutes'
      | 'imageBlurDataURL'
      | 'canonicalVirtue'
      | 'subVirtue'
      | 'audio'
    >
  >

/** Minutes to read aloud (the site's unit), at roughly 140 words a minute. */
export function readMinutes(story: Pick<StoryLike, 'wordCount' | 'readAloudMinutes'>): number {
  const provided = story.readAloudMinutes
  if (typeof provided === 'number' && provided > 0) return Math.round(provided)
  return Math.max(1, Math.round((story.wordCount || 0) / 140))
}

const NUMBER_WORDS = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']

/** "A three-minute story to read aloud": the reading time, set as a byline. */
export function readingLine(minutes: number): string {
  const word = NUMBER_WORDS[minutes] ?? String(minutes)
  const article = /^(eight|eleven|8|11|18)/.test(word) ? 'An' : 'A'
  return `${article} ${word}-minute story to read aloud`
}

export function hasAudio(story: Pick<StoryData, 'audioUrl'>): boolean {
  return Boolean(story.audioUrl)
}

export function storySource(story: Pick<StoryLike, 'source'>): string | null {
  const source = story.source
  return typeof source === 'string' && source.trim() ? source.trim() : null
}

/** An illustration credit, when the CMS provides one (never the alt text). */
export function imageCredit(story: object): string | null {
  const record = story as { imageCredit?: unknown; imageCaption?: unknown }
  const value = record.imageCredit ?? record.imageCaption
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function audioDurationSeconds(story: Pick<StoryLike, 'audio'>): number | null {
  const d = story.audio?.durationSeconds
  return typeof d === 'number' && Number.isFinite(d) && d > 0 ? d : null
}

export function blurFor(story: Pick<StoryLike, 'imageBlurDataURL'>): string | undefined {
  const value = story.imageBlurDataURL
  return typeof value === 'string' && value.startsWith('data:') ? value : undefined
}

/** The seven-virtue canon entry for a story, from the data layer or by lookup. */
export function canonFor(
  story: Pick<StoryLike, 'virtue' | 'canonicalVirtue'>,
): { slug: string; title: string } | null {
  if (story.canonicalVirtue?.slug) return story.canonicalVirtue
  const slug = getVirtueSlugForStoryVirtue(story.virtue)
  return slug ? { slug, title: slug.charAt(0).toUpperCase() + slug.slice(1) } : null
}

/**
 * The virtue labels a story shows, used identically on every surface: the
 * canonical virtue as the kicker, and the editorial angle (kindness, mercy,
 * honesty) as a quieter second label when it differs from the canon name.
 */
export function virtueLabels(
  story: Pick<StoryLike, 'virtue' | 'canonicalVirtue' | 'subVirtue'>,
): { canon: { slug: string; title: string } | null; primary: string; angle: string | null } {
  const canon = canonFor(story)
  const primary = canon?.title ?? story.virtue
  const rawAngle = story.subVirtue !== undefined ? story.subVirtue : story.virtue
  const angle = rawAngle && rawAngle.trim().toLowerCase() !== primary.toLowerCase() ? rawAngle.trim() : null
  return { canon, primary, angle }
}

export function virtueHref(storyVirtue: string): string | null {
  const slug = getVirtueSlugForStoryVirtue(storyVirtue)
  return slug ? `/virtues/${slug}` : null
}

export function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s < 10 ? '0' : ''}${s}`
}

/**
 * A teaser dek cut at a sentence boundary, never mid-phrase: whole sentences
 * up to about `max` characters (always at least the first sentence). The full
 * summary still appears on the story page itself.
 */
export function cardDek(summary: string | null | undefined, max = 150): string {
  const text = (summary ?? '').replace(/\s+/g, ' ').trim()
  if (!text) return ''
  const sentences = text.match(/[^.!?]+[.!?]+["”’)]*(\s|$)/g)?.map((x) => x.trim()) ?? [text]
  let out = sentences[0]
  for (const next of sentences.slice(1)) {
    if (out.length + 1 + next.length > max) break
    out = `${out} ${next}`
  }
  return out
}

/**
 * How to lay out a set of teasers so no grid ever leaves an orphan row or an
 * empty cell: one story as a wide feature, two side by side, full rows of
 * four, three, or five, and a single-column list for anything else.
 */
export type GridPlan =
  | { kind: 'grid'; className: string }
  | { kind: 'feature' }
  | { kind: 'pair' }
  | { kind: 'list' }

export function gridPlan(count: number): GridPlan {
  const even = count % 2 === 0
  if (count === 1) return { kind: 'feature' }
  if (count === 2) return { kind: 'pair' }
  if (count % 4 === 0) return { kind: 'grid', className: 'sm:grid-cols-2 lg:grid-cols-4' }
  if (count % 3 === 0) {
    return { kind: 'grid', className: even ? 'sm:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-3' }
  }
  if (count % 5 === 0) {
    return { kind: 'grid', className: even ? 'sm:grid-cols-2 lg:grid-cols-5' : 'lg:grid-cols-5' }
  }
  // Counts that cannot fill rows: a list reads best.
  return { kind: 'list' }
}

/** Newest first, by the date each story entered the collection: one order sitewide. */
export function byPublished<T extends { publishedAt?: string | null }>(a: T, b: T): number {
  return (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '')
}

export { roman } from '@/components/roman'
