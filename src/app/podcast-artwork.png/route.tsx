import { ImageResponse } from 'next/og'
import { OG_COLORS, ogFonts } from '@/lib/og'
import { flattenPngToRgb, hexToRgb } from '@/lib/png'

// Square show artwork for the narrated-stories feed. Apple Podcasts asks for
// 1400 to 3000 px square RGB art; 1400 keeps the render cheap. `next/og`
// emits RGBA, so the PNG is flattened onto the paper colour as RGB.
export const dynamic = 'force-static'

export async function GET() {
  const title = 'Classical Virtues'
  const tagline = 'Stories to read aloud'
  const fonts = await ogFonts(`${title}${tagline}`)

  const rgba = new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 48,
          background: OG_COLORS.paper,
          color: OG_COLORS.ink,
          fontFamily: fonts.length ? 'Newsreader' : 'serif',
        }}
      >
        <div style={{ width: 160, height: 4, background: OG_COLORS.olive }} />
        <span style={{ fontSize: 168, lineHeight: 1, fontWeight: 500, textAlign: 'center', maxWidth: 1100 }}>{title}</span>
        <span style={{ fontSize: 76, fontStyle: 'italic', fontWeight: 400, color: OG_COLORS.olive }}>{tagline}</span>
      </div>
    ),
    { width: 1400, height: 1400, fonts },
  )
  const rgb = flattenPngToRgb(new Uint8Array(await rgba.arrayBuffer()), hexToRgb(OG_COLORS.paper))
  return new Response(new Uint8Array(rgb), { headers: { 'content-type': 'image/png' } })
}
