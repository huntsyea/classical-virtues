import StoryCard from '@/components/StoryCard'
import { cn } from '@/lib/utils'
import { gridPlan, type StoryLike } from '@/components/story-utils'

/**
 * A set of stories laid out by count so no row is ever half empty: one story
 * as a wide feature, two side by side, full grid rows of four, three, or
 * five, and a ruled list for anything else.
 */
export default function StoryCollection({
  stories,
  hideCanon = false,
  hideNarrated = false,
  as = 'h3',
  className,
}: {
  stories: (StoryLike & { id?: string })[]
  /** Under a virtue's own page: omit the canonical virtue from each kicker. */
  hideCanon?: boolean
  /** In the narrated-only view: omit the Narrated mark from each card. */
  hideNarrated?: boolean
  as?: 'h2' | 'h3'
  className?: string
}) {
  const plan = gridPlan(stories.length)
  const key = (s: StoryLike & { id?: string }) => s.id ?? s.slug

  if (plan.kind === 'feature') {
    const [story] = stories
    return (
      <div className={cn('mt-6 sm:mt-8', className)}>
        <StoryCard story={story} variant="feature" as={as} hideCanon={hideCanon} hideNarrated={hideNarrated} preload />
      </div>
    )
  }

  if (plan.kind === 'pair') {
    // Two stories share the row as full tiles: never shrunk to thumbnails.
    return (
      <ul className={cn('rail mt-6 grid gap-y-8 sm:mt-8 sm:grid-cols-2', className)}>
        {stories.map((story, i) => (
          <li key={key(story)}>
            <StoryCard
              story={story}
              variant="stack"
              showDek
              as={as}
              hideCanon={hideCanon} hideNarrated={hideNarrated}
              preload={i === 0}
              eager
              sizes="(min-width: 1280px) 560px, (min-width: 640px) 45vw, 100vw"
              className="pair-tile"
            />
          </li>
        ))}
      </ul>
    )
  }

  if (plan.kind === 'grid') {
    return (
      <ul className={cn('mt-6 grid gap-y-7 sm:mt-8 sm:gap-x-8 sm:gap-y-14 lg:gap-x-10', plan.className, className)}>
        {stories.map((story, i) => (
          <li key={key(story)} className="border-t border-rule pt-6 first:border-t-0 first:pt-0 sm:border-t-0 sm:pt-0">
            <StoryCard story={story} variant="index" as={as} hideCanon={hideCanon} hideNarrated={hideNarrated} preload={i === 0} eager={i < 4} />
          </li>
        ))}
      </ul>
    )
  }

  return (
    <ul className={cn('mt-6 border-t border-rule sm:mt-8', className)}>
      {stories.map((story, i) => (
        <li key={key(story)} className="border-b border-rule py-6 sm:py-8">
          <StoryCard story={story} variant="list" as={as} hideCanon={hideCanon} hideNarrated={hideNarrated} preload={i === 0} eager={i < 3} />
        </li>
      ))}
    </ul>
  )
}
