import { handleRevalidationRequest } from '@/lib/revalidate'

export function POST(req: Request) {
  return handleRevalidationRequest(req)
}
