import type React from 'react'
import Link from 'next/link'
import Ornament from '@/components/Ornament'
import { byPublished } from '@/components/story-utils'
import ScrollStrip from '@/components/ScrollStrip'
import StoryCollection from '@/components/StoryCollection'
import type { StoryData } from '@/lib/stories'
import type { VirtueData } from '@/lib/virtues'

export type StoriesFilter = { kind: 'all' } | { kind: 'virtue'; slug: string } | { kind: 'narrated' }

/**
 * The collection index, shared by /stories, /stories/virtue/[virtue], and
 * /stories/narrated. Each filter is its own statically generated route, so
 * the tabs are plain links that work without JavaScript and every view keeps
 * ISR. The header is identical in every state, so the tabs never move.
 */
export default function StoriesIndexView({
  stories,
  virtues,
  filter,
  children,
}: {
  stories: StoryData[]
  virtues: VirtueData[]
  filter: StoriesFilter
  /** Structured data or other page-level extras. */
  children?: React.ReactNode
}) {
  const activeVirtue = filter.kind === 'virtue' ? virtues.find((v) => v.slug === filter.slug) ?? null : null
  const narratedOnly = filter.kind === 'narrated'
  const narratedCount = stories.filter((s) => s.audioUrl).length

  const pool = [...(activeVirtue ? activeVirtue.stories : stories)].sort(byPublished)
  const shown = narratedOnly ? pool.filter((s) => s.audioUrl) : pool

  const heading = activeVirtue
    ? `Stories of ${activeVirtue.title.toLowerCase()}`
    : narratedOnly
      ? 'Narrated stories'
      : 'Stories'
  const standfirst = activeVirtue
    ? activeVirtue.tagline
    : narratedOnly
      ? 'Stories with a recorded reading, to play at bedtime.'
      : 'Every story in the collection, gathered by virtue.'

  // The heading names the view; the results line only counts it.
  const resultLabel = `${shown.length} ${shown.length === 1 ? 'story' : 'stories'}`

  return (
    <div className="page-wrap pt-10 sm:pt-16 lg:pt-20">
      {/* The header is identical in every filter state, so the tabs never move. */}
      <header className="relative sm:flex sm:items-end sm:justify-between sm:gap-12">
        <div>
          <p className="kicker">The collection</p>
          <h1 className="headline-1 mt-3 whitespace-nowrap sm:mt-4">{heading}</h1>
          <p className="dek mt-3 sm:mt-4">{standfirst}</p>
        </div>
        {/* On phones the search link shares the kicker's line, top right. */}
        <Link href="/search" className="rail-link absolute -top-3.5 right-0 shrink-0 sm:static sm:pb-1">
          <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <circle cx="8.75" cy="8.75" r="5.25" />
            <path d="M12.75 12.75L17 17" />
          </svg>
          <span className="max-sm:sr-only">Search the collection</span>
          <span aria-hidden="true" className="sm:hidden">Search</span>
        </Link>
      </header>

      {stories.length > 0 && (
        <nav aria-label="Filter stories" className="mt-8 border-b border-rule sm:mt-12">
          <ScrollStrip className="bleed gap-6 sm:mx-0 sm:flex-wrap sm:gap-x-8 sm:px-0">
            <li className="max-sm:order-none">
              <Link
                href="/stories"
                scroll={false}
                aria-current={filter.kind === 'all' ? 'page' : undefined}
                className="tab"
              >
                All
                <span className="tab-count">{stories.length}</span>
              </Link>
            </li>
            {virtues
              .filter((v) => v.stories.length > 0 || v.slug === activeVirtue?.slug)
              .map((virtue) => {
                const count = virtue.stories.length
                return (
                  <li key={virtue.slug} className="max-sm:order-2">
                    <Link
                      href={`/stories/virtue/${virtue.slug}`}
                      scroll={false}
                      aria-current={activeVirtue?.slug === virtue.slug ? 'page' : undefined}
                      className="tab"
                    >
                      {virtue.title}
                      <span className="tab-count">{count}</span>
                    </Link>
                  </li>
                )
              })}
            {narratedCount > 0 && (
              <li className="max-sm:order-1 sm:ml-auto sm:border-l sm:border-rule sm:pl-8">
                <Link
                  href="/stories/narrated"
                  scroll={false}
                  aria-current={narratedOnly ? 'page' : undefined}
                  className="tab"
                >
                  <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" className="-translate-y-px">
                    <path d="M2.5 10V8a5.5 5.5 0 0 1 11 0v2" />
                    <rect x="2" y="9.5" width="3" height="4.5" rx="1" fill="currentColor" stroke="none" />
                    <rect x="11" y="9.5" width="3" height="4.5" rx="1" fill="currentColor" stroke="none" />
                  </svg>
                  Narrated
                  <span className="tab-count">{narratedCount}</span>
                </Link>
              </li>
            )}
          </ScrollStrip>
        </nav>
      )}

      <section id="collection" aria-labelledby="collection-count" className="scroll-mt-24">
        {stories.length === 0 ? (
          <div className="py-24 text-center">
            <Ornament className="mx-auto text-primary" />
            <p className="dek mx-auto mt-6 max-w-md">
              The stories are being prepared. Please come back soon.
            </p>
          </div>
        ) : (
          <>
            {/* Results line: what this view holds, below the tabs. */}
            <p className="meta meta-run mt-5 min-h-6 sm:mt-6">
              <span className="meta-run-inner">
                <span id="collection-count" aria-live="polite">{resultLabel}</span>
                {activeVirtue && (
                  <span>
                    <Link href={`/virtues/${activeVirtue.slug}`} className="text-foreground underline decoration-rule underline-offset-4 hover:decoration-foreground">
                      About {activeVirtue.title.toLowerCase()}
                    </Link>
                  </span>
                )}
              </span>
            </p>
            {shown.length === 0 ? (
              <div className="border-b border-rule py-20 text-center">
                <Ornament className="mx-auto text-primary" />
                <p className="dek mx-auto mt-6 max-w-md">
                  {activeVirtue
                    ? `No stories of ${activeVirtue.title.toLowerCase()} have been gathered yet.`
                    : narratedOnly
                      ? 'No stories have narration yet.'
                      : 'No stories match this view yet.'}
                </p>
                <p className="mt-6">
                  <Link href="/stories" scroll={false} className="button-quiet">
                    Show all stories
                  </Link>
                </p>
              </div>
            ) : (
              <StoryCollection stories={shown} as="h2" hideCanon={Boolean(activeVirtue)} hideNarrated={narratedOnly} />
            )}
          </>
        )}
      </section>

      {children}
    </div>
  )
}
