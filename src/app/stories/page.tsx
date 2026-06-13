import SummaryCard from '@/components/summaryCard'
import JsonLd from '@/components/JsonLd'
import { getAllStories } from '@/lib/stories'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Stories',
  description: 'Browse our full collection of classical virtue stories: timeless tales of courage, kindness, honesty, and more.',
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
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <header className="mb-8 space-y-3 sm:mb-10">
        <h1 className="font-heading text-4xl sm:text-5xl">Stories</h1>
        <p className="max-w-2xl text-muted-foreground">
          The full table of contents. Every story names its virtue and how
          long it takes to read aloud, and a headphones mark shows where
          narrated audio is ready.
        </p>
      </header>

      {stories.length === 0 ? (
        <p className="border border-border px-6 py-12 text-center text-muted-foreground">
          The stories are being prepared. Please come back soon.
        </p>
      ) : (
        <ol role="list" className="list-none border-t border-border p-0">
          {stories.map((story, index) => (
            <li key={story.id}>
              <SummaryCard
                variant="index"
                position={index + 1}
                slug={story.slug}
                image={story.image}
                title={story.title}
                summary={story.summary}
                virtue={story.virtue}
                audioUrl={story.audioUrl}
                wordCount={story.wordCount}
              />
            </li>
          ))}
        </ol>
      )}

      <JsonLd data={itemListSchema} />
    </div>
  )
}
