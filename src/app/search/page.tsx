import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import StoryCard from '@/components/StoryCard'
import StorySearch from '@/components/search/StorySearch'
import { brandedOgImage, pageMetadata } from '@/lib/seo'
import { searchStories } from '@/lib/stories'

type SearchParams = Promise<{ q?: string | string[] }>

function readQuery(q: string | string[] | undefined): string {
  return (Array.isArray(q) ? q[0] : q)?.trim().slice(0, 120) ?? ''
}

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

// `searchParams` is request data, so it streams in behind <Suspense> as Cache
// Components requires; the shell is the page frame below.
export default function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <Suspense
        fallback={
          <header className="mb-8 space-y-4">
            <h1 className="font-heading text-4xl sm:text-5xl">Search</h1>
            <StorySearch initialQuery="" showLabel />
          </header>
        }
      >
        <SearchResults searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function SearchResults({ searchParams }: { searchParams: SearchParams }) {
  const q = readQuery((await searchParams).q)
  const results = q ? await searchStories(q) : []

  return (
    <>
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
    </>
  )
}
