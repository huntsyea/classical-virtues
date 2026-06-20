import { basehub } from 'basehub'
import type { StoriesItem, StoriesItemGenqlSelection } from '../../basehub-types'
import '../../basehub.config' // Import the config to ensure it's loaded

// Use BaseHub's generated types for full type safety. `source` (provenance
// note, PRO-62) is an additive Basehub field: it does not appear on the
// generated `StoriesItem` type until the field is created in the Basehub
// dashboard and `pnpm run basehub` regenerates `basehub-types.d.ts`. We model
// it as an optional extension here so the reader/render layer can consume it
// immediately, and select it defensively (see `buildItemSelection`).
export type Story = StoriesItem & { source?: string | null }

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

/**
 * Build the story field selection, optionally including the additive `source`
 * provenance field. The cast is required because `source` is not yet part of
 * the generated genql types; it is removed automatically (no code change) once
 * the field exists in the schema and types are regenerated.
 */
function buildItemSelection(withSource: boolean): StoriesItemGenqlSelection {
  const selection = withSource
    ? { ...STORY_ITEM_FIELDS, source: true }
    : { ...STORY_ITEM_FIELDS }
  return selection as StoriesItemGenqlSelection
}

// Fetch all stories with proper BaseHub caching.
// The query first selects the `source` provenance field and transparently
// retries with the base selection if Basehub rejects it (i.e. the field has
// not been added to the schema yet). This keeps the catalog rendering whether
// or not `source` exists, and makes provenance self-activating once the field
// lands — no second deploy required.
export async function getAllStories(): Promise<Story[]> {
  try {
    let data
    try {
      data = await basehub().query({ stories: { items: buildItemSelection(true) } })
    } catch {
      // `source` may not be in the Basehub schema yet (PRO-62).
      data = await basehub().query({ stories: { items: buildItemSelection(false) } })
    }

    return data.stories.items as Story[]
  } catch (error) {
    console.error('Error fetching stories from Basehub:', error)
    return []
  }
}

// Fetch a single story by slug with proper BaseHub caching (same `source`
// fallback as getAllStories above).
export async function getStoryBySlug(slug: string): Promise<Story | null> {
  try {
    const args = { first: 100 }
    let data
    try {
      data = await basehub().query({ stories: { __args: args, items: buildItemSelection(true) } })
    } catch {
      data = await basehub().query({ stories: { __args: args, items: buildItemSelection(false) } })
    }

    // Find the story with matching slug
    const story = data.stories.items.find((item: Pick<Story, '_slug'>) => item._slug === slug)
    return story ? story as Story : null
  } catch (error) {
    console.error('Error fetching story from Basehub:', error)
    return null
  }
}