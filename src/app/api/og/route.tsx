import { ImageResponse } from 'next/og'
import { fitOgText, fitOgTitle } from '@/lib/seo'

export const runtime = 'edge'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get('title')
  const virtue = searchParams.get('virtue')

  // Overflow guard: scale the font down for long strings and hard-truncate
  // anything that would still spill past the 1200×630 canvas, so the footer
  // branding can never be pushed off the image.
  const heading = fitOgTitle(title ?? '')
  const subtitle = virtue ? fitOgText(virtue) : null

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg,#fafafa,#e6e6d2)',
          color: '#222',
          padding: '40px',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontSize: `${heading.fontSize}px`,
            fontFamily: 'Cormorant Garamond',
            marginBottom: '20px',
          }}
        >
          {heading.text}
        </h1>
        {subtitle && (
          <p
            style={{ fontSize: `${subtitle.fontSize}px`, fontFamily: 'Nunito', marginBottom: '20px' }}
          >
            {subtitle.text}
          </p>
        )}
        <span style={{ fontSize: '28px', fontFamily: 'Nunito', opacity: 0.7 }}>
          classicalvirtues.com
        </span>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  )
}