import SummaryCard from '@/components/summaryCard';
import { getAllStories } from '@/lib/stories';
import type { Metadata } from 'next';
import { defaultMetadata } from '@/lib/seo';

export const metadata: Metadata = {
  ...defaultMetadata,
  title: 'Stories',
  description: 'Browse all classical virtue stories',
  alternates: {
    canonical: '/stories',
  },
  openGraph: {
    ...defaultMetadata.openGraph,
    title: 'Stories',
    description: 'Browse all classical virtue stories',
    url: 'https://classicalvirtues.com/stories',
  },
  twitter: {
    ...defaultMetadata.twitter,
    title: 'Stories',
    description: 'Browse all classical virtue stories',
  },
};

// Use BaseHub's built-in caching

export default async function StoriesIndex() {
  const stories = await getAllStories();

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <h1 className="text-4xl font-heading font-bold mb-4">Stories</h1>
      <p className="text-muted-foreground mb-8">
        Discover our collection of timeless stories, each highlighting a unique
        virtue.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {stories.map(story => (
          <SummaryCard
            key={story.id}
            fileName={`${story.slug}.mdx`}
            image={story.image}
            title={story.title}
            summary={story.summary}
          />
        ))}
      </div>
    </div>
  );
}
