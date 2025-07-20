import { NextResponse } from 'next/server';
import { getAllStories } from '@/lib/stories';

export async function GET() {
  try {
    const stories = await getAllStories();
    return NextResponse.json(stories);
  } catch (error) {
    console.error('Failed to fetch stories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stories' },
      { status: 500 }
    );
  }
} 