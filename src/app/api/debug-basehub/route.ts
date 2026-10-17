import { NextResponse } from 'next/server'
import { getAllStories } from '@/lib/basehub'

// Cached by the `'use cache'` readers in src/lib/basehub.ts; see AGENTS.md.

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
