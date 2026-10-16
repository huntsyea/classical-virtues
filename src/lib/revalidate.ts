import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { revalidateTag } from 'next/cache'
import { basehub } from 'basehub'
import { authenticateWebhook } from 'basehub/workflows'
import { BASEHUB_CONTENT_TAG, SEARCH_KEY_CACHE_TAG, hasBasehubToken } from './basehub'
import '../../basehub.config'

/**
 * One revalidation handler behind both `/api/revalidate` and the legacy
 * `/revalidate-sitemap` URL. Three ways in, checked in this order:
 *
 *   1. **Basehub Workflow webhook** (`x-basehub-webhook-signature`, hex
 *      HMAC-SHA256 of the body). Verified with `authenticateWebhook` from
 *      `basehub/workflows`. Secret: `BASEHUB_WORKFLOW_SECRET`, else the
 *      repo's Workflow block secret, read from Basehub once per process.
 *   2. **Svix-signed Basehub webhook** (`svix-id`, `svix-timestamp`,
 *      `svix-signature`). Verified per the Svix spec with `BASEHUB_WEBHOOK_SECRET`
 *      (`whsec_…`: the HMAC key is the base64-decoded part after the prefix),
 *      with a 5 minute replay window.
 *   3. **Bearer token** (`Authorization: Bearer …` or `x-revalidate-token`) for
 *      the publish pipeline, compared against `REVALIDATE_TOKEN`. Until that is
 *      set, `BASEHUB_WEBHOOK_SECRET` is still accepted (logged as deprecated)
 *      so the existing pipeline keeps working.
 *
 * Hardening: malformed signatures are rejected before any I/O, so forged
 * requests cannot trigger Basehub API calls; identical authenticated webhook
 * deliveries within {@link REPLAY_WINDOW_MS} are acknowledged without purging
 * again (Workflow signatures carry no timestamp, so a captured request could
 * otherwise force purges on demand).
 *
 * On success every Basehub-backed route and cached query is invalidated (see
 * `revalidateAllContent`).
 */

const SVIX_TOLERANCE_SECONDS = 5 * 60
const REPLAY_WINDOW_MS = 30 * 1000
const HEX_SHA256 = /^[0-9a-f]{64}$/i
// Space-separated `<version>,<signature>` entries (several during key rotation).
const SVIX_SIGNATURE = /^v\d+[a-z]?,\S+(\s+v\d+[a-z]?,\S+)*$/

type Via = 'basehub-workflow' | 'svix' | 'token'
type AuthResult = { ok: true; via: Via } | { ok: false; status: number; error: string }

const unauthorized = (error = 'Unauthorized'): AuthResult => ({ ok: false, status: 401, error })

export function safeEqual(a: string | Buffer, b: string | Buffer): boolean {
  const x = Buffer.isBuffer(a) ? a : Buffer.from(a)
  const y = Buffer.isBuffer(b) ? b : Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

type WorkflowSecret = `bshb_workflow_${string}:${string}`
let workflowSecretPromise: Promise<WorkflowSecret | null> | null = null

/** The Workflow block secret: env first, else one Basehub read per process. */
function workflowSecret(): Promise<WorkflowSecret | null> {
  const fromEnv = process.env.BASEHUB_WORKFLOW_SECRET?.trim()
  if (fromEnv) return Promise.resolve(fromEnv as WorkflowSecret)
  if (!hasBasehubToken()) return Promise.resolve(null)
  workflowSecretPromise ??= basehub()
    .query({ workflows: { untitled: { webhookSecret: true } } })
    .then((data) => (data.workflows.untitled.webhookSecret as WorkflowSecret) || null)
    .catch((error) => {
      console.error('[revalidate] Could not read the Basehub workflow secret:', error)
      workflowSecretPromise = null // retry on the next well-formed attempt
      return null
    })
  return workflowSecretPromise
}

async function verifyBasehubWorkflow(signature: string, body: string): Promise<AuthResult> {
  // Shape check first: a forged header must not cost a Basehub API call.
  if (!HEX_SHA256.test(signature)) return unauthorized('Invalid signature')
  const secret = await workflowSecret()
  if (!secret) return { ok: false, status: 503, error: 'Workflow webhook secret unavailable' }
  // authenticateWebhook reports bad bodies and signatures as `success: false`.
  const result = await authenticateWebhook({ body, signature, secret })
  return result.success ? { ok: true, via: 'basehub-workflow' } : unauthorized('Invalid signature')
}

function verifySvix(id: string, timestamp: string, signatures: string, body: string): AuthResult {
  const secret = process.env.BASEHUB_WEBHOOK_SECRET
  if (!secret) return { ok: false, status: 503, error: 'Webhook verification not configured' }
  if (signatures.length > 2048 || !SVIX_SIGNATURE.test(signatures.trim())) return unauthorized('Invalid signature')

  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > SVIX_TOLERANCE_SECONDS) {
    return unauthorized('Stale or invalid timestamp')
  }

  const key = secret.startsWith('whsec_') ? Buffer.from(secret.slice('whsec_'.length), 'base64') : Buffer.from(secret)
  const expected = createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest('base64')
  // The header may carry several space-separated "v1,<sig>" entries during key rotation.
  const valid = signatures
    .trim()
    .split(/\s+/)
    .map((entry) => entry.split(',')[1])
    .some((sig) => sig && safeEqual(sig, expected))

  return valid ? { ok: true, via: 'svix' } : unauthorized('Invalid signature')
}

function verifyToken(token: string): AuthResult {
  const dedicated = process.env.REVALIDATE_TOKEN?.trim()
  if (dedicated) return safeEqual(token, dedicated) ? { ok: true, via: 'token' } : unauthorized()

  // Legacy: the pipeline sends BASEHUB_WEBHOOK_SECRET. Accepted only until
  // REVALIDATE_TOKEN exists, so the Svix signing key stops travelling as a bearer.
  const legacy = process.env.BASEHUB_WEBHOOK_SECRET
  if (!legacy) return { ok: false, status: 503, error: 'Revalidation not configured' }
  if (!safeEqual(token, legacy)) return unauthorized()
  console.warn('[revalidate] Bearer BASEHUB_WEBHOOK_SECRET is deprecated; set REVALIDATE_TOKEN and send that instead.')
  return { ok: true, via: 'token' }
}

function authenticate(req: Request, body: string): Promise<AuthResult> | AuthResult {
  const h = req.headers
  const workflowSig = h.get('x-basehub-webhook-signature')
  if (workflowSig !== null) return verifyBasehubWorkflow(workflowSig.trim(), body)

  const svixId = h.get('svix-id')
  const svixTs = h.get('svix-timestamp')
  const svixSig = h.get('svix-signature')
  if (svixId || svixTs || svixSig) {
    if (!svixId || !svixTs || !svixSig) return unauthorized('Incomplete Svix headers')
    return verifySvix(svixId, svixTs, svixSig, body)
  }

  const auth = h.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice('Bearer '.length).trim() : h.get('x-revalidate-token')?.trim()
  return token ? verifyToken(token) : unauthorized()
}

/** Recently honoured webhook deliveries (hash → time), for replay suppression. */
const recentPurges = new Map<string, number>()

function isReplay(via: Via, req: Request, body: string): boolean {
  if (via === 'token') return false // the pipeline may legitimately repeat itself
  const now = Date.now()
  for (const [key, at] of recentPurges) if (now - at > REPLAY_WINDOW_MS) recentPurges.delete(key)
  const key = createHash('sha256')
    .update(`${via}:${req.headers.get('svix-id') ?? ''}:${body}`)
    .digest('hex')
  if (recentPurges.has(key)) return true
  recentPurges.set(key, now)
  return false
}

/**
 * Invalidate every Basehub-backed route and cached query.
 *
 * The SDK tags each query with an opaque `basehub-<hash>` that nothing lets us
 * enumerate, so this cannot expire those tags. Instead every route that reads
 * content declares {@link BASEHUB_CONTENT_TAG} (`declareContentTag`), and this
 * expires it with the `'max'` profile: stale-while-revalidate. The next visit
 * serves the previous render while Next regenerates in the background, and the
 * visit after that sees the publish.
 *
 * That profile is the point. An immediate expiry (the old `revalidatePath('/',
 * 'layout')`, or `{ expire: 0 }`) hard-expires the page, so a purge while
 * Basehub is unreachable regenerates it in the foreground, the query throws
 * (see the outage policy in `src/lib/basehub.ts`), and the reader gets a 500.
 * Verified on a production build with Basehub unreachable: with `'max'` the
 * pages keep serving the last good render at 200.
 *
 * The schema, search-key and audio probes live outside the SDK's tags and keep
 * their own.
 */
export function revalidateAllContent(): string[] {
  revalidateTag(BASEHUB_CONTENT_TAG, 'max')
  revalidateTag('basehub:schema', 'max')
  revalidateTag(SEARCH_KEY_CACHE_TAG, 'max')
  revalidateTag('audio-probe', 'max')
  return [BASEHUB_CONTENT_TAG, 'basehub:schema', SEARCH_KEY_CACHE_TAG, 'audio-probe']
}

export async function handleRevalidationRequest(req: Request): Promise<Response> {
  const body = await req.text()
  const auth = await authenticate(req, body)
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status })
  }

  if (isReplay(auth.via, req, body)) {
    return Response.json({ revalidated: false, via: auth.via, reason: 'duplicate delivery ignored' })
  }

  const tags = revalidateAllContent()
  return Response.json({ revalidated: true, via: auth.via, tags, at: new Date().toISOString() })
}
