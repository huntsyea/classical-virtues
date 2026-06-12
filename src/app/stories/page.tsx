import SummaryCard from '@/components/summaryCard'
import JsonLd from '@/components/JsonLd'
import { getAllStories } from '@/lib/stories'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Stories',
  description: 'Browse our full collection of classical virtue stories — timeless tales of courage, kindness, honesty, and more.',
  alternates: {
    canonical: '/stories',
  },
}

export default async function StoriesIndex() {
  const stories = await getAllStories()

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Classical Virtue Stories",
    "itemListElement": stories.map((story, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": story.title,
      "url": `https://classicalvirtues.com/stories/${story.slug}`,
    })),
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <h1 className="text-4xl font-heading font-bold mb-4">Stories</h1>
      <p className="text-muted-foreground mb-8">Discover our collection of timeless stories, each highlighting a unique virtue.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {stories.map(story => (
          <SummaryCard
            key={story.id}
            slug={story.slug}
            image={story.image}
            title={story.title}
            summary={story.summary}
          />
        ))}
      </div>
      <JsonLd data={itemListSchema} />
    </div>
  )
}
