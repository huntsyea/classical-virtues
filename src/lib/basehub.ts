import { basehub } from 'basehub'
import type { StoriesItem } from '../../basehub-types'
import '../../basehub.config' // Import the config to ensure it's loaded

/**
 * Stable Next.js cache tag applied to every Basehub story query.
 *
 * In production the Basehub SDK tags each query with a per-query content hash
 * and NO time-based revalidate, so the data cache lives until that opaque hash
 * is invalidated. We override `next` with a single stable tag plus a revalidate
 * window so content can be refreshed two ways (see PRO-86):
 *   1. Time-based ISR — production re-fetches at most every
 *      `STORY_REVALIDATE_SECONDS`, so a publish lands with zero engineer action.
 *   2. On-demand — `POST /api/revalidate` calls `revalidateTag(BASEHUB_CACHE_TAG)`
 *      for an instant refresh straight from the publish pipeline.
 */
export const BASEHUB_CACHE_TAG = 'basehub:stories'

/**
 * ISR window (seconds) for Basehub-backed content. Five minutes keeps the
 * "refresh within minutes, no rebuild" guarantee while keeping regeneration
 * cost negligible for an infrequently-published anthology.
 */
export const STORY_REVALIDATE_SECONDS = 300

// Shared Next.js fetch cache options for Basehub queries. Replacing the SDK's
// default per-query hash tag with a stable tag is intentional: it gives us a
// known handle for on-demand `revalidateTag` while preserving time-based ISR.
const STORY_FETCH_OPTIONS = {
  next: { revalidate: STORY_REVALIDATE_SECONDS, tags: [BASEHUB_CACHE_TAG] },
}

// Use BaseHub's generated types for full type safety.
export type Story = StoriesItem

// Base field selection shared by both story queries.
const STORY_ITEM_FIELDS = {
  _id: true,
  _slug: true,
  _title: true,
  virtue: true,
  image: {
    url: true,
    alt: true,
  },
  summary: true,
  virtueDescription: true,
  audioUrl: true,
  content: {
    markdown: true,
    plainText: true,
    readingTime: true,
  },
}

// Fetch all stories with proper BaseHub caching.
export async function getAllStories(): Promise<Story[]> {
  try {
    const data = await basehub(STORY_FETCH_OPTIONS).query({ stories: { items: STORY_ITEM_FIELDS } })
    return data.stories.items as Story[]
  } catch (error) {
    console.error('Error fetching stories from Basehub:', error)
    return []
  }
}

// Fetch a single story by slug with proper BaseHub caching.
export async function getStoryBySlug(slug: string): Promise<Story | null> {
  try {
    const data = await basehub(STORY_FETCH_OPTIONS).query({ stories: { __args: { first: 100 }, items: STORY_ITEM_FIELDS } })

    // Find the story with matching slug
    const story = data.stories.items.find((item: Pick<Story, '_slug'>) => item._slug === slug)
    return story ? story as Story : null
  } catch (error) {
    console.error('Error fetching story from Basehub:', error)
    return null
  }
}
