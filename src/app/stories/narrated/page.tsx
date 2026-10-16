import StoriesIndexView from '@/components/StoriesIndexView'
import { getAllStoriesWithAudio } from '@/lib/stories'
import { getAllVirtues } from '@/lib/virtues'
import { brandedOgImage, pageMetadata } from '@/lib/seo'
import type { Metadata } from 'next'

// Static, like /stories. This folder takes precedence over /stories/[slug],
// so no story may use the slug "narrated" (or "virtue").
export const revalidate = 300

export const metadata: Metadata = pageMetadata({
  path: '/stories/narrated',
  title: 'Narrated stories',
  description: 'Classical virtue stories with narrated audio, for listening together at bedtime.',
  images: [brandedOgImage('stories')],
})

export default async function NarratedStories() {
  // With narration lengths resolved, so each card can show its recording's length.
  const [stories, virtues] = await Promise.all([getAllStoriesWithAudio(), getAllVirtues()])
  return <StoriesIndexView stories={stories} virtues={virtues} filter={{ kind: 'narrated' }} />
}
