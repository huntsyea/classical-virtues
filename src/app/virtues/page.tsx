import Link from 'next/link'
import JsonLd from '@/components/JsonLd'
import { getAllVirtues } from '@/lib/virtues'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'The Virtues',
  description:
    'The seven classical virtues — Prudence, Justice, Fortitude, Temperance, Faith, Hope, and Charity — each a home for the stories that teach it.',
  alternates: {
    canonical: '/virtues',
  },
}

export default async function VirtuesIndex() {
  const virtues = await getAllVirtues()

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'The Seven Classical Virtues',
    itemListElement: virtues.map((virtue, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: virtue.title,
      url: `https://classicalvirtues.com/virtues/${virtue.slug}`,
    })),
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <header className="mb-8 space-y-3 sm:mb-10">
        <h1 className="font-heading text-4xl sm:text-5xl">The Virtues</h1>
        <p className="max-w-2xl text-muted-foreground">
          The seven classical virtues that order this collection — four cardinal
          and three theological. Each one gathers the stories that teach it.
        </p>
      </header>

      <ol role="list" className="list-none border-t border-border p-0">
        {virtues.map((virtue) => (
          <li key={virtue.slug}>
            <Link
              href={`/virtues/${virtue.slug}`}
              className="group flex flex-col gap-1.5 border-b border-border py-6 transition-colors duration-200 hover:border-foreground sm:py-7"
            >
              <div className="flex flex-wrap items-baseline gap-x-3">
                <h2 className="font-heading text-2xl leading-snug underline-offset-4 decoration-1 group-hover:underline sm:text-3xl">
                  {virtue.title}
                </h2>
                {virtue.alternateName && (
                  <span className="font-heading text-lg italic text-muted-foreground">
                    {virtue.alternateName}
                  </span>
                )}
              </div>
              <p className="font-heading text-lg italic text-primary">
                {virtue.tagline}
              </p>
              <p className="text-sm text-muted-foreground">
                {virtue.stories.length === 0
                  ? 'Stories coming soon'
                  : `${virtue.stories.length} ${
                      virtue.stories.length === 1 ? 'story' : 'stories'
                    }`}
              </p>
            </Link>
          </li>
        ))}
      </ol>

      <JsonLd data={itemListSchema} />
    </div>
  )
}
