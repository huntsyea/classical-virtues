import { getAllStories, getStoryBySlug } from '@/lib/stories';
import { compileMDX } from 'next-mdx-remote/rsc';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BaseHubImage as Image } from 'basehub/next-image';
import Link from 'next/link'
import { cn } from '@/lib/utils';
import JsonLd from '@/components/JsonLd';
import LazyAudioPlayer from '@/components/LazyAudioPlayer';
import { earlyListenScript } from '@/components/early-listen';
import ReadingProgress from '@/components/ReadingProgress';
import ShareStory, { PrintStory } from '@/components/ShareStory';
import StoryCard, { VirtueKicker } from '@/components/StoryCard';
import Ornament from '@/components/Ornament';
import { audioDurationSeconds, blurFor, canonFor, imageCredit, readMinutes, readingLine, storySource } from '@/components/story-utils';
import { notFound } from 'next/navigation';
import { smartQuotes } from '@/components/typography';
import type { Metadata } from 'next'
import { getCanonBySlug } from '@/lib/canon'
import { storyJsonLd, storyMetadata } from '@/lib/seo'
import type { ReactNode } from 'react'

type Params = Promise<{ slug: string }>

// ISR: refresh story pages at most every 5 minutes so Basehub publishes land in
// production without an engineer rebuild (PRO-86). Must be a literal for Next's
// static analysis; a time-based safety net behind Basehub's on-demand revalidation.
export const revalidate = 300

export async function generateStaticParams() {
  const stories = await getAllStories();
  return stories.map((story) => ({
    slug: story.slug,
  }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params
  const story = await getStoryBySlug(slug)

  if (!story) {
    return {
      title: 'Story Not Found',
      description: 'The requested story could not be found.',
      robots: { index: false, follow: true },
    }
  }

  return storyMetadata(story)
}

/**
 * Render story content. Content that looks like MDX (imports or JSX tags) is
 * compiled with MDX inside a try/catch; anything else, including MDX that
 * fails to compile (e.g. a literal '<' in plain prose), falls back to
 * Markdown so a stray character can never take the page down.
 */
async function renderStoryContent(content: string): Promise<ReactNode> {
  const looksLikeMdx = /^\s*(import\s|<[A-Za-z])/m.test(content)

  if (looksLikeMdx) {
    try {
      const { content: mdxContent } = await compileMDX({ source: content })
      return mdxContent
    } catch {
      // Fall through to plain Markdown rendering below.
    }
  }

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]}>
      {smartQuotes(content)}
    </ReactMarkdown>
  )
}

export default async function Post({ params }: { params: Params }) {
  const { slug } = await params
  const story = await getStoryBySlug(slug);

  if (!story) {
    notFound();
  }

  const canon = canonFor(story);
  const virtueSlug = canon?.slug ?? null;
  const allStories = await getAllStories();
  const otherStories = allStories.filter((s) => s.slug !== story.slug);
  // Read next: the same canon virtue first, then the rest of the collection.
  const sameCanon = (s: (typeof otherStories)[number]) =>
    virtueSlug !== null && canonFor(s)?.slug === virtueSlug;
  const relatedStories = [
    ...otherStories.filter(sameCanon),
    ...otherStories.filter((s) => !sameCanon(s)),
  ].slice(0, 3);

  const minutes = readMinutes(story);
  const source = smartQuotes(storySource(story));
  // A long source note reads as a footnote: it moves below the story.
  const longSource = (source?.length ?? 0) > 90;
  const blur = blurFor(story);
  const canonTitle = canon?.title ?? null;
  // Captions carry provenance only (an illustration credit), never the alt text.
  const credit = smartQuotes(imageCredit(story));
  const moral = smartQuotes(story.virtueDescription ?? '');
  const longMoral = moral.length > 180;
  const firstSentence = moral.match(/^.+?[.!?]["”’]?(?=\s)/)?.[0];
  const moralLead = longMoral && firstSentence ? firstSentence : moral;
  const moralRest = longMoral && firstSentence ? moral.slice(firstSentence.length).trim() : '';
  const dek = smartQuotes(story.dek?.trim() || story.summary);

  if (!virtueSlug) {
    // Fail loudly: an unmapped virtue silently drops the virtue-hub link. Surface
    // it in build/runtime logs so the editorial mismatch gets fixed, but keep the
    // page rendering (plain-text virtue) per the graceful-degradation principle.
    console.error(
      `[virtue-mapping] Story "${story.slug}" has virtue "${story.virtue}" which maps to no canon entry. ` +
        `The virtue-hub link will be missing. Set the story virtue to a canon name or alias (see src/data/virtues.json).`,
    );
  }
  const storyContent = await renderStoryContent(story.content);

  const articleStructuredData = storyJsonLd(story, getCanonBySlug(story.canonicalVirtue?.slug));

  return (
    <article className="pb-4">
      <ReadingProgress targetId="story-body" />

      <header className="page-wrap pt-7 sm:pt-16 lg:pt-20">
        <div className="measure">
          <VirtueKicker story={story} href={virtueSlug ? `/virtues/${virtueSlug}` : null} />
          <h1 className="headline-1 mt-3 sm:mt-4">{smartQuotes(story.title)}</h1>
          {dek && <p className="dek story-dek mt-4 sm:mt-5">{dek}</p>}
          {/* Byline: provenance in the text face, where a magazine puts "By ...",
              with the reading time beside it, quieter. */}
          <p className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            {source && !longSource ? (
              <>
                <span className="font-text text-[1.0625rem] leading-snug text-foreground sm:text-[1.1875rem]">{source}</span>
                <span className="meta">
                  {minutes} {minutes === 1 ? 'minute' : 'minutes'} to read aloud
                </span>
              </>
            ) : (
              // No short source: the reading time takes the byline's place and face.
              <span className="font-text text-[1.0625rem] leading-snug text-ink-2 sm:text-[1.1875rem]">
                {readingLine(minutes)}
              </span>
            )}
          </p>
          {story.audioUrl && (
            <div className="print-hide mt-5">
              <LazyAudioPlayer
                audioUrl={story.audioUrl}
                title={story.title}
                image={story.image}
                durationHint={audioDurationSeconds(story)}
                label={canonTitle ?? undefined}
              />
              {/* Catches a Listen tap that lands before the page hydrates.
                  After the control, so its <audio> element already exists. */}
              <script dangerouslySetInnerHTML={{ __html: earlyListenScript }} />
            </div>
          )}
        </div>
      </header>

      {story.image && (
        <figure className="mx-auto mt-7 max-w-[66rem] sm:mt-10 sm:px-[var(--gutter)]">
          <div className="image-well aspect-[3/2]">
            <Image
              src={story.image}
              alt={story.imageAlt}
              fill
              preload
              fetchPriority="high"
              quality={85}
              placeholder={blur ? 'blur' : 'empty'}
              blurDataURL={blur}
              sizes="(min-width: 1104px) 976px, (min-width: 640px) calc(100vw - 6rem), 100vw"
              className="object-cover"
            />
          </div>
          {credit && (
            <figcaption className="meta mt-2.5 px-5 text-[0.75rem] tracking-[0.02em] sm:px-0">
              {credit}
            </figcaption>
          )}
        </figure>
      )}

      <div className="page-wrap">
        <div className="print-hide measure mt-6 flex items-center gap-6 border-b border-rule sm:mt-8">
          <ShareStory title={story.title} slug={slug} />
          <PrintStory />
        </div>

        <div id="story-body" tabIndex={-1} className="story-body measure mt-8 focus:outline-none sm:mt-10">
          {storyContent}
        </div>

        {source && longSource && (
          <p className="measure mt-10 border-t border-rule pt-4 font-text text-[0.9375rem] leading-relaxed text-ink-2">
            <span className="kicker mr-2 align-[0.1em] text-muted-foreground">Source</span>
            {source}
          </p>
        )}

        {story.virtueDescription && (
          <section
            aria-labelledby="moral-heading"
            className={cn('measure mt-16 sm:mt-20', !longMoral && 'text-center')}
          >
            <Ornament className={cn('text-primary', !longMoral && 'mx-auto')} />
            <h2 id="moral-heading" data-after-story="" tabIndex={-1} className="landing-focus kicker mt-6">
              The moral
            </h2>
            {longMoral ? (
              // A long reflection reads on the body's own edge: its opening
              // sentence in italic, the rest in roman, easy to read aloud.
              <p className="mt-4 font-heading text-[1.25rem] leading-[1.55] text-foreground sm:text-[1.375rem]">
                <em>{moralLead}</em>
                {moralRest && <> {moralRest}</>}
              </p>
            ) : (
              <p className="mx-auto mt-5 max-w-[34rem] text-balance font-heading text-[1.5rem] italic leading-[1.38] text-foreground sm:text-[1.875rem]">
                {moral}
              </p>
            )}
            {virtueSlug && canonTitle && (
              <p className="print-hide mt-8">
                <Link href={`/virtues/${virtueSlug}`} className="rail-link">
                  More stories of {canonTitle.toLowerCase()}
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </p>
            )}
          </section>
        )}
      </div>

      {relatedStories.length > 0 && (
        <section aria-labelledby="read-next" className="print-hide page-wrap mt-20 sm:mt-28">
          <div className="section-head">
            <h2 id="read-next" data-after-story="" tabIndex={-1} className="landing-focus section-title">Read next</h2>
            <Link href="/stories" className="rail-link">
              All stories <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
          <ul className={cn('rail mt-6 grid gap-y-6 sm:mt-8', relatedStories.length === 3 ? 'sm:grid-cols-3' : relatedStories.length === 2 ? 'sm:grid-cols-2' : '')}>
            {relatedStories.map((related) => (
              <li key={related.slug}>
                <StoryCard
                  story={related}
                  variant="index"
                  sizes="(min-width: 1280px) 370px, (min-width: 640px) 30vw, 104px"
                />
              </li>
            ))}
          </ul>
        </section>
      )}
      <JsonLd data={articleStructuredData} />
    </article>
  );
}
