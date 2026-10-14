import { NextResponse } from 'next/server'
import { getAllStories } from '@/lib/basehub'

// Local diagnostics only. In any deployed environment this route does not
// exist (404), so it cannot leak CMS ids, slugs, or error details.
export const dynamic = 'force-dynamic'

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return new NextResponse(null, { status: 404 })
  }

  const stories = await getAllStories()
  return NextResponse.json({
    count: stories.length,
    stories: stories.map((story) => ({
      _slug: story._slug,
      _title: story._title,
      hasContent: !!story.content,
    })),
  })
}
