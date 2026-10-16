import Link from "next/link";
import StoryCard from "@/components/StoryCard";
import Ornament from "@/components/Ornament";
import Wordmark from "@/components/Wordmark";
import Seal from "@/components/Seal";
import ScrollStrip from "@/components/ScrollStrip";
import { byPublished, hasAudio, roman } from "@/components/story-utils";
import { cn } from "@/lib/utils";
import { getAllStories } from "@/lib/stories";
import { getAllVirtues } from "@/lib/virtues";
import type { Metadata } from 'next'
import JsonLd from "@/components/JsonLd";
import { homeJsonLd, pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  path: '/',
  absoluteTitle: SITE.title,
  description: SITE.description,
})

// ISR: pick up newly published stories within minutes, no rebuild (PRO-86).
export const revalidate = 300

export default async function Home() {
  const [allStories, virtues] = await Promise.all([getAllStories(), getAllVirtues()]);
  const stories = [...allStories].sort(byPublished);

  // Every story appears at most once on the front page. Each section takes
  // only stories not yet shown, and only renders when it can fill its rows.
  const [lead, ...rest] = stories;
  const flank = rest.slice(0, 2);
  const list = rest.slice(2, 7);
  const shown = new Set([lead, ...flank, ...list].filter(Boolean).map((s) => s.slug));
  const unseen = stories.filter((s) => !shown.has(s.slug));
  const unseenNarrated = unseen.filter(hasAudio);
  const narrated = unseenNarrated.slice(0, unseenNarrated.length >= 4 ? 4 : unseenNarrated.length >= 2 ? 2 : 0);
  narrated.forEach((s) => shown.add(s.slug));
  const remaining = stories.filter((s) => !shown.has(s.slug));
  const more = remaining.slice(0, remaining.length >= 8 ? 8 : remaining.length >= 4 ? 4 : 0);
  const cardinal = virtues.slice(0, 4);
  const theological = virtues.slice(4);

  return (
    <>
      {/* Masthead: the publication's name, and its seven sections. Kept 
          compact so the lead package starts near the fold, as a magazine's
          front page does. */}
      <section id="masthead" aria-labelledby="home-title" className="page-wrap pt-2 sm:pt-3">
        <div className="text-center">
          <Seal size={26} className="mx-auto mb-0.5 flex max-sm:hidden" />
          <h1 id="home-title" className="masthead-title">
            <Wordmark />
          </h1>
          <p className="dek mx-auto max-w-xl text-[0.9375rem] sm:mt-1 sm:text-[1.1875rem]">
            Timeless stories to read aloud together.
          </p>
        </div>
        <nav
          aria-label="Virtues"
          className="mt-3 border-y border-rule sm:mt-2"
        >
          <ScrollStrip className="bleed max-sm:[&>li:first-child>a]:pl-0 sm:mx-0 sm:justify-center sm:px-0">
            {virtues.map((virtue) => (
              <li key={virtue.slug} className="shrink-0">
                <Link
                  href={`/virtues/${virtue.slug}`}
                  className={cn(
                    'inline-flex min-h-10 items-center px-3 font-body sm:min-h-9 text-[0.75rem] uppercase tracking-[0.13em] transition-colors hover:text-primary sm:px-4',
                    // Virtues still awaiting stories are present but quiet.
                    virtue.stories.length > 0 ? 'font-semibold' : 'font-medium text-muted-foreground',
                  )}
                >
                  {virtue.title}
                  {virtue.stories.length === 0 && <span className="sr-only">, forthcoming</span>}
                </Link>
              </li>
            ))}
          </ScrollStrip>
        </nav>
      </section>

      {stories.length === 0 ? (
        <section className="page-wrap py-24 text-center">
          <Ornament className="mx-auto text-primary" />
          <p className="dek mx-auto mt-6 max-w-md">
            The stories are being prepared. Please come back soon.
          </p>
        </section>
      ) : (
        <>
          {/* Front page: lead story flanked by teasers, as a magazine opens. */}
          <section aria-label="Featured stories" className="page-wrap mt-3 sm:mt-4">
            <div className="grid gap-y-8 sm:gap-y-10 md:grid-cols-2 md:gap-x-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.15fr)_minmax(0,1.15fr)] lg:gap-x-0">
              <div className="md:col-span-2 lg:order-2 lg:col-span-1 lg:border-x lg:border-rule lg:px-9">
                <StoryCard story={lead} variant="lead" as="h2" preload />
              </div>

              {list.length > 0 && (
                <div className="lg:order-3 lg:pl-9">
                  <h2 className="kicker hidden text-foreground sm:block">In the collection</h2>
                  <ul className="border-t border-rule sm:mt-3">
                    {list.map((story) => (
                      <li key={story.slug} className="border-b border-rule py-4">
                        <StoryCard story={story} variant="row" />
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {flank.length > 0 && (
                <ul className="-mt-8 grid content-start sm:mt-0 sm:grid-cols-2 sm:gap-x-8 md:grid-cols-1 md:gap-y-8 lg:order-1 lg:pr-9">
                  {flank.map((story, i) => (
                    <li
                      key={story.slug}
                      className={cn(
                        'border-b border-rule py-4 sm:border-b-0 sm:py-0',
                        i > 0 && 'md:border-t md:pt-8',
                      )}
                    >
                      <StoryCard
                        story={story}
                        variant="index"
                        as="h2"
                        showDek={false}
                        sizes="(min-width: 1280px) 270px, (min-width: 1024px) 22vw, (min-width: 640px) 50vw, 96px"
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Narrated stories not already on the page: for nights when a voice reads instead. */}
          {narrated.length > 0 && (
            <section aria-labelledby="narrated-heading" className="mt-16 bg-surface py-12 sm:mt-24 sm:py-16">
              <div className="page-wrap">
                <div className="section-head">
                  <h2 id="narrated-heading" className="section-title">Listen together</h2>
                  <p className="meta hidden sm:block">Stories with narrated audio</p>
                </div>
                <ul className="mt-8 grid gap-10 md:grid-cols-2 md:gap-12">
                  {narrated.map((story) => (
                    <li key={story.slug}>
                      <StoryCard story={story} variant="list" />
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {more.length > 0 && (
            <section aria-labelledby="more-heading" className="page-wrap mt-16 sm:mt-24">
              <div className="section-head">
                <h2 id="more-heading" className="section-title">More stories</h2>
                <Link href="/stories" className="rail-link">
                  All stories <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
              <ul className="mt-6 grid gap-y-7 sm:mt-8 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-12 lg:grid-cols-4">
                {more.map((story) => (
                  <li key={story.slug} className="border-t border-rule pt-6 first:border-t-0 first:pt-0 sm:border-t-0 sm:pt-0">
                    <StoryCard story={story} variant="index" />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* The seven virtues: the collection's table of contents. */}
          <section aria-labelledby="virtues-heading" className="page-wrap mt-16 sm:mt-24">
            <div className="section-head">
              <h2 id="virtues-heading" className="section-title">The seven virtues</h2>
              <Link href="/virtues" className="rail-link">
                All virtues <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
            <div className="mt-2 grid gap-x-12 md:grid-cols-2">
              {[
                { label: 'Cardinal', items: cardinal, offset: 0 },
                { label: 'Theological', items: theological, offset: 4 },
              ].map((group) => (
                <div key={group.label} className="mt-6">
                  <h3 className="kicker text-muted-foreground">{group.label}</h3>
                  <ol className="mt-2 border-t border-rule">
                    {group.items.map((virtue, i) => {
                      const count = virtue.stories.length
                      return (
                        <li key={virtue.slug} className="border-b border-rule">
                          <Link
                            href={`/virtues/${virtue.slug}`}
                            className="group grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-baseline gap-x-3 py-4 sm:grid-cols-[2.75rem_minmax(0,1fr)_auto] sm:py-5"
                          >
                            <span aria-hidden="true" className="font-heading text-[0.9375rem] text-primary">
                              {roman(group.offset + i + 1)}
                            </span>
                            <span className="min-w-0">
                              <span
                                className={cn(
                                  'font-heading text-[1.5rem] leading-tight sm:text-[1.75rem]',
                                  count > 0 ? 'headline-link' : 'text-muted-foreground',
                                )}
                              >
                                {virtue.title}
                              </span>
                              <span className={cn('card-dek mt-0.5 block italic', count === 0 && 'text-muted-foreground')}>
                                {virtue.tagline}
                              </span>
                            </span>
                            <span className="meta tabular-nums">
                              {count > 0 ? `${count} ${count === 1 ? 'story' : 'stories'}` : <span className="italic">Forthcoming</span>}
                            </span>
                          </Link>
                        </li>
                      )
                    })}
                  </ol>
                </div>
              ))}
            </div>
            <p className="mt-4 flex justify-end">
              <Link href="/stories" className="rail-link">
                Browse all {stories.length} stories <span aria-hidden="true">&rarr;</span>
              </Link>
            </p>
          </section>
        </>
      )}

      <JsonLd data={homeJsonLd(allStories)} />
    </>
  );
}
