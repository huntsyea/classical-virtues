import SummaryCard from "@/components/summaryCard";
import { getAllStories } from "@/lib/stories";
import type { Metadata } from 'next'

export const metadata: Metadata = {
  alternates: {
    canonical: '/',
  },
}

// Use BaseHub's built-in caching

export default async function Home() {
  const stories = await getAllStories();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="max-w-5xl w-full space-y-8">
        <header className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-wide">Classical Virtues</h1>
          <p className="text-muted-foreground text-lg">
            Timeless virtues taught through tales from the past.
          </p>
        </header>

        <main className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {stories.map((story) => (
              <SummaryCard
                key={story.id}
                fileName={story.slug}
                image={story.image}
                title={story.title}
                summary={story.summary}
              />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
