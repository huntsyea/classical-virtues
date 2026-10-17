import type { Metadata } from 'next'
import Link from 'next/link'
import StoryCard from '@/components/StoryCard'
import StorySearch from '@/components/search/StorySearch'
import { brandedOgImage, pageMetadata } from '@/lib/seo'
import { searchStories } from '@/lib/stories'

type SearchParams = Promise<{ q?: string | string[] }>

function readQuery(q: string | string[] | undefined): string {
  return (Array.isArray(q) ? q[0] : q)?.trim().slice(0, 120) ?? ''
}

/**
 * `/search` reads `searchParams`, so its results are per-request data. Cache
 * Components wants that streamed behind `<Suspense>`, but a streamed segment
 * only becomes visible through React's client runtime, and the search box
 * promises a plain GET form that renders results on the server without
 * JavaScript (`src/components/search/StorySearch.tsx`).
 *
 * `unstable_instant = false` is Next's documented "this segment is allowed to
 * block" opt-in (migration guide: "set the `instant` config to `false` on the
 * segment that raised it"), which renders the page for the request instead of
 * leaving the results in a hidden streamed hole. That makes this route dynamic;
 * it is noindex and request-dependent anyway.
 */
export const unstable_instant = false

// Internal search results are crawlable (links are followed) but never indexed.
export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const q = readQuery((await searchParams).q)
  return pageMetadata({
    path: '/search',
    title: q ? `Search: ${q}` : 'Search',
    description: 'Search the Classical Virtues anthology by title, virtue, or source.',
    images: [brandedOgImage('search')],
    noindex: true,
  })
}

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const q = readQuery((await searchParams).q)
  const results = q ? await searchStories(q) : []

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <header className="mb-8 space-y-4">
        <h1 className="font-heading text-4xl sm:text-5xl">Search</h1>
        <StorySearch initialQuery={q} showLabel />
      </header>

      {q && (
        <p className="mb-4 text-sm text-muted-foreground" aria-live="polite">
          {results.length
            ? `${results.length} ${results.length === 1 ? 'story' : 'stories'} for “${q}”`
            : `No stories match “${q}”.`}
        </p>
      )}

      {results.length > 0 ? (
        <ol role="list" className="list-none border-t border-rule p-0">
          {results.map((story) => (
            <li key={story.slug} className="border-b border-rule py-4">
              <StoryCard story={story} variant="row" as="h2" />
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-muted-foreground">
          Try a title, a virtue such as courage or charity, or a source such as Aesop.{' '}
          <Link href="/stories" className="underline underline-offset-4 hover:text-foreground">
            Browse every story
          </Link>{' '}
          or{' '}
          <Link href="/virtues" className="underline underline-offset-4 hover:text-foreground">
            the seven virtues
          </Link>
          .
        </p>
      )}
    </div>
  )
}
