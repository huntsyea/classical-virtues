import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createHmac } from 'crypto'

export async function POST(req: NextRequest) {
  const body = await req.text()
  
  // Get Svix headers
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

  revalidatePath('/sitemap.xml')
  revalidatePath('/stories')

  return NextResponse.json({ revalidated: true })
}
