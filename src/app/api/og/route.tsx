import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get('title')
  const virtue = searchParams.get('virtue')

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
            fontSize: '64px',
            fontFamily: 'Cormorant Garamond',
            marginBottom: '20px',
          }}
        >
          {title || 'Classical Virtues'}
        </h1>
        {virtue && (
          <p
            style={{ fontSize: '36px', fontFamily: 'Nunito', marginBottom: '20px' }}
          >
            {virtue}
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