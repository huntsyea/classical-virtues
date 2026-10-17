import { notFound } from 'next/navigation'
import StoriesIndexView from '@/components/StoriesIndexView'
import { getAllStories } from '@/lib/stories'
import { getAllVirtues, getVirtueSlugs } from '@/lib/virtues'
import { brandedOgImage, pageMetadata } from '@/lib/seo'
import type { Metadata } from 'next'

type Params = Promise<{ virtue: string }>

// Cached by the `'use cache'` readers in src/lib/basehub.ts; see AGENTS.md.

export function generateStaticParams() {
  return getVirtueSlugs().map((virtue) => ({ virtue }))
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { virtue: slug } = await params
  const virtue = (await getAllVirtues()).find((v) => v.slug === slug)
  if (!virtue) return { title: 'Stories', robots: { index: false, follow: true } }
  // A filtered view of the collection. The virtue hub (/virtues/[slug]) is
  // the indexable page for this set, so this one is noindex, follow.
  return pageMetadata({
    path: `/stories/virtue/${slug}`,
    title: `Stories of ${virtue.title.toLowerCase()}`,
    description: `${virtue.tagline} The stories of ${virtue.title.toLowerCase()} in the Classical Virtues collection.`,
    images: [brandedOgImage(`virtue-${slug}`)],
    noindex: true,
  })
}

export default async function StoriesByVirtue({ params }: { params: Params }) {
  const { virtue: slug } = await params
  const [stories, virtues] = await Promise.all([getAllStories(), getAllVirtues()])
  if (!virtues.some((v) => v.slug === slug)) notFound()

  return <StoriesIndexView stories={stories} virtues={virtues} filter={{ kind: 'virtue', slug }} />
}
