import { createHash } from 'node:crypto'
import { draftMode } from 'next/headers'
import { NextResponse } from 'next/server'
import { hasBasehubToken } from '@/lib/basehub'
import { safeEqual } from '@/lib/revalidate'

/**
 * Enter or leave Draft Mode (Basehub preview).
 *
 *   /api/draft?bshb-preview=<token>&to=/stories/x   Basehub's Preview button
 *   /api/draft?secret=<BASEHUB_PREVIEW_SECRET>&to=/  manual or custom preview URL
 *   /api/draft?disable=1[&to=/stories/x]            leave preview (defaults to the Referer page)
 *
 * A Basehub preview token is checked with Basehub the same way its Toolbar
 * does (`/api/nextjs/preview-auth`). Malformed tokens are rejected without a
 * network call, and rejected tokens are remembered briefly, so anonymous
 * traffic cannot turn this route into a stream of Basehub requests.
 *
 * Redirect targets are resolved against this origin and must stay on it: no
 * scheme-relative (`//x`), backslash (`/\x`), or control-character tricks.
 */
export const dynamic = 'force-dynamic'

const PREVIEW_TOKEN_SHAPE = /^[A-Za-z0-9._~:+/=-]{16,512}$/
const REJECT_TTL_MS = 10 * 60 * 1000
const rejected = new Map<string, number>()

/** A same-origin URL for `to`, or the home page. */
function sameOriginTarget(to: string | null, base: URL): URL {
  const home = new URL('/', base)
  // Only plain absolute paths: one leading slash, no backslashes or controls.
  if (!to || !/^\/(?![/\\])[^\\\s\u0000-\u001f\u007f]*$/.test(to)) return home
  try {
    const url = new URL(to, base)
    return url.origin === base.origin ? url : home
  } catch {
    return home
  }
}

/** Path + query of a same-origin Referer, or null. */
function refererPath(referer: string, base: URL): string | null {
  try {
    const r = new URL(referer)
    return r.origin === base.origin ? `${r.pathname}${r.search}` : null
  } catch {
    return null
  }
}

const tokenKey = (token: string) => createHash('sha256').update(token).digest('hex')

async function basehubPreviewTokenIsValid(token: string): Promise<boolean> {
  if (!hasBasehubToken() || !PREVIEW_TOKEN_SHAPE.test(token)) return false

  const key = tokenKey(token)
  const now = Date.now()
  for (const [k, at] of rejected) if (now - at > REJECT_TTL_MS) rejected.delete(k)
  if (rejected.has(key)) return false

  try {
    const res = await fetch('https://basehub.com/api/nextjs/preview-auth', {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'content-type': 'application/json',
        'x-basehub-token': process.env.BASEHUB_TOKEN as string,
        'x-basehub-api-version': '4',
      },
      body: JSON.stringify({ bshbPreview: token }),
    })
    if (res.status === 200) return true
    if (res.status >= 400 && res.status < 500) rejected.set(key, now)
    return false
  } catch {
    return false
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const target = sameOriginTarget(url.searchParams.get('to'), url)
  const draft = await draftMode()

  if (url.searchParams.get('disable')) {
    draft.disable()
    // The banner's Exit link has no `to`; return to the page it was clicked on.
    const referer = req.headers.get('referer')
    const back = !url.searchParams.get('to') && referer ? sameOriginTarget(refererPath(referer, url), url) : target
    back.searchParams.delete('bshb-preview')
    return NextResponse.redirect(back)
  }

  const secret = url.searchParams.get('secret')
  const previewToken = url.searchParams.get('bshb-preview')
  const expected = process.env.BASEHUB_PREVIEW_SECRET
  const ok =
    (secret && expected && safeEqual(secret, expected)) ||
    (previewToken ? await basehubPreviewTokenIsValid(previewToken) : false)

  if (!ok) return NextResponse.json({ error: 'Invalid preview token' }, { status: 401 })

  draft.enable()
  // Land on the clean page URL (no token). The `bshb-preview` redirect in
  // next.config.mjs is also skipped once the draft cookie is set, so even a
  // token-bearing URL cannot loop.
  target.searchParams.delete('bshb-preview')
  return NextResponse.redirect(target)
}
