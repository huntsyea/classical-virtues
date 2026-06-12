import { ImageResponse } from 'next/og'

// Static publisher logo used by structured data and the web manifest
export const dynamic = 'force-static'

export async function GET() {
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
        }}
      >
        <span style={{ fontSize: 280, fontFamily: 'serif' }}>CV</span>
        <span style={{ fontSize: 36, opacity: 0.7 }}>Classical Virtues</span>
      </div>
    ),
    {
      width: 512,
      height: 512,
    },
  )
}
