import Link from 'next/link'
import { notFound } from 'next/navigation'
import SummaryCard from '@/components/summaryCard'
import JsonLd from '@/components/JsonLd'
import { getVirtueBySlug, getVirtueSlugs } from '@/lib/virtues'
import type { Metadata } from 'next'

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
    }
  }

  const ogImage = `/api/og?title=${encodeURIComponent(virtue.title)}&virtue=${encodeURIComponent(virtue.tagline)}`

  return {
    title: virtue.title,
    description: virtue.tagline,
    alternates: {
      canonical: `/virtues/${slug}`,
    },
    keywords: [virtue.title, virtue.alternateName, 'virtue', 'classical virtues'].filter(
      (k): k is string => Boolean(k),
    ),
    openGraph: {
      type: 'website',
      url: `https://classicalvirtues.com/virtues/${slug}`,
      title: virtue.title,
      description: virtue.tagline,
      images: [{ url: ogImage, width: 1200, height: 630, alt: virtue.title }],
      siteName: 'Classical Virtues',
    },
    twitter: {
      card: 'summary_large_image',
      title: virtue.title,
      description: virtue.tagline,
      images: [ogImage],
    },
  }
}

export default async function VirtuePage({ params }: { params: Params }) {
  const { slug } = await params
  const virtue = await getVirtueBySlug(slug)

  if (!virtue) {
    notFound()
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://classicalvirtues.com' },
      { '@type': 'ListItem', position: 2, name: 'Virtues', item: 'https://classicalvirtues.com/virtues' },
      {
        '@type': 'ListItem',
        position: 3,
        name: virtue.title,
        item: `https://classicalvirtues.com/virtues/${slug}`,
      },
    ],
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
        <Link href="/">Home</Link>
        <span className="mx-2" aria-hidden="true">/</span>
        <Link href="/virtues">Virtues</Link>
        <span className="mx-2" aria-hidden="true">/</span>
        <span aria-current="page">{virtue.title}</span>
      </nav>

      <header className="mb-8 space-y-3">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h1 className="font-heading text-4xl tracking-wide sm:text-5xl">{virtue.title}</h1>
          {virtue.alternateName && (
            <span className="font-heading text-2xl italic text-muted-foreground">
              {virtue.alternateName}
            </span>
          )}
        </div>
        <p className="font-heading text-xl italic text-primary">{virtue.tagline}</p>
      </header>

      <div className="prose prose-lg max-w-none">
        <p className="leading-relaxed">{virtue.description}</p>
      </div>

      <section aria-labelledby="virtue-stories" className="mt-12 border-t border-border pt-8">
        <h2 id="virtue-stories" className="font-heading text-2xl">
          Stories of {virtue.title.toLowerCase()}
        </h2>
        {virtue.stories.length === 0 ? (
          <p className="mt-4 text-muted-foreground">
            No stories have been gathered here yet — they are being prepared.{' '}
            <Link href="/stories" className="underline underline-offset-4 hover:text-foreground">
              Browse the whole collection
            </Link>
            .
          </p>
        ) : (
          <ol role="list" className="mt-2 list-none border-t border-border p-0">
            {virtue.stories.map((story, index) => (
              <li key={story.id}>
                <SummaryCard
                  variant="index"
                  position={index + 1}
                  slug={story.slug}
                  image={story.image}
                  title={story.title}
                  summary={story.summary}
                  virtue={story.virtue}
                  audioUrl={story.audioUrl}
                  wordCount={story.wordCount}
                />
              </li>
            ))}
          </ol>
        )}
      </section>

      <JsonLd data={breadcrumbSchema} />
    </div>
  )
}
