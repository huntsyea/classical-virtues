import type React from 'react'
import { BaseHubImage as Image } from 'basehub/next-image'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { audioDurationSeconds, blurFor, cardDek, formatClock, hasAudio, readMinutes, readingLine, storySource, virtueLabels, type StoryLike } from '@/components/story-utils'
import { smartQuotes } from '@/components/typography'

export type StoryCardVariant = 'lead' | 'stack' | 'row' | 'tile' | 'index' | 'list' | 'feature'

interface StoryCardProps {
  story: StoryLike
  variant?: StoryCardVariant
  /** Preload the image: only for the single LCP image on a page. */
  preload?: boolean
  /** Load eagerly (above the fold) without the preload hint. */
  eager?: boolean
  /** `sizes` hint for the image, matched to the slot the card sits in. */
  sizes?: string
  /** Show the summary under the headline (stack and tile default off, index default on). */
  showDek?: boolean
  /** Heading level for the title, so each page keeps a clean outline. */
  as?: 'h2' | 'h3'
  /** Omit the canonical virtue from the kicker (on that virtue's own pages). */
  hideCanon?: boolean
  /** Omit the Narrated mark (in the narrated-only view). */
  hideNarrated?: boolean
  className?: string
}

/** A run of metadata items separated by slashes (see `.meta-run`). */
export function MetaRun({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <p className={cn('meta meta-run', className)}>
      <span className={cn('meta-run-inner', className?.includes('justify-center') && 'justify-center')}>
        {children}
      </span>
    </p>
  )
}

export function StoryMeta({
  story,
  className,
  showVirtue = false,
  long = false,
  showSource = false,
  audioLength = false,
}: {
  story: StoryLike
  className?: string
  showVirtue?: boolean
  /** Lead the line with a short source note ("From Aesop's Fables"), as a byline. */
  showSource?: boolean
  /** Add the recording's length ("2:58 audio"), in the narrated-only view. */
  audioLength?: boolean
  /** Spell the time out ("3 minutes to read aloud"), for lead stories. */
  long?: boolean
}) {
  const minutes = readMinutes(story)
  const recording = audioLength ? audioDurationSeconds(story) : null
  const rawSource = showSource ? storySource(story) : null
  const source = rawSource && rawSource.length <= 40 ? smartQuotes(rawSource) : null
  return (
    <MetaRun className={className}>
      {showVirtue && <span>{story.virtue}</span>}
      {source && <span className="text-ink-2">{source}</span>}
      {long ? (
        <span>
          {minutes} {minutes === 1 ? 'minute' : 'minutes'} to read aloud
        </span>
      ) : (
        <span>
          {minutes} min<span className="sr-only">&nbsp;to read aloud</span>
        </span>
      )}
      {recording && <span>{formatClock(recording)} audio</span>}
    </MetaRun>
  )
}

/** Headphones glyph after a headline: the narrated mark on every card. */
export function NarratedIcon() {
  return (
    <span className="ml-2 inline-block whitespace-nowrap align-[-0.1em] text-ink-2">
      <svg viewBox="0 0 16 16" className="h-[max(0.66em,14px)] w-[max(0.66em,14px)]" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M2.5 10V8a5.5 5.5 0 0 1 11 0v2" />
        <rect x="1.8" y="9" width="3.4" height="5.5" rx="1" fill="currentColor" stroke="none" />
        <rect x="10.8" y="9" width="3.4" height="5.5" rx="1" fill="currentColor" stroke="none" />
      </svg>
      <span className="sr-only">, narrated</span>
    </span>
  )
}

/**
 * A title with the narrated mark bound to its last word, so the glyph never
 * wraps onto a line by itself.
 */
export function TitleWithNarrated({ title, narrated }: { title: string; narrated: boolean }) {
  const text = smartQuotes(title)
  if (!narrated) return <>{text}</>
  const cut = text.lastIndexOf(' ') + 1
  return (
    <>
      {text.slice(0, cut)}
      <span className="whitespace-nowrap">
        {text.slice(cut)}
        <NarratedIcon />
      </span>
    </>
  )
}

/**
 * The lead story's byline: its short source in the text face with the reading
 * time beside it, or, with no short source, the reading time set as the byline.
 */
function LeadByline({ story }: { story: StoryLike }) {
  const source = storySource(story)
  const short = source && source.length <= 40 ? smartQuotes(source) : null
  const minutes = readMinutes(story)
  return (
    <p className="mt-4 flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1">
      {short ? (
        <>
          <span className="font-text text-[1rem] text-foreground">{short}</span>
          <span className="meta">{minutes} min</span>
        </>
      ) : (
        <span className="font-text text-[1rem] text-ink-2">
          {readingLine(minutes)}
        </span>
      )}
    </p>
  )
}

/**
 * Kicker: canonical virtue in olive caps, the story's angle after it in muted
 * caps ("Charity / Kindness"). Pass `href` to link the canon to its hub.
 */
export function VirtueKicker({
  story,
  href,
  className,
  hideCanon = false,
}: {
  story: StoryLike
  href?: string | null
  className?: string
  /** Under a page already about this virtue: show only the angle, if any. */
  hideCanon?: boolean
}) {
  const { primary, angle } = virtueLabels(story)
  if (hideCanon) {
    return angle ? <p className={cn('kicker text-muted-foreground', className)}>{angle}</p> : null
  }
  return (
    <p className={cn('kicker', className)}>
      {href ? (
        <Link href={href} className="-my-3 inline-flex min-h-11 items-center underline-offset-4 hover:underline">
          {primary}
        </Link>
      ) : (
        primary
      )}
      {angle && (
        <>
          <span aria-hidden="true" className="mx-1.5 text-rule">/</span>
          <span className="sr-only">, </span>
          <span className="text-muted-foreground">{angle}</span>
        </>
      )}
    </p>
  )
}

/** The standfirst for teasers: the editorial dek, else the summary. */
function deckText(story: StoryLike): string {
  return story.dek?.trim() || story.summary || ''
}

function CardImage({
  story,
  sizes,
  preload,
  eager,
  className,
}: {
  story: StoryLike
  sizes: string
  preload?: boolean
  eager?: boolean
  className?: string
}) {
  if (!story.image) return null
  const blur = blurFor(story)
  return (
    <div className={cn('image-well aspect-[3/2]', className)}>
      <Image
        src={story.image}
        alt=""
        fill
        sizes={sizes}
        preload={preload}
        quality={preload ? 85 : 75}
        loading={preload || eager ? 'eager' : undefined}
        fetchPriority={preload ? 'high' : undefined}
        placeholder={blur ? 'blur' : 'empty'}
        blurDataURL={blur}
        className="object-cover"
      />
    </div>
  )
}

/**
 * One story, set the way a magazine sets a teaser: image, kicker, headline,
 * dek, and a quiet metadata line. The headline is the only link; its hit area
 * is stretched over the whole card so the image is tappable too, while screen
 * readers hear a single, clean link name.
 */
export default function StoryCard({
  story,
  variant = 'stack',
  preload = false,
  eager = false,
  sizes,
  showDek,
  as: Heading = 'h3',
  hideCanon = false,
  hideNarrated = false,
  className,
}: StoryCardProps) {
  const href = `/stories/${story.slug}`
  // Narration is marked one way on every card: a small headphones glyph
  // after the headline (read as ", narrated").
  const titleLink = (
    <>
      <Link
        href={href}
        className="headline-link after:absolute after:inset-0 after:content-['']"
      >
        <TitleWithNarrated title={story.title} narrated={hasAudio(story) && !hideNarrated} />
      </Link>
    </>
  )

  if (variant === 'lead') {
    return (
      <article className={cn('group relative', className)}>
        <CardImage
          story={story}
          preload={preload}
          sizes={sizes ?? '(min-width: 1280px) 620px, (min-width: 1024px) 50vw, 100vw'}
          className="bleed-flush sm:mx-0"
        />
        <div className="mx-auto mt-5 max-w-[36rem] text-center sm:mt-7">
          <VirtueKicker story={story} hideCanon={hideCanon} />
          <Heading className="headline-lead mt-3">{titleLink}</Heading>
          {deckText(story) && (
            <p className="dek mx-auto mt-3.5 line-clamp-3 max-w-[34rem] text-[1.0625rem] leading-[1.45] sm:text-[1.1875rem]">
              {smartQuotes(cardDek(deckText(story), 140))}
            </p>
          )}
          <LeadByline story={story} />
        </div>
      </article>
    )
  }

  if (variant === 'row') {
    // Rail row, as a magazine's side rail: kicker, headline, one byline line
    // in the same grammar as every card. Rows keep a regular height.
    return (
      <article className={cn('group relative flex items-start gap-4', className)}>
        <div className="flex min-h-24 min-w-0 flex-1 flex-col lg:min-h-20">
          <VirtueKicker story={story} hideCanon={hideCanon} />
          <Heading className="headline-4 mt-1.5 line-clamp-2">{titleLink}</Heading>
          {/* A rail carries one line, the same field on every row, as a
              magazine rail does: the reading time. Sources belong on cards. */}
          <p className="meta mt-1.5 whitespace-nowrap">
            {readMinutes(story)} min<span className="sr-only"> to read aloud</span>
          </p>
        </div>
        <CardImage
          story={story}
          sizes="(min-width: 1024px) 80px, 96px"
          className="aspect-square w-24 shrink-0 lg:w-20"
        />
      </article>
    )
  }



  if (variant === 'index') {
    // A row with a thumbnail on phones (fast to scan one-handed), a tile with
    // the image on top from the small-tablet breakpoint up.
    return (
      <article className={cn('group relative grid grid-cols-[minmax(0,1fr)_6rem] gap-x-4 sm:block', className)}>
        <CardImage
          story={story}
          preload={preload}
          eager={eager}
          sizes={sizes ?? '(min-width: 1280px) 380px, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 96px'}
          className="col-start-2 row-start-1 self-start max-sm:aspect-square sm:mb-4"
        />
        <div className="col-start-1 row-start-1 min-w-0">
          <VirtueKicker story={story} hideCanon={hideCanon} />
          <Heading className="headline-3 mt-1.5 sm:mt-2">{titleLink}</Heading>
          {deckText(story) && (
            <p className={cn('card-dek mt-2.5 line-clamp-5 max-sm:hidden', showDek === false && 'hidden')}>{smartQuotes(cardDek(deckText(story), 140))}</p>
          )}
          {showDek === false ? (
            <>
              {/* Home flanks: on phones they sit in one list with the rail
                  rows, so they share its single line (the reading time). */}
              <p className="meta mt-2.5 whitespace-nowrap sm:hidden">
                {readMinutes(story)} min<span className="sr-only"> to read aloud</span>
              </p>
              <StoryMeta story={story} className="mt-3 max-sm:hidden" showSource />
            </>
          ) : (
            <StoryMeta story={story} className="mt-2.5 sm:mt-3" showSource audioLength={hideNarrated} />
          )}
        </div>
      </article>
    )
  }

  if (variant === 'feature') {
    // A single story given the whole row: picture and text side by side.
    return (
      <article className={cn('group relative grid gap-y-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-center sm:gap-x-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-x-14', className)}>
        <CardImage
          story={story}
          preload={preload}
          eager={eager}
          sizes={sizes ?? '(min-width: 1280px) 680px, (min-width: 640px) 50vw, 100vw'}
        />
        <div className="min-w-0">
          <VirtueKicker story={story} hideCanon={hideCanon} />
          <Heading className="headline-2 mt-2">{titleLink}</Heading>
          {deckText(story) && (
            <p className="card-dek mt-3 text-[1.0625rem] sm:text-[1.1875rem]">{smartQuotes(cardDek(deckText(story), 200))}</p>
          )}
          <StoryMeta story={story} className="mt-4" showSource audioLength={hideNarrated} />
        </div>
      </article>
    )
  }

  if (variant === 'list') {
    // Full-width list row with a generous thumbnail: for small sets that
    // would otherwise leave holes in a grid.
    return (
      <article className={cn('group relative grid grid-cols-[minmax(0,1fr)_6rem] items-start gap-x-4 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-x-8 lg:grid-cols-[15rem_minmax(0,1fr)]', className)}>
        <CardImage
          story={story}
          preload={preload}
          eager={eager}
          sizes={sizes ?? '(min-width: 1024px) 240px, (min-width: 640px) 176px, 96px'}
          className="col-start-2 row-start-1 max-sm:aspect-square sm:col-start-1"
        />
        <div className="col-start-1 row-start-1 min-w-0 sm:col-start-2 sm:pt-1">
          <VirtueKicker story={story} hideCanon={hideCanon} />
          <Heading className="headline-3 mt-1.5 sm:mt-2 lg:text-[1.75rem]">{titleLink}</Heading>
          {deckText(story) && (
            <p className="card-dek mt-2 line-clamp-3 max-w-[38rem] text-[1.0625rem] max-sm:hidden">{smartQuotes(cardDek(deckText(story)))}</p>
          )}
          <StoryMeta story={story} className="mt-2.5 sm:mt-3" showSource audioLength={hideNarrated} />
        </div>
      </article>
    )
  }

  // 'stack' and 'tile': image on top, text below.
  const isTile = variant === 'tile'
  return (
    <article className={cn('group relative', className)}>
      <CardImage
        story={story}
        preload={preload}
        sizes={sizes ?? '(min-width: 1024px) 300px, (min-width: 640px) 50vw, 100vw'}
      />
      <div className={isTile ? 'mt-4' : 'mt-3.5'}>
        <VirtueKicker story={story} hideCanon={hideCanon} />
        <Heading className="headline-3 mt-2">{titleLink}</Heading>
        {showDek === true && deckText(story) && (
          <p className="card-dek mt-2.5 line-clamp-5">{smartQuotes(cardDek(deckText(story), 140))}</p>
        )}
        <StoryMeta story={story} className="mt-3" showSource audioLength={hideNarrated} />
      </div>
    </article>
  )
}
