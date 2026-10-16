import { getAllStories } from '@/lib/stories'
import { getAllVirtues } from '@/lib/virtues'
import { SITE, absoluteUrl } from '@/lib/site'

// A plain-Markdown map of the anthology for language-model crawlers
// (https://llmstxt.org). Same content as the sitemap, with summaries.
export const revalidate = 300

export async function GET() {
  const [stories, virtues] = await Promise.all([getAllStories(), getAllVirtues()])

  const lines = [
    `# ${SITE.name}`,
    '',
    `> ${SITE.description}`,
    '',
    'A small, hand-edited anthology of fables and classic tales for parents and educators who read aloud with children. Every story is organized under one of the seven classical virtues (Prudence, Justice, Fortitude, Temperance, Faith, Hope, Charity), runs a few minutes, and ends with a short moral. Some include narrated audio. Everything is free to read.',
    '',
    '## Stories',
    '',
    ...stories.map((s) => {
      const notes = [s.canonicalVirtue?.title, s.source, s.audio ? 'narrated' : null].filter(Boolean).join('; ')
      return `- [${s.title}](${absoluteUrl(`/stories/${s.slug}`)}): ${s.summary}${notes ? ` (${notes})` : ''}`
    }),
    '',
    '## The Seven Virtues',
    '',
    ...virtues.map((v) => `- [${v.title}](${absoluteUrl(`/virtues/${v.slug}`)}): ${v.tagline}`),
    '',
    '## Optional',
    '',
    `- [About the collection](${absoluteUrl('/about')})`,
    `- [RSS feed](${absoluteUrl('/feed.xml')})`,
    `- [Narrated stories feed](${absoluteUrl('/podcast.xml')})`,
    `- [Sitemap](${absoluteUrl('/sitemap.xml')})`,
    '',
  ]

  return new Response(lines.join('\n'), {
    headers: { 'content-type': 'text/markdown; charset=utf-8' },
  })
}
