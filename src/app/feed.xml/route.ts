import { buildFeed, feedResponse } from '@/lib/feed'
import { getAllStoriesWithAudio } from '@/lib/stories'

// ISR, same window as the pages; the revalidation webhook also busts it.
export const revalidate = 300

// Prerender this route (see the Basehub caching note in src/lib/basehub.ts).
export const dynamic = 'force-static'

export async function GET() {
  return feedResponse(buildFeed(await getAllStoriesWithAudio()))
}
