import { cache } from 'react'
import {
  getAllStories as getAllBasehubStories,
  getStoryBySlug as getBasehubStoryBySlug,
  hasBasehubToken,
  type BasehubStory,
} from './basehub'
import { getAudioDetails } from './audio'
import { getCanonBySlug, resolveCanonVirtue } from './canon'
import { resolveSummary, resolveImageAlt } from './seo'
import { markdownToText, searchDocs, type SearchDoc } from './search'

/** Read-aloud pace used across the site (words per minute). */
export const READ_ALOUD_WPM = 140

export interface StoryAudio {
  url: string
  mimeType: string
  /** Seconds, from the Basehub audio block or an MP3 header probe. */
  durationSeconds: number | null
  /** File size in bytes, needed for RSS enclosures. */
  byteLength: number | null
}

// Unified story interface. Fields after `wordCount` are additive: existing
// consumers keep compiling, new ones can opt in.
export interface StoryData {
  id: string
  slug: string
  title: string
  virtue: string
  image: string
  /** Concrete, descriptive alt text for the story image (from the CMS). */
  imageAlt: string
  summary: string
  /**
   * Editorial standfirst shown under the title and on cards: the CMS `dek`
   * when an editor has written one, else `summary`. `summary` stays the meta
   * description / feed / JSON-LD text, so the two can differ.
   */
  dek: string
  content: string
  virtueDescription: string
  audioUrl: string
  wordCount: number

  /** Public-domain or classical source note, e.g. "From Aesop's Fables". */
  source: string | null
  /** Publication date (ISO): the `publishedAt` field, else Basehub `_sys.createdAt`. */
  publishedAt: string
  /** Last revision (ISO): the `contentUpdatedAt` field, else Basehub `_sys.lastModifiedAt`. */
  updatedAt: string
  /** Intrinsic image size, so `next/image` can reserve space without `fill`. */
  imageWidth: number | null
  imageHeight: number | null
  /** Basehub aspect ratio string, e.g. "3/2". */
  imageAspectRatio: string | null
  /** Tiny inline placeholder for `placeholder="blur"`. */
  imageBlurDataURL: string | null
  /** Basehub's silent-reading estimate in minutes. */
  readingMinutes: number
  /** Minutes to read aloud at {@link READ_ALOUD_WPM}. */
  readAloudMinutes: number
  /** The seven-virtue canon entry this story belongs to, or null if unmapped. */
  canonicalVirtue: { slug: string; title: string } | null
  /** The editorial angle (kindness, mercy, honesty, …) when it differs from the canon name. */
  subVirtue: string | null
  /** Narration, when it exists. `audioUrl` stays as the plain-string shortcut. */
  audio: StoryAudio | null
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length
}

// Convert Basehub story to unified format
function basehubToStory(story: BasehubStory): StoryData | null {
  // Handle nullable content
  if (!story.content) {
    console.warn(`Story "${story._title}" has no content`)
    return null
  }

  const wordCount = countWords(story.content.plainText)
  const canon = getCanonBySlug(story.canonicalVirtue?._slug) ?? resolveCanonVirtue(story.subVirtue || story.virtue)
  const angle = story.subVirtue?.trim() || story.virtue?.trim() || ''
  const angleIsCanon = canon
    ? [canon.title, canon.alternateName].some((n) => n?.toLowerCase() === angle.toLowerCase())
    : false

  const audioUrl = story.audio?.url || story.audioUrl || ''
  const audio: StoryAudio | null = audioUrl
    ? {
        url: audioUrl,
        mimeType: story.audio?.mimeType || 'audio/mpeg',
        durationSeconds: story.audio?.duration ? Math.round(story.audio.duration) : null,
        byteLength: story.audio?.fileSize || null,
      }
    : null

  return {
    id: story._id,
    slug: story._slug,
    // Use _title from Basehub as the source for the unified title field
    title: story._title,
    virtue: story.virtue,
    image: story.image.url,
    // Always populated: concrete CMS alt, else a descriptive fallback.
    imageAlt: resolveImageAlt(story.image.alt, story._title),
    // Always populated: editorial summary, else prose excerpt, else brand default.
    // Feeds meta description, OG, Twitter, and Article schema with no single point of failure.
    summary: resolveSummary(story.summary, story.content.plainText),
    dek: story.dek?.replace(/\s+/g, ' ').trim() || resolveSummary(story.summary, story.content.plainText),
    content: story.content.markdown,
    virtueDescription: story.virtueDescription,
    audioUrl,
    wordCount,

    source: story.source?.trim() || null,
    // Editorial dates when the CMS has them; Basehub's bookkeeping dates otherwise.
    publishedAt: story.publishedAt || story._sys.createdAt,
    updatedAt: story.contentUpdatedAt || story._sys.lastModifiedAt,
    imageWidth: story.image.width || null,
    imageHeight: story.image.height || null,
    imageAspectRatio: story.image.aspectRatio || null,
    imageBlurDataURL: story.image.blurDataURL || null,
    readingMinutes: Math.max(1, story.content.readingTime || 0),
    readAloudMinutes: Math.max(1, Math.round(wordCount / READ_ALOUD_WPM)),
    canonicalVirtue: canon ? { slug: canon.slug, title: canon.title } : null,
    subVirtue: angle && !angleIsCanon ? angle : null,
    audio,
  }
}

/** Fill in narration duration and size when the CMS did not provide them. */
async function withAudioDetails(story: StoryData): Promise<StoryData> {
  if (!story.audio || (story.audio.durationSeconds && story.audio.byteLength)) return story
  const probed = await getAudioDetails(story.audio.url)
  return {
    ...story,
    audio: {
      ...story.audio,
      mimeType: story.audio.mimeType || probed.mimeType,
      durationSeconds: story.audio.durationSeconds ?? probed.durationSeconds,
      byteLength: story.audio.byteLength ?? probed.byteLength,
    },
  }
}

// Get all stories from Basehub
export const getAllStories = cache(async (): Promise<StoryData[]> => {
  if (!hasBasehubToken()) {
    console.warn('⚠️ BASEHUB_TOKEN not set')
    return []
  }

  // Errors propagate (see `handleBasehubError`): an outage must not look like an empty catalog.
  const basehubStories = await getAllBasehubStories()
  return basehubStories
    .map(basehubToStory)
    .filter((story): story is StoryData => story !== null)
})

/**
 * All stories with narration duration and byte length resolved. Use for
 * feeds and anything that emits enclosures; plain lists should prefer
 * {@link getAllStories}.
 */
export const getAllStoriesWithAudio = cache(async (): Promise<StoryData[]> => {
  const stories = await getAllStories()
  return Promise.all(stories.map(withAudioDetails))
})

// Get single story by slug from Basehub (narration details included)
export const getStoryBySlug = cache(async (slug: string): Promise<StoryData | null> => {
  if (!hasBasehubToken()) {
    console.warn('⚠️ BASEHUB_TOKEN not set')
    return null
  }

  // `null` means Basehub answered and the slug does not exist; errors propagate.
  const basehubStory = await getBasehubStoryBySlug(slug)
  const story = basehubStory ? basehubToStory(basehubStory) : null
  return story ? withAudioDetails(story) : null
})

/** Most recent edit across a set of stories, for sitemap and feed dates. */
export function latestUpdate(stories: Pick<StoryData, 'updatedAt'>[]): string | undefined {
  return stories.reduce<string | undefined>(
    (latest, s) => (!latest || s.updatedAt > latest ? s.updatedAt : latest),
    undefined,
  )
}

/**
 * The story as a search document (see `src/lib/search.ts`). `maxText` bounds
 * the prose for the client index; server-side search passes `Infinity`.
 */
export function toSearchDoc(story: StoryData, maxText = 1500): SearchDoc {
  return {
    slug: story.slug,
    title: story.title,
    summary: story.summary,
    virtue: story.virtue,
    canonicalVirtue: story.canonicalVirtue?.title ?? null,
    subVirtue: story.subVirtue,
    source: story.source,
    text: markdownToText(story.content).slice(0, maxText),
    hasAudio: Boolean(story.audio),
    readAloudMinutes: story.readAloudMinutes,
  }
}

/** Server-side `?q=` search over the published stories (the no-JS path). */
export async function searchStories(query: string): Promise<StoryData[]> {
  const stories = await getAllStories()
  const bySlug = new Map(stories.map((s) => [s.slug, s]))
  return searchDocs(stories.map((s) => toSearchDoc(s, Infinity)), query)
    .map((m) => bySlug.get(m.doc.slug))
    .filter((s): s is StoryData => Boolean(s))
}
