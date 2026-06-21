import Link from "next/link";
import SummaryCard from "@/components/summaryCard";
import { getAllStories } from "@/lib/stories";
import type { Metadata } from 'next'

export const metadata: Metadata = {
  alternates: {
    canonical: '/',
  },
}

// ISR: pick up newly published stories within minutes, no rebuild (PRO-86).
export const revalidate = 300

export default async function Home() {
  const stories = await getAllStories();
  const [lead, ...rest] = stories;

  return (
    <div className="bg-background px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-10 sm:space-y-14">
        <header className="space-y-4 text-center">
          <h1 className="font-heading text-5xl tracking-wide sm:text-6xl">Classical Virtues</h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Timeless stories to read aloud together, each one named for the
            virtue it teaches. Many include narrated audio for quiet evenings.
          </p>
        </header>

        {stories.length === 0 ? (
          <p className="border border-border px-6 py-12 text-center text-muted-foreground">
            The stories are being prepared. Please come back soon.
          </p>
        ) : (
          <>
            <SummaryCard
              variant="featured"
              slug={lead.slug}
              image={lead.image}
              title={lead.title}
              summary={lead.summary}
              virtue={lead.virtue}
              audioUrl={lead.audioUrl}
              wordCount={lead.wordCount}
            />

            {rest.length > 0 && (
              <section aria-labelledby="collection-label" className="space-y-2">
                <p
                  id="collection-label"
                  className="font-heading text-lg italic text-secondary-foreground"
                >
                  More from the collection
                </p>
                <div className="border-t border-border">
                  {rest.map((story) => (
                    <SummaryCard
                      key={story.id}
                      variant="contents"
                      slug={story.slug}
                      image={story.image}
                      title={story.title}
                      virtue={story.virtue}
                      audioUrl={story.audioUrl}
                      wordCount={story.wordCount}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        <p className="text-center text-muted-foreground">
          Gathered and retold for families who read together.{' '}
          <Link
            href="/about"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Learn about this collection
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
