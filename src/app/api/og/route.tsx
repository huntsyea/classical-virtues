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
          backgroundColor: 'hsl(60 20% 95%)',
          padding: '40px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          <h1
            style={{
              fontSize: '60px',
              fontFamily: 'Cormorant Garamond',
              color: 'hsl(60 10% 20%)',
              marginBottom: '20px',
            }}
          >
            {title || 'Classical Virtues'}
          </h1>
          {virtue && (
            <p
              style={{
                fontSize: '32px',
                fontFamily: 'Nunito',
                color: 'hsl(60 10% 40%)',
              }}
            >
              {virtue}
            </p>
          )}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  )
} 