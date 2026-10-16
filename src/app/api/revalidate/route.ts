import { handleRevalidationRequest } from '@/lib/revalidate'

// On-demand revalidation (PRO-86). Accepts Basehub Workflow webhooks, Svix-signed
// Basehub webhooks, and the publish pipeline's bearer token; see
// `src/lib/revalidate.ts` for the verification rules. Content also refreshes
// through Basehub's own Toolbar-driven revalidation and the 5-minute ISR window,
// so this endpoint is the instant path, not the only one. It expires the stable
// `basehub:content` tag with the `'max'` (stale-while-revalidate) profile, so a
// purge during a Basehub outage cannot hard-expire pages into 500s; the SDK's
// opaque per-query tags stay with Basehub's own automatic revalidation.
export const dynamic = 'force-dynamic'

export function POST(req: Request) {
  return handleRevalidationRequest(req)
}
