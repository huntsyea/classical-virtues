import Link from 'next/link'
import { cn } from '@/lib/utils'
import StoryCard from '@/components/StoryCard'
import Ornament from '@/components/Ornament'
import { getAllStories } from '@/lib/stories'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Page Not Found',
  description: 'The page you followed is not in the collection, but the stories are all still here.',
  // Next emits `noindex` for 404 responses; null drops the root's index directive
  // so there is exactly one robots tag.
  robots: null,
  alternates: { canonical: null },
  // Do not inherit the home page's share card and og:url.
  openGraph: null,
  twitter: null,
}

export default async function NotFound() {
  const stories = await getAllStories()
  // Offer a few stories to step into, narrated ones first.
  const suggestions = [...stories.filter((s) => s.audioUrl), ...stories.filter((s) => !s.audioUrl)].slice(0, 3)

  return (
    <div className="page-wrap pt-14 sm:pt-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="kicker">Page not found</p>
        <h1 className="headline-1 mt-4">This page has wandered off</h1>
        <p className="dek mx-auto mt-5 max-w-lg">
          The page you followed is not in the collection, but the stories are all still here.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8">
          <Link href="/stories" className="rail-link">
            Browse the stories <span aria-hidden="true">&rarr;</span>
          </Link>
          <Link href="/" className="rail-link">
            Return home <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </div>

      {suggestions.length > 0 && (
        <section aria-labelledby="suggestions" className="mt-20 sm:mt-28">
          <div className="section-head">
            <h2 id="suggestions" className="section-title">Perhaps one of these</h2>
            <Link href="/virtues" className="rail-link max-sm:hidden">
              Browse by virtue <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
          <ul className={cn('rail mt-6 grid gap-y-6 sm:mt-8', suggestions.length === 3 ? 'sm:grid-cols-3' : suggestions.length === 2 ? 'sm:grid-cols-2' : '')}>
            {suggestions.map((story) => (
              <li key={story.slug}>
                <StoryCard story={story} variant="index" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {suggestions.length === 0 && <Ornament className="mx-auto mt-16 text-primary" />}
    </div>
  )
}
