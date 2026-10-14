import { draftMode } from 'next/headers'
import { hasBasehubToken } from '@/lib/basehub'

/**
 * Preview indicator, rendered only while Next.js Draft Mode is on.
 *
 * This replaces Basehub's `<Toolbar />`. The Toolbar's ref lookup is an
 * uncacheable fetch (it made every route dynamic), its on-demand revalidation
 * no longer applies (queries are cached under our own `basehub` tag, purged by
 * the webhook), and even when not rendered its client code (~34 KB) was
 * attached to every page through the root layout's module graph. A plain
 * server-rendered banner costs visitors nothing.
 *
 * Entering preview: Basehub's Preview button (`?bshb-preview=`) is redirected
 * to `/api/draft` by `next.config.mjs`. Leaving: the Exit link below. Branch
 * previews (the Toolbar's branch switcher) are not supported; drafts on the
 * main branch are.
 */
export default async function BasehubToolbar() {
  if (!hasBasehubToken()) return null
  const { isEnabled } = await draftMode()
  if (!isEnabled) return null

  return (
    <div
      role="status"
      className="fixed bottom-4 right-4 z-50 flex items-center gap-3 border border-foreground bg-background px-4 py-2 text-sm text-foreground shadow-lg"
    >
      <span>Preview: showing Basehub drafts</span>
      {/* Plain link on purpose: the route sets a cookie and redirects. */}
      <a href="/api/draft?disable=1" className="underline underline-offset-4">
        Exit preview
      </a>
    </div>
  )
}
