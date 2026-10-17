import StoriesIndexView from '@/components/StoriesIndexView'
import { getAllVirtues } from '@/lib/virtues'
import JsonLd from '@/components/JsonLd'
import { getAllStories } from '@/lib/stories'
import type { Metadata } from 'next'
import { brandedOgImage, pageMetadata, storiesIndexJsonLd } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  path: '/stories',
  title: 'Stories',
  description: 'Browse our full collection of classical virtue stories: timeless tales of courage, kindness, honesty, and more.',
  images: [brandedOgImage('stories')],
})

export default async function StoriesIndex() {
  const [stories, virtues] = await Promise.all([getAllStories(), getAllVirtues()])

  const itemListSchema = storiesIndexJsonLd(stories)

  return (
    <StoriesIndexView stories={stories} virtues={virtues} filter={{ kind: 'all' }}>
      <JsonLd data={itemListSchema} />
    </StoriesIndexView>
  )
}
