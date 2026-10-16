import Link from 'next/link'
import { cn } from '@/lib/utils'
import { notFound } from 'next/navigation'
import Ornament from '@/components/Ornament'
import { roman } from '@/components/roman'
import { byPublished } from '@/components/story-utils'
import StoryCollection from '@/components/StoryCollection'
import JsonLd from '@/components/JsonLd'
import { getAllVirtues, getVirtueBySlug, getVirtueSlugs } from '@/lib/virtues'
import type { Metadata } from 'next'
import { brandedOgImage, firstSentence, pageMetadata, virtueHubJsonLd } from '@/lib/seo'

type Params = Promise<{ slug: string }>

export function generateStaticParams() {
  return getVirtueSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params
  const virtue = await getVirtueBySlug(slug)

  if (!virtue) {
    return {
      title: 'Virtue Not Found',
      description: 'The requested virtue could not be found.',
      robots: { index: false, follow: true },
    }
  }

  const title = virtue.alternateName ? `${virtue.title} (${virtue.alternateName})` : virtue.title
  return {
    ...pageMetadata({
      path: `/virtues/${slug}`,
      title,
      description: `${virtue.tagline} ${firstSentence(virtue.description)}`,
      images: [brandedOgImage(`virtue-${virtue.slug}`)],
      // An empty hub is thin content; keep it out of the index until it has stories.
      noindex: virtue.stories.length === 0,
    }),
    keywords: [virtue.title, virtue.alternateName, 'classical virtues'].filter((k): k is string => Boolean(k)),
  }
}

// ISR: the hub's story list follows new publishes (PRO-86).
export const revalidate = 300

// Prerender this route (see the Basehub caching note in src/lib/basehub.ts).
export const dynamic = 'force-static'

export default async function VirtuePage({ params }: { params: Params }) {
  const { slug } = await params
  const virtue = await getVirtueBySlug(slug)

  if (!virtue) {
    notFound()
  }

  const breadcrumbSchema = virtueHubJsonLd(virtue)

  const all = await getAllVirtues()
  const index = all.findIndex((v) => v.slug === virtue.slug)
  // Chapter navigation in canon order: No. I has no previous, No. VII no next.
  const prev = index > 0 ? all[index - 1] : null
  const next = index >= 0 && index < all.length - 1 ? all[index + 1] : null
  const count = virtue.stories.length
  const family = index >= 0 && index < 4 ? 'Cardinal virtue' : 'Theological virtue'

  return (
    <div className="page-wrap pt-10 sm:pt-16 lg:pt-20">
      <header className="lg:grid lg:grid-cols-[minmax(0,40rem)_minmax(10rem,1fr)] lg:gap-x-20">
        <div>
          <p className="kicker flex items-baseline">
            <Link href="/virtues" className="-my-3 inline-flex min-h-11 items-center underline-offset-4 hover:underline">
              {family}
            </Link>
          </p>
          <h1 className="headline-1 mt-3 sm:mt-4">{virtue.title}</h1>
          <p className="dek mt-3 italic sm:mt-4">{virtue.tagline}</p>
          {virtue.alternateName && (
            <p className="meta mt-2">Also called {virtue.alternateName.toLowerCase()}</p>
          )}
          <p className="mt-6 border-t border-rule pt-6 font-text text-[1.125rem] leading-[1.6] text-ink-2 sm:text-[1.25rem]">
            {virtue.description}
          </p>
        </div>
        {/* Chapter mark: the virtue's place in the canon, set large, as a
            book opens a part. Decorative; the kicker carries it in text. */}
        {index >= 0 && (
          <div aria-hidden="true" className="hidden lg:mt-10 lg:flex lg:flex-col lg:items-center lg:self-start lg:justify-self-center lg:text-center">
            <span className="font-heading text-[9rem] leading-[0.8] tracking-[-0.02em] text-[color-mix(in_srgb,var(--primary)_32%,var(--background))]">
              {roman(index + 1)}
            </span>
            <span className="kicker mt-5 text-muted-foreground">
              {index + 1} of {all.length}
            </span>
          </div>
        )}
      </header>

      <section aria-labelledby="virtue-stories" className="mt-16 sm:mt-24">
        <div className="section-head">
          <h2 id="virtue-stories" className="section-title">
            Stories of {virtue.title.toLowerCase()}
          </h2>
          <p className="meta">
            {count === 0 ? 'None yet' : `${count} ${count === 1 ? 'story' : 'stories'}`}
          </p>
        </div>
        {count === 0 ? (
          <div className="border-b border-rule py-16 text-center sm:py-20">
            <Ornament className="mx-auto text-primary" />
            <p className="dek mx-auto mt-6 max-w-md">
              No stories have been gathered here yet. They are being prepared.
            </p>
            <p className="mt-7">
              <Link href="/stories" className="button-quiet">
                Browse the whole collection
              </Link>
            </p>
          </div>
        ) : (
          <StoryCollection stories={[...virtue.stories].sort(byPublished)} hideCanon />
        )}
      </section>

      {(prev || next) && (
        <nav aria-label="More virtues" className={cn('mt-20 grid border-y border-rule sm:mt-28', prev && next && 'sm:grid-cols-2')}>
          {prev && (
            <Link href={`/virtues/${prev.slug}`} className="group flex flex-col gap-1 py-6 sm:pr-8">
              <span className="kicker text-muted-foreground"><span aria-hidden="true">&larr; </span>Previous virtue</span>
              <span className="headline-link font-heading text-[1.75rem] leading-tight">{prev.title}</span>
              <span className="card-dek italic">{prev.tagline}</span>
              {prev.stories.length === 0 && <span className="meta">Forthcoming</span>}
            </Link>
          )}
          {next && (
            <Link
              href={`/virtues/${next.slug}`}
              className={cn(
                'group flex flex-col gap-1 py-6 sm:items-end sm:text-right',
                prev && 'border-t border-rule sm:border-l sm:border-t-0 sm:pl-8',
              )}
            >
              <span className="kicker text-muted-foreground">Next virtue<span aria-hidden="true"> &rarr;</span></span>
              <span className="headline-link font-heading text-[1.75rem] leading-tight">{next.title}</span>
              <span className="card-dek italic">{next.tagline}</span>
              {next.stories.length === 0 && <span className="meta">Forthcoming</span>}
            </Link>
          )}
        </nav>
      )}

      <JsonLd data={breadcrumbSchema} />
    </div>
  )
}
