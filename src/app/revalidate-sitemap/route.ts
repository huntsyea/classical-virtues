import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { authenticateWebhook } from 'basehub/workflows'

export async function POST(req: NextRequest) {
  const verification = await authenticateWebhook({
    body: await req.arrayBuffer(),
    signature: req.headers,
    secret: process.env.BASEHUB_WEBHOOK_SECRET!,
  })

  if (!verification.success) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  revalidatePath('/sitemap.xml')
  revalidatePath('/stories')

  // Optional: revalidate specific slugs from payload if provided
  try {
    const { slugs } = await req.json()
    if (Array.isArray(slugs)) {
      slugs.forEach((s: string) => revalidatePath(`/stories/${s}`))
    }
  } catch {
    // ignore payload parsing errors
  }

  return NextResponse.json({ revalidated: true })
}
