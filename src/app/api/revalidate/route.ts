import { handleRevalidationRequest } from '@/lib/revalidate'

// On-demand revalidation (PRO-86). Accepts Basehub Workflow webhooks, Svix-signed
// Basehub webhooks, and the publish pipeline's bearer token; see
// `src/lib/revalidate.ts` for the verification rules. Content also refreshes
// through Basehub's Toolbar-driven revalidation and the 5-minute ISR window,
// so this endpoint is the instant path, not the only one. It invalidates with
// `revalidatePath('/', 'layout')`, which covers every route and every tag,
// including the SDK's opaque per-query tags that the Toolbar revalidates.
export const dynamic = 'force-dynamic'

export function POST(req: Request) {
  return handleRevalidationRequest(req)
}
