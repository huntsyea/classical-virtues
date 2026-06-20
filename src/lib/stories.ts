import { getAllStories as getAllBasehubStories, getStoryBySlug as getBasehubStoryBySlug, Story } from './basehub'
import { resolveSummary, resolveImageAlt } from './seo'

// Unified story interface
export interface StoryData {
  id: string
  slug: string
  title: string
  virtue: string
  image: string
  /** Concrete, descriptive alt text for the story image (from the CMS). */
  imageAlt: string
  summary: string
  content: string
  virtueDescription: string
  /**
   * Public-domain / classical source note (e.g. "From Aesop's Fables").
   * Optional: rendered as a small provenance line outside the story body when
   * present, omitted entirely otherwise. Lives in a structured field, never in
   * the narrative `content`, per the SEO boundary in `writing.md`.
   */
  source?: string
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
    // Always populated: concrete CMS alt, else a descriptive fallback.
    imageAlt: resolveImageAlt(story.image.alt, story._title),
    // Always populated: editorial summary, else prose excerpt, else brand default.
    // Feeds meta description, OG, Twitter, and Article schema — no single point of failure.
    summary: resolveSummary(story.summary, story.content.plainText),
    content: story.content.markdown,
    virtueDescription: story.virtueDescription,
    // Optional provenance note; omit when empty so nothing renders. `source`
    // is an additive Basehub field (PRO-62) and may be absent on older items.
    source: story.source?.trim() || undefined,
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