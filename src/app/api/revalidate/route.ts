import { handleRevalidationRequest } from '@/lib/revalidate'

// On-demand revalidation (PRO-86). Accepts Basehub Workflow webhooks, Svix-signed
// Basehub webhooks, and the publish pipeline's bearer token; see
// `src/lib/revalidate.ts` for the verification rules. Content also refreshes
// through Basehub's Toolbar-driven revalidation and the 5-minute ISR window,
// so this endpoint is the instant path, not the only one. Note that the
// Toolbar revalidates the SDK's own per-query tags, not the `basehub` tag this
// route expires, so the two do not overlap.
export const dynamic = 'force-dynamic'

export function POST(req: Request) {
  return handleRevalidationRequest(req)
}
