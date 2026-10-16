import { ImageResponse } from 'next/og'
import { fitOgText, fitOgTitle } from '@/lib/seo'
import { OG_COLORS, ogFonts } from '@/lib/og'
import { staticOgCard, type OgCard } from '@/lib/og-cards'
import { CANON } from '@/lib/canon'
import { SITE } from '@/lib/site'
import { getAllStories } from '@/lib/stories'

/**
 * Branded 1200×630 share card for pages without story art (home, indexes,
 * virtue hubs, About, search). Story pages use their own illustration; see
 * `storyOgImage` in `src/lib/seo.ts`.
 *
 *   /api/og?card=virtue-charity
 *
 * The text comes from `src/lib/og-cards.ts`, never from the URL, so the card
 * cannot be made to say arbitrary things under the brand. Unknown cards 404.
 * Legacy `?title=` links (shared before cards existed) still render, but only
 * when the title is a real story or virtue.
 */
async function resolveCard(params: URLSearchParams): Promise<OgCard | null> {
  const key = params.get('card')
  if (key) {
    const fixed = staticOgCard(key)
    if (fixed) return fixed
    if (key.startsWith('story-')) {
      const story = (await getAllStories()).find((s) => s.slug === key.slice('story-'.length))
      return story ? { title: story.title, subtitle: story.canonicalVirtue?.title } : null
    }
    return null
  }

  const legacyTitle = params.get('title')?.trim().toLowerCase()
  if (!legacyTitle) return staticOgCard('home')
  const virtue = CANON.find((v) => v.title.toLowerCase() === legacyTitle)
  if (virtue) return { title: virtue.title, subtitle: virtue.tagline }
  const story = (await getAllStories()).find((s) => s.title.toLowerCase() === legacyTitle)
  return story ? { title: story.title, subtitle: story.canonicalVirtue?.title } : null
}

export async function GET(request: Request) {
  const card = await resolveCard(new URL(request.url).searchParams)
  if (!card) return new Response('Unknown card', { status: 404 })

  const heading = fitOgTitle(card.title)
  const subtitle = card.subtitle ? fitOgText(card.subtitle, { max: 140, large: 40, medium: 34, small: 28 }) : null

  const eyebrow = 'CLASSICAL VIRTUES'
  const footer = SITE.host
  const fonts = await ogFonts(`${eyebrow}${heading.text}${subtitle?.text ?? ''}${footer}`)
  const serif = fonts.length ? 'Newsreader' : 'serif'

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: OG_COLORS.paper,
          color: OG_COLORS.ink,
          padding: '72px 88px',
          fontFamily: serif,
          // Only the 500 roman and 400 italic faces are loaded; pin the roman.
          fontWeight: 500,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 56, height: 2, background: OG_COLORS.olive }} />
          <span style={{ fontSize: 24, letterSpacing: 6, color: OG_COLORS.olive }}>{eyebrow}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <span style={{ fontSize: heading.fontSize * 1.5, lineHeight: 1.05, fontWeight: 500 }}>{heading.text}</span>
          {subtitle && (
            <span style={{ fontSize: subtitle.fontSize, lineHeight: 1.3, fontStyle: 'italic', fontWeight: 400, color: OG_COLORS.muted }}>
              {subtitle.text}
            </span>
          )}
        </div>
        <div
          style={{
            display: 'flex',
            borderTop: `1px solid ${OG_COLORS.rule}`,
            paddingTop: 24,
            fontSize: 24,
            color: OG_COLORS.muted,
          }}
        >
          {footer}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts,
      // One URL per card; copy changes ship with a deploy, so a day is plenty.
      headers: { 'cache-control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400' },
    },
  )
}
