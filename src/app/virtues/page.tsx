import Link from 'next/link'
import { cn } from '@/lib/utils'
import { BaseHubImage as Image } from 'basehub/next-image'
import JsonLd from '@/components/JsonLd'
import { roman } from '@/components/roman'
import { byPublished } from '@/components/story-utils'
import { TitleWithNarrated } from '@/components/StoryCard'
import { getAllVirtues } from '@/lib/virtues'
import type { Metadata } from 'next'
import { brandedOgImage, pageMetadata, virtuesIndexJsonLd } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  path: '/virtues',
  title: 'The Virtues',
  description:
    'The seven classical virtues: Prudence, Justice, Fortitude, Temperance, Faith, Hope, and Charity. Each one gathers the stories that teach it.',
  images: [brandedOgImage('virtues')],
})

// ISR: story counts per virtue follow new publishes (PRO-86).
export const revalidate = 300

export default async function VirtuesIndex() {
  const virtues = await getAllVirtues()

  const itemListSchema = virtuesIndexJsonLd(virtues)

  const groups = [
    { id: 'cardinal', label: 'The cardinal virtues', note: 'The four hinges of a good life.', items: virtues.slice(0, 4), offset: 0 },
    { id: 'theological', label: 'The theological virtues', note: 'Faith, hope, and love.', items: virtues.slice(4), offset: 4 },
  ].filter((g) => g.items.length > 0)

  return (
    <div className="page-wrap pt-10 sm:pt-16 lg:pt-20">
      <header className="max-w-3xl">
        <p className="kicker">The canon</p>
        <h1 className="headline-1 mt-3 sm:mt-4">The seven virtues</h1>
        <p className="dek mt-4 sm:mt-5">
          The seven classical virtues that order this collection: four cardinal
          and three theological. Each one gathers the stories that teach it.
        </p>
      </header>

      {groups.map((group) => (
        <section key={group.id} aria-labelledby={`group-${group.id}`} className="mt-14 sm:mt-20">
          <div className="section-head">
            <h2 id={`group-${group.id}`} className="section-title">{group.label}</h2>
            <p className="meta hidden italic sm:block">{group.note}</p>
          </div>
          <ol className="border-rule">
            {group.items.map((virtue, i) => {
              const count = virtue.stories.length
              const n = group.offset + i + 1
              return (
                <li key={virtue.slug} className="border-b border-rule">
                  <article className="group relative grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3 py-7 sm:grid-cols-[3.5rem_minmax(0,1fr)] sm:py-9 lg:grid-cols-[4.5rem_minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-x-8 lg:py-10">
                    <span aria-hidden="true" className="pt-1.5 font-heading text-lg text-primary sm:pt-3 lg:text-xl">
                      {roman(n)}
                    </span>
                    <div className="min-w-0">
                      <h3 className={cn('headline-2', count === 0 && 'text-muted-foreground')}>
                        <Link
                          href={`/virtues/${virtue.slug}`}
                          className={cn(
                            "after:absolute after:inset-0 after:content-['']",
                            count > 0 && 'headline-link',
                          )}
                        >
                          {virtue.title}
                          {count === 0 && <span className="sr-only">, forthcoming</span>}
                        </Link>
                      </h3>
                      <p className={cn('dek mt-2 italic', count === 0 && 'text-muted-foreground')}>{virtue.tagline}</p>
                      {virtue.alternateName && (
                        <p className="meta mt-2">Also called {virtue.alternateName.toLowerCase()}</p>
                      )}
                    </div>
                    <div className="col-start-2 mt-5 lg:col-start-3 lg:mt-1">
                      {count > 0 ? (
                        <ul className="relative z-10 border-t border-rule">
                          {[...virtue.stories].sort(byPublished).slice(0, 3).map((story) => (
                            <li key={story.slug} className="border-b border-rule">
                              <Link href={`/stories/${story.slug}`} className="group/story flex items-center gap-4 py-2.5">
                                <span className="image-well aspect-square w-14 shrink-0 sm:aspect-[3/2] sm:w-16" aria-hidden="true">
                                  {story.image && (
                                    <Image src={story.image} alt="" fill sizes="64px" className="object-cover" />
                                  )}
                                </span>
                                <span className="min-w-0 flex-1 font-heading text-[1.125rem] leading-snug underline-offset-4 group-hover/story:underline">
                                  <TitleWithNarrated title={story.title} narrated={Boolean(story.audioUrl)} />
                                </span>
                                <span className="meta shrink-0">{story.readAloudMinutes || Math.max(1, Math.round(story.wordCount / 140))} min</span>
                              </Link>
                            </li>
                          ))}
                          {count > 3 && (
                            <li className="meta py-2.5">and {count - 3} more</li>
                          )}
                        </ul>
                      ) : (
                        <p className="card-dek border-y border-rule py-3 italic text-muted-foreground">
                          Forthcoming
                        </p>
                      )}
                    </div>
                  </article>
                </li>
              )
            })}
          </ol>
        </section>
      ))}

      <p className="mt-6 flex justify-end">
        <Link href="/stories" className="rail-link">
          Browse all {virtues.reduce((n, v) => n + v.stories.length, 0)} stories <span aria-hidden="true">&rarr;</span>
        </Link>
      </p>

      <JsonLd data={itemListSchema} />
    </div>
  )
}
