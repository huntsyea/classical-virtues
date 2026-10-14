import { handleRevalidationRequest } from '@/lib/revalidate'

// Legacy webhook URL kept so existing Basehub webhook configuration keeps
// working. Same handler and verification as `/api/revalidate`.
export const dynamic = 'force-dynamic'

export function POST(req: Request) {
  return handleRevalidationRequest(req)
}
