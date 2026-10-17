import { ImageResponse } from 'next/og'
import { cacheLife } from 'next/cache'

/**
 * The publisher logo.
 *
 * `next/og` reads the clock while rendering, which Cache Components does not
 * allow in a prerendered route, so the render lives in its own `'use cache'`
 * scope and the handler only serves the cached bytes. That keeps this a static
 * route instead of a per-request satori render.
 */
async function renderLogo(): Promise<ArrayBuffer> {
  'use cache'
  cacheLife('weeks')

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
  ).arrayBuffer()
}

export async function GET() {
  return new Response(await renderLogo(), {
    headers: { 'content-type': 'image/png' },
  })
}
