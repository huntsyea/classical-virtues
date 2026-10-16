// audio:upload: publish a mastered narration to Vercel Blob.
//
//   pnpm audio:upload <file.mp3> --slug <slug>                  dry run: prints the plan
//   pnpm audio:upload <file.mp3> --slug <slug> --remaster --yes  replace a PUBLISHED story's
//                                                               narration (needs BLOB_READ_WRITE_TOKEN)
//
// New stories upload through `story:publish <slug> --assets --yes`, which
// enforces operator approval of these exact bytes; this command refuses --yes
// for any slug with a draft in the repo's content/drafts (whatever
// STORY_DRAFTS_DIR says). --remaster is for re-mastered narration of a story
// already published, and still has to pass audio:analyze. It only uploads;
// pointing the story at the new file (audioUrl, and the audio media field once
// the schema migration lands, which the site plays first) is a Basehub edit.
//
// Why Vercel Blob and not Basehub assets: the site stores `audioUrl` as a plain
// text field, so Basehub's asset/media integration buys nothing, while Blob
// lets us choose the pathname, content type, and cache lifetime, and is where
// the live narrations already sit (served with Accept-Ranges for seeking).
//
// The pathname is content-addressed, audio/<slug>-<sha256[0:8]>.mp3, with no
// random suffix and overwrite disabled. Same bytes, same URL: re-running is a
// no-op that returns the existing URL. A changed master gets a new URL, so a
// one-year browser/CDN cache can never serve a stale narration. (Blob sets
// `max-age` from cacheControlMaxAge; it does not let callers add `immutable`,
// but content addressing gives the same guarantee.)
//
// Gate: the file must pass audio:analyze first. A failing master never uploads.

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { analyzeFile, printReport } from './analyze.mjs'
import { main, isEntry, log, c, UsageError, GateError, requireEnv, assertSlug, REPO_ROOT } from '../story/lib/cli.mjs'
import { draftPaths, sha256 } from '../story/lib/draft.mjs'

const ONE_YEAR = 365 * 24 * 60 * 60

export function blobPathname(slug, bytes) {
  return `audio/${assertSlug(slug)}-${sha256(bytes).slice(0, 8)}.mp3`
}

/**
 * The public URL a pathname will have in this project's store, derived from the
 * store id inside BLOB_READ_WRITE_TOKEN (vercel_blob_rw_<storeId>_<secret>),
 * so a dry run can show the real URL. Null when no token is configured.
 */
export function blobPublicUrl(pathname) {
  const id = (process.env.BLOB_READ_WRITE_TOKEN ?? '').match(/^vercel_blob_rw_([A-Za-z0-9]+)_/)?.[1]
  return id ? `https://${id.toLowerCase()}.public.blob.vercel-storage.com/${pathname}` : null
}

/**
 * Upload (or dry-run) a narration. Returns { url|null, pathname, existed, dryRun }.
 * Writes the result into the MP3's JSON sidecar when one exists.
 */
export async function uploadNarration(file, slug, { yes = false, quiet = false, expectedSha256 = null, hint = 'remaster' } = {}) {
  assertSlug(slug)
  if (!existsSync(file)) throw new UsageError(`No such file: ${file}`)
  const bytes = readFileSync(file)
  if (expectedSha256 && sha256(bytes) !== expectedSha256) {
    throw new GateError(`${file} is not the approved narration (sha256 changed). Re-approve before uploading.`)
  }
  const pathname = blobPathname(slug, bytes)
  const report = await analyzeFile(file)
  if (!quiet) printReport(report)
  if (report.verdict !== 'pass') {
    throw new GateError(`${file} fails the narration spec; master it again before uploading.`)
  }
  const options = {
    access: 'public',
    contentType: 'audio/mpeg',
    cacheControlMaxAge: ONE_YEAR,
    addRandomSuffix: false,
    allowOverwrite: false,
  }
  const blob = await import('@vercel/blob')
  const token = process.env.BLOB_READ_WRITE_TOKEN

  // Read-only existence check (safe in dry runs when a token is present).
  let existing = null
  if (token) {
    try {
      existing = await blob.head(pathname, { token })
    } catch (err) {
      if (!(err instanceof blob.BlobNotFoundError)) throw err
    }
  }

  if (!yes) {
    console.log(c.bold('\nDry run: nothing uploaded.'))
    console.log(`  put(${JSON.stringify(pathname)}, <${bytes.length} bytes>, ${JSON.stringify(options)})`)
    console.log(`  ${existing ? `already in the store: ${existing.url}` : token ? `not yet in the store; will be served at ${blobPublicUrl(pathname)}` : 'BLOB_READ_WRITE_TOKEN not set; existence not checked'}`)
    console.log(c.dim(hint === 'story:publish' ? `  Upload with: pnpm story:publish ${slug} --assets --yes` : '  Re-run with --remaster --yes to upload.'))
    return { url: existing?.url ?? null, plannedUrl: existing?.url ?? blobPublicUrl(pathname), pathname, existed: Boolean(existing), dryRun: true }
  }

  requireEnv('BLOB_READ_WRITE_TOKEN', 'Add the Vercel Blob read-write token to .env.local.')
  let url = existing?.url
  if (existing) {
    log.ok(`Already uploaded (same bytes): ${url}`)
  } else {
    if (expectedSha256 && sha256(readFileSync(file)) !== expectedSha256) throw new GateError('Narration changed on disk during upload; aborting.')
    const result = await blob.put(pathname, bytes, { ...options, token })
    url = result.url
    log.ok(`Uploaded ${pathname} → ${url}`)
  }
  await verifyServed(url, bytes.length)

  const sidecar = file.replace(/\.mp3$/, '.json')
  if (existsSync(sidecar)) {
    const data = JSON.parse(readFileSync(sidecar, 'utf8'))
    data.upload = { url, pathname, sha256: sha256(bytes), at: new Date().toISOString() }
    writeFileSync(sidecar, JSON.stringify(data, null, 2) + '\n')
  }
  return { url, pathname, existed: Boolean(existing), dryRun: false }
}

/** Confirm the CDN serves what browsers need for seekable playback. */
async function verifyServed(url, expectedBytes) {
  const res = await fetch(url, { headers: { Range: 'bytes=0-1' } })
  const problems = []
  if (res.status !== 206) problems.push(`range request returned ${res.status}, want 206`)
  if (!/audio\/mpeg/.test(res.headers.get('content-type') ?? '')) problems.push(`content-type ${res.headers.get('content-type')}`)
  const total = Number((res.headers.get('content-range') ?? '').split('/')[1])
  if (total && total !== expectedBytes) problems.push(`served ${total} bytes, want ${expectedBytes}`)
  if (problems.length) throw new Error(`Uploaded, but the CDN response is wrong: ${problems.join('; ')}`)
  log.ok(`CDN check: 206 Partial Content, audio/mpeg, ${expectedBytes} bytes, cache-control "${res.headers.get('cache-control')}"`)
}

/** A slug with a draft anywhere the pipeline looks (the repo's content/drafts always counts). */
function hasDraft(slug) {
  return existsSync(join(REPO_ROOT, 'content', 'drafts', `${slug}.md`)) || existsSync(draftPaths(slug).draft)
}

/** Published slugs: live Basehub when a token is set, else the latest backup. */
async function isPublished(slug) {
  const token = process.env.BASEHUB_TOKEN || process.env.BASEHUB_ADMIN_TOKEN
  if (token && !process.env.STORY_OFFLINE) {
    const { gql } = await import('../story/lib/basehub-publish.mjs')
    const data = await gql('query { stories { items { _slug } } }', { token, draft: false })
    return data.stories.items.some((s) => s._slug === slug)
  }
  const backup = JSON.parse(readFileSync(join(REPO_ROOT, 'backups', 'basehub', 'latest.json'), 'utf8'))
  return backup.stories.some((s) => s._slug === slug)
}

async function cli({ _, flags }) {
  const file = _[0]
  const slug = assertSlug(flags.slug)
  if (hasDraft(slug)) {
    if (flags.yes) throw new GateError(`"${slug}" has a draft. Upload through \`pnpm story:publish ${slug} --assets --yes\`, which checks operator approval of these bytes.`)
    log.info(`"${slug}" has a draft: this dry run is informational; the upload happens through story:publish --assets --yes.`)
  } else if (!(await isPublished(slug))) {
    throw new GateError(`"${slug}" is neither a draft nor a published story; there is nothing to attach this narration to.`)
  } else if (flags.yes && !flags.remaster) {
    throw new GateError('Standalone uploads are for re-mastered narration of a published story. Pass --remaster --yes to confirm.')
  }
  const result = await uploadNarration(file, slug, { yes: Boolean(flags.yes), quiet: Boolean(flags.quiet), hint: hasDraft(slug) ? 'story:publish' : 'remaster' })
  if (result.url && !result.dryRun) {
    log.info(`audioUrl: ${result.url}`)
    log.info('Point the story at it in Basehub: set audioUrl, and the audio media field too if the schema has it (the site plays audio.url first).')
  }
}

if (isEntry(import.meta.url)) {
  main(cli, { meta: import.meta.url, args: [1, 1], flags: { slug: 'string', yes: 'boolean', remaster: 'boolean', quiet: 'boolean' } })
}
