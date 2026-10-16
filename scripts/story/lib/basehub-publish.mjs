// Basehub Mutation API helpers for story:publish.
//
// Patterns follow scripts/seed-virtues.mjs, which learned them against the live
// API: resolve ids from the draft (working) tree ourselves and emit update-vs-
// create (the per-instance `idempotency` key suffixes the slug instead of
// updating). The pipeline only ever stages: no autoCommit and no commit
// operation exist in this code. Going live is a person committing in the
// Basehub dashboard (production-recipe step 5).
//
// Payload shape is from the installed SDK's own types
// (@basehub/mutation-api-helpers: Operation, CreateInstanceBlockOp, MediaValue,
// RichTextValue). Dry runs validate it three ways: the operation envelope with
// the SDK's OperationSchema, each field value with the SDK's value schemas, and
// field names/types against the live StoriesItem GraphQL type (read-only
// introspection), so a missing CMS field fails before anything is written.

import { createRequire } from 'node:module'
import { realpathSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { REPO_ROOT } from './cli.mjs'

const API = 'https://api.basehub.com/graphql'

/**
 * Basehub field apiName → Mutation API block type, for every StoriesItem field
 * the pipeline knows. The first seven exist today; the rest arrive with
 * scripts/basehub/migrate-story-schema.mjs and are written whenever the draft
 * schema has them (the site already prefers them: src/lib/stories.ts).
 */
export const STORY_FIELD_TYPES = {
  virtue: 'text',
  summary: 'text',
  virtueDescription: 'text',
  source: 'text',
  audioUrl: 'text',
  content: 'rich-text',
  image: 'image',
  canonicalVirtue: 'reference',
  subVirtue: 'text',
  audio: 'media',
  publishedAt: 'date',
  contentUpdatedAt: 'date',
  dek: 'text',
}

/** Live fields an update may leave untouched (an existing story keeps its first publication date). */
export const UPDATE_MAY_SKIP = ['publishedAt']
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/

export async function gql(query, { token, draft = true } = {}) {
  if (process.env.STORY_OFFLINE) throw new Error('STORY_OFFLINE is set: no Basehub queries.')
  const res = await fetch(API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-basehub-api-version': '4',
      'x-basehub-token': token,
      'x-basehub-ref': 'main',
      ...(draft ? { 'x-basehub-draft': 'true' } : {}),
    },
    body: JSON.stringify({ query }),
  })
  if (!res.ok) throw new Error(`Basehub HTTP ${res.status}`)
  const body = await res.json()
  if (body.errors) throw new Error(`Basehub GraphQL: ${JSON.stringify(body.errors).slice(0, 400)}`)
  return body.data
}

/** Stories collection id and the existing item for `slug`, from the draft tree. */
export async function resolveStoryTarget(slug, token) {
  const data = await gql('query { stories { _id items { _id _slug _title } } }', { token, draft: true })
  const existing = data.stories.items.find((i) => i._slug === slug) ?? null
  return { collectionId: data.stories._id, existing }
}

/**
 * StoriesItem fields in the DRAFT tree (where the transaction lands, so a
 * staged schema migration counts): { apiName: { type, kind } } with the
 * GraphQL type name and kind.
 */
export async function liveStoryFields(token) {
  const data = await gql(
    'query { __type(name: "StoriesItem") { fields { name type { kind name ofType { kind name } } } } }',
    { token, draft: true },
  )
  const map = {}
  for (const f of data.__type.fields) {
    if (f.name.startsWith('_')) continue
    map[f.name] = { type: f.type.name ?? f.type.ofType?.name ?? null, kind: f.type.ofType?.kind ?? f.type.kind }
  }
  return map
}

/** VirtuesItem ids by slug (draft tree), for the canonicalVirtue reference. */
export async function virtueIds(token) {
  const data = await gql('query { virtues { items { _id _slug } } }', { token, draft: true })
  return Object.fromEntries(data.virtues.items.map((v) => [v._slug, v._id]))
}

/**
 * The field values the transaction writes, built from the draft. Optional
 * (migrated) fields are included only when `liveFields` has them.
 * ctx: { imageUrl, imageFileName, audioUrl, liveFields, virtueIds, canonSlug, isCreate, today }
 */
export function storyValues(draft, ctx) {
  const f = draft.fields
  const has = (name) => Boolean(ctx.liveFields?.[name])
  const values = {
    virtue: { type: 'text', value: f.virtue },
    summary: { type: 'text', value: f.summary },
    virtueDescription: { type: 'text', value: f.virtueDescription },
    source: { type: 'text', value: f.source },
    audioUrl: { type: 'text', value: ctx.audioUrl ?? '' },
    content: { type: 'rich-text', value: { format: 'markdown', value: draft.body.trim() } },
    image: { type: 'image', value: { url: ctx.imageUrl, fileName: ctx.imageFileName, altText: f.imageAlt } },
  }
  if (has('canonicalVirtue')) values.canonicalVirtue = { type: 'reference', value: ctx.virtueIds?.[ctx.canonSlug] ?? `<no VirtuesItem for "${ctx.canonSlug}">` }
  if (has('subVirtue')) values.subVirtue = { type: 'text', value: f.subVirtue ?? '' }
  // The site plays `audio.url` before `audioUrl`, so both always name the same
  // file. A story without narration leaves the media field out (the SDK's media
  // value is not nullable).
  if (has('audio') && ctx.audioUrl) values.audio = { type: 'media', value: { url: ctx.audioUrl, fileName: decodeURIComponent(ctx.audioUrl.split('/').pop()) } }
  if (has('publishedAt') && ctx.isCreate) values.publishedAt = { type: 'date', value: ctx.today }
  if (has('contentUpdatedAt')) values.contentUpdatedAt = { type: 'date', value: ctx.today }
  // Optional standfirst; empty means "use the summary" (src/lib/stories.ts).
  if (has('dek')) values.dek = { type: 'text', value: f.dek ?? '' }
  return values
}

/** Create-or-update operation for one story (never autoCommit, never commit). */
export function storyOperation(draft, target, ctx) {
  const value = storyValues(draft, { ...ctx, isCreate: !target.existing })
  if (target.existing) {
    return { type: 'update', id: target.existing._id, title: draft.fields.title, value }
  }
  return {
    type: 'create',
    parentId: target.collectionId,
    data: { type: 'instance', title: draft.fields.title, slug: draft.slug, value },
  }
}

/** Hosts an asset URL may point at: this project's Blob store and Basehub's asset CDN. */
export function allowedAssetHost(url) {
  let host
  try {
    host = new URL(url).hostname
  } catch {
    return false
  }
  const storeId = (process.env.BLOB_READ_WRITE_TOKEN ?? '').match(/^vercel_blob_rw_([A-Za-z0-9]+)_/)?.[1]?.toLowerCase()
  return host === 'assets.basehub.com' || (storeId && host === `${storeId}.public.blob.vercel-storage.com`)
}

/** Fetch an uploaded asset and confirm it is byte-for-byte the approved file. */
export async function verifyAsset(url, expectedSha256, sha256) {
  if (!allowedAssetHost(url)) return { ok: false, reason: `host not allowed (${url})` }
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(60_000) })
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` }
    const got = sha256(Buffer.from(await res.arrayBuffer()))
    return got === expectedSha256 ? { ok: true } : { ok: false, reason: `served bytes are sha256 ${got.slice(0, 12)}, approved ${expectedSha256.slice(0, 12)}` }
  } catch (err) {
    return { ok: false, reason: `could not fetch it (${err.message})` }
  }
}

let schemasPromise
async function sdkSchemas() {
  schemasPromise ??= (async () => {
    const basehubDir = realpathSync(join(REPO_ROOT, 'node_modules', 'basehub'))
    const main = createRequire(join(basehubDir, 'package.json')).resolve('@basehub/mutation-api-helpers')
    return import(pathToFileURL(join(dirname(main), 'transaction-schemas.js')).href)
  })()
  return schemasPromise
}

/**
 * Validate an operation. Returns a list of problems (empty = valid).
 * `liveFields` (from liveStoryFields) is required for a write: every live
 * field must be set (except UPDATE_MAY_SKIP on updates), every written field
 * must exist live with a compatible type, and URLs must be real https URLs on
 * an allowed asset host.
 */
export async function validateOperation(op, liveFields) {
  const problems = []
  const schemas = await sdkSchemas()
  const envelope = schemas.OperationSchema.safeParse(op)
  if (!envelope.success) problems.push(`SDK OperationSchema: ${envelope.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`)
  const value = op.type === 'update' ? op.value : op.data?.value
  const urlOf = { image: value?.image?.value?.url, audioUrl: value?.audioUrl?.value }
  for (const [name, url] of Object.entries(urlOf)) {
    if (url === undefined || (name === 'audioUrl' && url === '')) continue
    if (typeof url !== 'string' || !/^https:\/\/[^\s<>]+$/.test(url)) {
      problems.push(`${name}: "${String(url).slice(0, 80)}" is not a resolved https URL${/^</.test(String(url)) ? ' (placeholder: upload the asset first)' : ''}`)
    } else if (!allowedAssetHost(url)) {
      problems.push(`${name}: ${url} is not on this project's Blob store or assets.basehub.com`)
    }
  }
  if (value?.canonicalVirtue && !/^[A-Za-z0-9]{10,}$/.test(String(value.canonicalVirtue.value))) {
    problems.push(`canonicalVirtue: ${value.canonicalVirtue.value}`)
  }
  // The SDK's OperationSchema passes instance values through unchecked, so
  // every value is checked here against the SDK's own value schemas.
  const valueSchema = { text: schemas.TextValueSchema, 'rich-text': schemas.RichTextValueSchema, image: schemas.MediaValueSchema, media: schemas.MediaValueSchema, date: schemas.TextValueSchema, reference: schemas.TextValueSchema }
  for (const [apiName, field] of Object.entries(value ?? {})) {
    const expected = STORY_FIELD_TYPES[apiName]
    if (field.type !== expected) problems.push(`${apiName}: block type "${field.type}", expected "${expected}"`)
    if (field.value === null || field.value === undefined) {
      problems.push(`${apiName}: null value (leave the field out instead)`)
      continue
    }
    const parsed = valueSchema[field.type]?.safeParse(field.value)
    if (parsed && !parsed.success) problems.push(`${apiName}: ${parsed.error.issues.map((i) => i.message).join('; ')}`)
    if (field.type === 'date' && !ISO_DATE.test(String(field.value))) problems.push(`${apiName}: "${field.value}" is not an ISO date`)
  }
  if (liveFields) {
    for (const [apiName, field] of Object.entries(value ?? {})) {
      const live = liveFields[apiName]
      if (!live) problems.push(`${apiName}: no such field on the Basehub StoriesItem`)
      else if (!compatible(field.type, live)) problems.push(`${apiName}: live field is ${live.type ?? live.kind}, payload says "${field.type}"`)
    }
    const skippable = [...(op.type === 'update' ? UPDATE_MAY_SKIP : []), ...(value?.audioUrl?.value === '' ? ['audio'] : [])]
    for (const apiName of Object.keys(liveFields)) {
      if (!(apiName in (value ?? {})) && !skippable.includes(apiName)) {
        problems.push(`${apiName}: live field the payload does not set${STORY_FIELD_TYPES[apiName] ? '' : ' (unknown to the pipeline; teach basehub-publish.mjs about it)'}`)
      }
    }
  }
  return problems
}

function compatible(blockType, live) {
  switch (blockType) {
    case 'text':
    case 'date':
      return live.type === 'String'
    case 'rich-text':
      return /RichText|^Content/.test(live.type ?? '')
    case 'image':
      return live.type === 'BlockImage'
    case 'media':
      return live.kind === 'UNION' || /^Block(Audio|Video|File|Image)$/.test(live.type ?? '')
    case 'reference':
      return live.kind === 'UNION' || live.type === 'VirtuesItem'
    default:
      return false
  }
}

/** Upload a local file to Basehub assets via getUploadSignedURL. Returns the asset URL. */
export async function uploadAsset(token, fileName, bytes, contentType) {
  const { basehub } = await import('basehub')
  const { getUploadSignedURL } = await basehub({ token }).mutation({
    getUploadSignedURL: { __args: { fileName }, signedURL: true, uploadURL: true },
  })
  const put = await fetch(getUploadSignedURL.signedURL, { method: 'PUT', body: bytes, headers: { 'Content-Type': contentType } })
  if (!put.ok) throw new Error(`Basehub asset upload failed: HTTP ${put.status}`)
  return getUploadSignedURL.uploadURL
}

/** Run one transaction. `data` is an array of operations. Throws unless Completed. */
export async function transact(token, data, label) {
  const { basehub } = await import('basehub')
  const { transaction } = await basehub({ token }).mutation({
    transaction: { __args: { data }, status: true, message: true, duration: true },
  })
  if (transaction.status !== 'Completed') {
    throw new Error(`${label} did not complete (status ${transaction.status}${transaction.message ? `: ${transaction.message}` : ''})`)
  }
  return transaction
}

/** Field-by-field differences between a published item and the values about to be written (full text). */
export function fieldDiff(item, values, title) {
  const current = {
    title: item._title,
    virtue: item.virtue,
    summary: item.summary,
    virtueDescription: item.virtueDescription,
    source: item.source ?? '',
    audioUrl: item.audioUrl ?? '',
    'image.url': item.image?.url ?? '',
    'image.alt': item.image?.alt ?? '',
    content: (item.content?.markdown ?? '').trim(),
    ...('canonicalVirtue' in values ? { canonicalVirtue: item.canonicalVirtue?._id ?? '' } : {}),
    ...('subVirtue' in values ? { subVirtue: item.subVirtue ?? '' } : {}),
    ...('audio' in values ? { 'audio.url': item.audio?.url ?? '' } : {}),
    ...('contentUpdatedAt' in values ? { contentUpdatedAt: item.contentUpdatedAt ?? '' } : {}),
    ...('dek' in values ? { dek: item.dek ?? '' } : {}),
  }
  const next = {
    title,
    virtue: values.virtue.value,
    summary: values.summary.value,
    virtueDescription: values.virtueDescription.value,
    source: values.source.value,
    audioUrl: values.audioUrl.value,
    'image.url': values.image.value.url,
    'image.alt': values.image.value.altText,
    content: values.content.value.value,
    ...('canonicalVirtue' in values ? { canonicalVirtue: values.canonicalVirtue.value } : {}),
    ...('subVirtue' in values ? { subVirtue: values.subVirtue.value } : {}),
    ...('audio' in values ? { 'audio.url': values.audio.value?.url ?? '' } : {}),
    ...('contentUpdatedAt' in values ? { contentUpdatedAt: values.contentUpdatedAt.value } : {}),
    ...('dek' in values ? { dek: values.dek.value } : {}),
  }
  return Object.keys(next).filter((k) => String(current[k] ?? '').trim() !== String(next[k] ?? '').trim()).map((k) => ({ field: k, from: String(current[k] ?? ''), to: String(next[k] ?? '') }))
}
