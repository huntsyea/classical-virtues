import { clockDuration } from './audio'
import { SITE, absoluteUrl } from './site'
import { latestUpdate, type StoryData } from './stories'

/**
 * RSS 2.0 feeds.
 *
 *   /feed.xml     every story, plain RSS; narrated ones carry an `<enclosure>`.
 *   /podcast.xml  narrated stories only, with the iTunes podcast tags. Items
 *                 whose file size is unknown are left out rather than
 *                 published with `length="0"`.
 *
 * Caching is left to the `'use cache'` readers in `src/lib/basehub.ts`, which
 * `POST /api/revalidate` (and Basehub's own on-demand revalidation) expires.
 */

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function tag(name: string, value: string | number | null | undefined, attrs = ''): string {
  if (value === null || value === undefined || value === '') return ''
  return `<${name}${attrs}>${escapeXml(String(value))}</${name}>`
}

/**
 * RFC 822 date for a feed tag. Returns '' (the tag is omitted) when there is no
 * date or it cannot be parsed, rather than falling back to "now": reading the
 * clock is not allowed while prerendering.
 */
function rfc822(iso: string | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '' : date.toUTCString()
}

function itemXml(story: StoryData, podcast: boolean): string {
  const url = absoluteUrl(`/stories/${story.slug}`)
  const audio = story.audio
  const categories = [story.canonicalVirtue?.title, story.subVirtue].filter(Boolean) as string[]

  return [
    '<item>',
    tag('title', story.title),
    tag('link', url),
    tag('guid', url, ' isPermaLink="true"'),
    tag('pubDate', rfc822(story.publishedAt)),
    tag('description', story.summary),
    ...categories.map((c) => tag('category', c)),
    audio?.byteLength
      ? `<enclosure url="${escapeXml(audio.url)}" length="${audio.byteLength}" type="${escapeXml(audio.mimeType)}"/>`
      : '',
    ...(podcast && audio
      ? [
          tag('itunes:title', story.title),
          tag('itunes:summary', story.summary),
          audio.durationSeconds ? tag('itunes:duration', clockDuration(audio.durationSeconds)) : '',
          tag('itunes:episodeType', 'full'),
          tag('itunes:explicit', 'false'),
        ]
      : []),
    '</item>',
  ]
    .filter(Boolean)
    .join('')
}

export function buildFeed(stories: StoryData[], { podcast = false }: { podcast?: boolean } = {}): string {
  // Newest first, as feed readers and podcast apps expect.
  const items = (podcast ? stories.filter((s) => s.audio?.byteLength) : stories)
    .slice()
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
  const path = podcast ? '/podcast.xml' : '/feed.xml'
  const title = podcast ? `${SITE.name}: Narrated Stories` : SITE.name
  const description = podcast
    ? 'Classical virtue stories read aloud: fables and classic tales for families, a few minutes each.'
    : SITE.description
  const namespaces = podcast
    ? ' xmlns:atom="http://www.w3.org/2005/Atom" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"'
    : ' xmlns:atom="http://www.w3.org/2005/Atom"'

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<rss version="2.0"${namespaces}>`,
    '<channel>',
    tag('title', title),
    tag('link', absoluteUrl('/')),
    tag('description', description),
    tag('language', SITE.language.toLowerCase()),
    tag('lastBuildDate', rfc822(latestUpdate(items))),
    tag('generator', 'Next.js'),
    `<atom:link href="${escapeXml(absoluteUrl(path))}" rel="self" type="application/rss+xml"/>`,
    '<image>',
    tag('url', absoluteUrl('/feed-icon.png')),
    tag('title', title),
    tag('link', absoluteUrl('/')),
    tag('width', 144),
    tag('height', 144),
    '</image>',
    ...(podcast
      ? [
          tag('itunes:author', SITE.name),
          tag('itunes:summary', description),
          tag('itunes:type', 'episodic'),
          tag('itunes:explicit', 'false'),
          `<itunes:image href="${escapeXml(absoluteUrl('/podcast-artwork.png'))}"/>`,
          '<itunes:category text="Kids &amp; Family"><itunes:category text="Stories for Kids"/></itunes:category>',
          `<itunes:owner>${tag('itunes:name', SITE.name)}</itunes:owner>`,
        ]
      : []),
    ...items.map((story) => itemXml(story, podcast)),
    '</channel>',
    '</rss>',
  ].join('\n')
}

export function feedResponse(xml: string): Response {
  return new Response(xml, { headers: { 'content-type': 'application/rss+xml; charset=utf-8' } })
}
