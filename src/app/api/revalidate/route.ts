import { handleRevalidationRequest } from '@/lib/revalidate'

// Cached by the `'use cache'` readers in src/lib/basehub.ts; see AGENTS.md.

export function POST(req: Request) {
  return handleRevalidationRequest(req)
}
