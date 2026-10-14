import { buildFeed, feedResponse } from '@/lib/feed'
import { getAllStoriesWithAudio } from '@/lib/stories'

// Narrated stories only, for podcast directories.
export const revalidate = 300

export async function GET() {
  return feedResponse(buildFeed(await getAllStoriesWithAudio(), { podcast: true }))
}
