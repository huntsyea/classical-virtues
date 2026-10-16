import { ImageResponse } from 'next/og'
import { OG_COLORS, ogFonts } from '@/lib/og'

// RSS 2.0 channel <image>: at most 144 px wide, so the 512 px logo is too big.
export const dynamic = 'force-static'

export async function GET() {
  const fonts = await ogFonts('CV')
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: OG_COLORS.paper,
          color: OG_COLORS.ink,
          fontFamily: fonts.length ? 'Newsreader' : 'serif',
          fontWeight: 500,
          fontSize: 72,
        }}
      >
        CV
      </div>
    ),
    { width: 144, height: 144, fonts },
  )
}
