import { getAllPosts, getPostBySlug, PostData } from './posts'
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

// Convert MDX post to unified story format
function postToStory(post: PostData): StoryData {
  return {
    id: post.fileName,
    slug: post.fileName.replace('.mdx', ''),
    title: post.title,
    virtue: post.virtue,
    image: post.image,
    summary: post.summary,
    content: post.content,
    virtueDescription: post.virtueDescription,
    audioUrl: post.audioUrl,
    wordCount: post.wordCount,
  }
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
    title: story._title, // Always use _title from Basehub
    virtue: story.virtue,
    image: story.image.url,
    summary: story.summary,
    content: story.content.markdown,
    virtueDescription: story.virtueDescription,
    audioUrl: story.audioUrl || '',
    wordCount: story.content.plainText.split(/\s+/).length,
  }
}

// Get all stories - tries Basehub first, falls back to MDX
export async function getAllStories(): Promise<StoryData[]> {
  if (process.env.BASEHUB_TOKEN) {
    console.log('🔍 Attempting to fetch stories from Basehub...')
    try {
      const basehubStories = await getAllBasehubStories()
      console.log(`✅ Fetched ${basehubStories.length} stories from Basehub`)
      if (basehubStories.length > 0) {
        const convertedStories = basehubStories
          .map(basehubToStory)
          .filter((story): story is StoryData => story !== null)
        return convertedStories
      }
    } catch (error) {
      console.warn('⚠️ Basehub fetch failed, falling back to MDX files:', error)
    }
  } else {
    console.log('ℹ️ BASEHUB_TOKEN not set, using MDX files')
  }
  
  // Fallback to MDX files
  const posts = getAllPosts()
  console.log(`📁 Using ${posts.length} MDX files`)
  return posts.map(postToStory)
}

// Get single story by slug - tries Basehub first, falls back to MDX
export async function getStoryBySlug(slug: string): Promise<StoryData | null> {
  console.log(`🔎 Looking for story with slug: "${slug}"`)
  
  if (process.env.BASEHUB_TOKEN) {
    console.log('🔍 Attempting to fetch story from Basehub...')
    try {
      const basehubStory = await getBasehubStoryBySlug(slug)
      if (basehubStory) {
        console.log(`✅ Found story in Basehub: "${basehubStory._title}"`)
        const converted = basehubToStory(basehubStory)
        if (converted) {
          return converted
        }
      } else {
        console.log(`❌ Story not found in Basehub for slug: "${slug}"`)
      }
    } catch (error) {
      console.warn('⚠️ Basehub fetch failed, falling back to MDX files:', error)
    }
  } else {
    console.log('ℹ️ BASEHUB_TOKEN not set, using MDX files')
  }
  
  // Fallback to MDX files
  try {
    const post = getPostBySlug(slug)
    console.log(`📁 Found MDX file for: "${post.title}"`)
    return postToStory(post)
  } catch {
    console.log(`❌ No MDX file found for slug: "${slug}"`)
    return null
  }
} 