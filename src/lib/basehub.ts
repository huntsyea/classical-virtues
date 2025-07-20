import { basehub } from 'basehub'
import '../../basehub.config' // Import the config to ensure it's loaded

// Define story type based on generated Basehub schema
export interface Story {
  _id: string
  _slug: string
  _title: string
  virtue: string
  image: {
    url: string
    alt?: string | null
  }
  summary: string
  virtueDescription: string
  audioUrl: string | null
  content: {
    markdown: string
    plainText: string
    readingTime: number
  } | null
}

// Fetch all stories
export async function getAllStories(): Promise<Story[]> {
  try {
    const data = await basehub().query({
      stories: {
        items: {
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
        },
      },
    })

    return data.stories.items as Story[]
  } catch (error) {
    console.error('Error fetching stories from Basehub:', error)
    // Fallback to empty array if Basehub is not configured yet
    return []
  }
}

// Fetch a single story by slug
export async function getStoryBySlug(slug: string): Promise<Story | null> {
  try {
    const data = await basehub().query({
      stories: {
        __args: {
          first: 100, // Get more items to search through
        },
        items: {
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
        },
      },
    })

    // Find the story with matching slug
    const story = data.stories.items.find((item: Pick<Story, '_slug'>) => item._slug === slug)
    return story ? story as Story : null
  } catch (error) {
    console.error('Error fetching story from Basehub:', error)
    return null
  }
} 