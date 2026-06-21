import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { timingSafeEqual } from 'crypto'
import { BASEHUB_CACHE_TAG } from '@/lib/basehub'

// On-demand revalidation endpoint (PRO-86).
//
// Margaret's publish pipeline calls this right after a successful Basehub commit
// to refresh production instantly, without an engineer rebuild and without the
// Svix-signed dependency of `/revalidate-sitemap`. It is authenticated with the
// EXISTING `BASEHUB_WEBHOOK_SECRET` (a shared bearer token) so no new env var /
// governance action is required. Even if it is never called, content still
// refreshes within minutes via the time-based ISR window in `src/lib/basehub.ts`.
export const dynamic = 'force-dynamic'

/** Constant-time comparison that tolerates length mismatches. */
function tokenMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

/** Accept the secret as `Authorization: Bearer <secret>` or `x-revalidate-token`. */
function extractToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice('Bearer '.length).trim()
  const header = req.headers.get('x-revalidate-token')
  return header?.trim() || null
}

function revalidateAll() {
  // Bust the Basehub data cache so the next render fetches fresh content...
  // ('max' is the Next 16 immediate-purge profile for route handlers.)
  revalidateTag(BASEHUB_CACHE_TAG, 'max')
  // ...and refresh the static route shells that list/render that content.
  revalidatePath('/')
  revalidatePath('/stories')
  revalidatePath('/stories/[slug]', 'page')
  revalidatePath('/sitemap.xml')
}

export async function POST(req: NextRequest) {
  const secret = process.env.BASEHUB_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: 'Revalidation not configured (BASEHUB_WEBHOOK_SECRET unset)' },
      { status: 500 },
    )
  }

  const token = extractToken(req)
  if (!token || !tokenMatches(token, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  revalidateAll()

  return NextResponse.json({
    revalidated: true,
    tag: BASEHUB_CACHE_TAG,
    paths: ['/', '/stories', '/stories/[slug]', '/sitemap.xml'],
  })
}
