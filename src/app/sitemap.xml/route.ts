import { getAllStories, latestUpdate } from '@/lib/stories'
import { getAllVirtues } from '@/lib/virtues'
import { absoluteUrl } from '@/lib/site'

/**
 * Hand-built so elements follow the sitemap 0.9 XSD order (loc, lastmod, then
 * extensions); Next's `sitemap.ts` serializer emits `<image:image>` before
 * `<lastmod>`, which strict validators reject.
 *
 * `lastmod` is the editorial revision date (see `StoryData.updatedAt`); each
 * story lists its art for Google Images. `changefreq` and `priority` are
 * omitted: Google ignores both. Empty virtue hubs are noindex, so they are
 * left out until they gather stories; so are the noindex `/stories/virtue/*`
 * filter views (the hubs are the indexable page for each virtue).
 */

// Cached by the `'use cache'` readers in src/lib/basehub.ts; see AGENTS.md.

interface Entry {
  path: string
  lastModified?: string | null
  images?: string[]
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function urlXml({ path, lastModified, images = [] }: Entry): string {
  return [
    '<url>',
    `<loc>${escapeXml(absoluteUrl(path))}</loc>`,
    lastModified ? `<lastmod>${new Date(lastModified).toISOString()}</lastmod>` : '',
    ...images.map((src) => `<image:image><image:loc>${escapeXml(src)}</image:loc></image:image>`),
    '</url>',
  ].join('')
}

export async function GET() {
  const [stories, virtues] = await Promise.all([getAllStories(), getAllVirtues()])
  const newest = latestUpdate(stories)
  const hubs = virtues.filter((virtue) => virtue.stories.length > 0)

  const entries: Entry[] = [
    { path: '/', lastModified: newest },
    { path: '/stories', lastModified: newest },
    { path: '/stories/narrated', lastModified: latestUpdate(stories.filter((s) => s.audio)) ?? null },
    { path: '/virtues', lastModified: latestUpdate(hubs.map((v) => ({ updatedAt: v.updatedAt ?? '' }))) || null },
    { path: '/about' },
    ...hubs.map((virtue) => ({ path: `/virtues/${virtue.slug}`, lastModified: virtue.updatedAt })),
    ...stories.map((story) => ({
      path: `/stories/${story.slug}`,
      lastModified: story.updatedAt,
      images: [story.image],
    })),
  ]

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ...entries.map(urlXml),
    '</urlset>',
  ].join('\n')

  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8' } })
}
