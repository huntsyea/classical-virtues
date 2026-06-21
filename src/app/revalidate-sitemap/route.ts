import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { createHmac } from 'crypto'
import { BASEHUB_CACHE_TAG } from '@/lib/basehub'

// Force dynamic for webhook endpoint
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.text()
  
  // Get Svix headers from webhook request
  const svixId = req.headers.get('svix-id')
  const svixTimestamp = req.headers.get('svix-timestamp')
  const svixSignature = req.headers.get('svix-signature')
  
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 })
  }

  // Verify signature using Svix format
  const webhookSecret = process.env.BASEHUB_WEBHOOK_SECRET!
  const signedPayload = `${svixId}.${svixTimestamp}.${body}`
  const expectedSignature = createHmac('sha256', webhookSecret).update(signedPayload).digest('base64')
  
  // Svix signature format: "v1,signature"
  const signature = svixSignature.split(',')[1]
  
  if (signature !== expectedSignature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // Verify timestamp (prevent replay attacks)
  const timestamp = parseInt(svixTimestamp)
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - timestamp) > 300) { // 5 minute tolerance
    return NextResponse.json({ error: 'Request too old' }, { status: 401 })
  }

  // Bust the Basehub data cache first so re-rendered pages fetch fresh content.
  revalidateTag(BASEHUB_CACHE_TAG, 'max')
  revalidatePath('/sitemap.xml')
  revalidatePath('/')
  revalidatePath('/stories')
  revalidatePath('/stories/[slug]', 'page')

  return NextResponse.json({ revalidated: true })
}
