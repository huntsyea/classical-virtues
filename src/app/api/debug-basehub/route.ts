import { NextResponse } from 'next/server'
import { getAllStories } from '@/lib/basehub'

// Force dynamic for API routes to prevent build-time execution
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const stories = await getAllStories()
    
    return NextResponse.json({
      count: stories.length,
      stories: stories.map(story => ({
        _id: story._id,
        _slug: story._slug,
        _title: story._title,
        hasContent: !!story.content,
      }))
    })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to fetch stories',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 