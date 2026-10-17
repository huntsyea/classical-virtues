import { buildFeed, feedResponse } from '@/lib/feed'
import { getAllStoriesWithAudio } from '@/lib/stories'

// Cached by the `'use cache'` readers in src/lib/basehub.ts; see AGENTS.md.

export async function GET() {
  return feedResponse(buildFeed(await getAllStoriesWithAudio()))
}
