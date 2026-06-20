import { basehub } from 'basehub'
import type { StoriesItem } from '../../basehub-types'
import '../../basehub.config' // Import the config to ensure it's loaded

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
    const data = await basehub().query({ stories: { items: STORY_ITEM_FIELDS } })
    return data.stories.items as Story[]
  } catch (error) {
    console.error('Error fetching stories from Basehub:', error)
    return []
  }
}

// Fetch a single story by slug with proper BaseHub caching.
export async function getStoryBySlug(slug: string): Promise<Story | null> {
  try {
    const data = await basehub().query({ stories: { __args: { first: 100 }, items: STORY_ITEM_FIELDS } })

    // Find the story with matching slug
    const story = data.stories.items.find((item: Pick<Story, '_slug'>) => item._slug === slug)
    return story ? story as Story : null
  } catch (error) {
    console.error('Error fetching story from Basehub:', error)
    return null
  }
}
