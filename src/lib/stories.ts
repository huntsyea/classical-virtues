import { getAllStories as getAllBasehubStories, getStoryBySlug as getBasehubStoryBySlug, Story } from './basehub'

// Unified story interface
export interface StoryData {
  id: string
  slug: string
  title: string
  virtue: string
  image: string
  summary: string
  content: string
  virtueDescription: string
  audioUrl: string
  wordCount: number
}

// Convert Basehub story to unified format
function basehubToStory(story: Story): StoryData | null {
  // Handle nullable content
  if (!story.content) {
    console.warn(`Story "${story._title}" has no content`)
    return null
  }
  
  return {
    id: story._id,
    slug: story._slug,
    // Use _title from Basehub as the source for the unified title field
    title: story._title,
    virtue: story.virtue,
    image: story.image.url,
    summary: story.summary,
    content: story.content.markdown,
    virtueDescription: story.virtueDescription,
    audioUrl: story.audioUrl || '',
    wordCount: story.content.plainText.split(/\s+/).length,
  }
}

// Get all stories from Basehub
export async function getAllStories(): Promise<StoryData[]> {
  if (!process.env.BASEHUB_TOKEN) {
    console.warn('⚠️ BASEHUB_TOKEN not set')
    return []
  }

  try {
    const basehubStories = await getAllBasehubStories()
    const convertedStories = basehubStories
      .map(basehubToStory)
      .filter((story): story is StoryData => story !== null)
    return convertedStories
  } catch (error) {
    console.error('❌ Failed to fetch stories from Basehub:', error)
    return []
  }
}

// Get single story by slug from Basehub
export async function getStoryBySlug(slug: string): Promise<StoryData | null> {
  if (!process.env.BASEHUB_TOKEN) {
    console.warn('⚠️ BASEHUB_TOKEN not set')
    return null
  }

  try {
    const basehubStory = await getBasehubStoryBySlug(slug)
    if (basehubStory) {
      return basehubToStory(basehubStory)
    }
    return null
  } catch (error) {
    console.error('❌ Failed to fetch story from Basehub:', error)
    return null
  }
} 