// Draft paths, loading, and per-story pipeline state.
//
// Layout (one story):
//   content/drafts/<slug>.md          the draft: frontmatter fields + narrative body
//   content/drafts/<slug>.gate.md     the editor's gate note (rounds bound to the draft sha256)
//   content/drafts/<slug>.seo.md      SEO QA note (story:seo)
//   content/drafts/<slug>/            sidecar owned by the pipeline scripts
//     brief.md                        ladder step 1 brief (story:new)
//     state.json                      stage cache for story:status (never a gate)
//     image/  audio/                  generated masters and their JSON sidecars
//
// The pipeline never writes the draft file. Gates are recomputed from the files
// (draft, notes, image, MP3) on every run; state.json only caches results for
// story:status and remembers uploaded asset URLs.

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { REPO_ROOT, assertSlug, GateError, UsageError } from './cli.mjs'
import { parseFrontmatter } from './frontmatter.mjs'

// STORY_DRAFTS_DIR lets tests and rehearsals run the whole pipeline against a
// scratch directory without touching content/drafts.
export const DRAFTS_DIR = process.env.STORY_DRAFTS_DIR || join(REPO_ROOT, 'content', 'drafts')
export const EXEMPLARS_DIR = join(REPO_ROOT, 'content', 'vault', 'exemplars')
export const SITE_URL = (process.env.STORY_SITE_URL || 'https://www.classicalvirtues.com').replace(/\/$/, '')
export const LOCAL_URL = 'http://localhost:3100'

/**
 * Resolve the site a remote-touching command targets. Default is the local
 * dev server. Anything else must be this site (www or apex) or a preview host
 * listed exactly in STORY_PREVIEW_HOSTS (comma-separated; Vercel project names
 * are registrable by anyone, so no pattern is trusted), over https, and needs
 * --yes, so a stray flag can never reach production.
 */
export function siteTarget(flags) {
  const base = String(flags['base-url'] || LOCAL_URL).replace(/\/+$/, '')
  let url
  try {
    url = new URL(base)
  } catch {
    throw new UsageError(`--base-url "${base}" is not a URL.`)
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  if (local) return { base, local: true, production: false }
  const siteHost = new URL(SITE_URL).hostname
  const apex = siteHost.replace(/^www\./, '')
  const previews = (process.env.STORY_PREVIEW_HOSTS ?? '').split(',').map((h) => h.trim()).filter(Boolean)
  const production = [siteHost, apex].includes(url.hostname)
  if (!production && !previews.includes(url.hostname)) {
    throw new UsageError(`${url.hostname} is not this site. Allowed: localhost, ${siteHost}, ${apex}${previews.length ? `, ${previews.join(', ')}` : ''} (add preview hosts to STORY_PREVIEW_HOSTS).`)
  }
  if (url.protocol !== 'https:') throw new UsageError(`${base} must use https.`)
  if (!flags.yes) throw new GateError(`${base} is a live site. Pass --yes to target it.`)
  return { base, local: false, production }
}

export function draftPaths(slug) {
  assertSlug(slug)
  const dir = join(DRAFTS_DIR, slug)
  return {
    draft: join(DRAFTS_DIR, `${slug}.md`),
    gate: join(DRAFTS_DIR, `${slug}.gate.md`),
    seo: join(DRAFTS_DIR, `${slug}.seo.md`),
    dir,
    brief: join(dir, 'brief.md'),
    state: join(dir, 'state.json'),
    imageDir: join(dir, 'image'),
    audioDir: join(dir, 'audio'),
  }
}

/** Repo-relative path for display; absolute when the file lives outside the repo. */
export const rel = (p) => {
  const r = relative(REPO_ROOT, p)
  return r.startsWith('..') ? p : r
}

export function sha256(data) {
  return createHash('sha256').update(data).digest('hex')
}

/** sha256 of a file's bytes on disk, or null when it does not exist. */
export function fileSha256(path) {
  return existsSync(path) ? sha256(readFileSync(path)) : null
}

/**
 * Load and parse a draft. Returns the raw text, parsed frontmatter, body, a
 * whole-file hash (for staleness), and the body/field values every stage reads.
 */
export function loadDraft(slug) {
  const paths = draftPaths(slug)
  if (!existsSync(paths.draft)) {
    throw new UsageError(`No draft at ${rel(paths.draft)}. Run \`pnpm story:new ${slug}\` and draft it first.`)
  }
  const bytes = readFileSync(paths.draft)
  const raw = bytes.toString('utf8')
  let parsed
  try {
    parsed = parseFrontmatter(raw)
  } catch (err) {
    throw new GateError(`${rel(paths.draft)}: ${err.message}`)
  }
  const fields = normalizeFields(parsed.data)
  return {
    slug,
    paths,
    raw,
    hash: sha256(bytes), // equals `sha256sum content/drafts/<slug>.md`
    data: parsed.data,
    fields,
    body: parsed.body.replace(/\s+$/, '') + '\n',
    hasFrontmatter: parsed.hasFrontmatter,
  }
}

/** Trim strings, collapse folded-block trailing newlines, and coerce to strings. */
function normalizeFields(data) {
  const str = (v) => (v === null || v === undefined ? '' : typeof v === 'string' ? v.trim() : v)
  const out = {}
  for (const [k, v] of Object.entries(data)) out[k] = Array.isArray(v) ? v.map(str) : str(v)
  return out
}

/**
 * The draft's `audio` field (content/story-format.md v1):
 *   "planned" → narrate with TTS      "human" → a recording comes via --input
 *   "none"    → ships without audio   "https://…" → finished narration already hosted
 */
export function audioExpectation(fields) {
  const v = String(fields.audio ?? '').trim()
  if (/^https:\/\//.test(v)) return 'url'
  const lower = v.toLowerCase()
  if (lower === 'none') return 'none'
  if (lower === 'human') return 'human'
  return 'tts'
}

// ---------------------------------------------------------------- state.json

export function readState(slug) {
  const { state } = draftPaths(slug)
  if (!existsSync(state)) return { slug, stages: {} }
  return JSON.parse(readFileSync(state, 'utf8'))
}

export function writeStage(slug, stage, record) {
  const paths = draftPaths(slug)
  mkdirSync(paths.dir, { recursive: true })
  const state = readState(slug)
  state.slug = slug
  state.stages[stage] = { ...record, at: new Date().toISOString() }
  writeFileSync(paths.state, JSON.stringify(state, null, 2) + '\n')
  return state.stages[stage]
}

/**
 * Gate helper: require `stage` to have passed against the current inputs.
 * By default the inputs are the whole draft file; image and audio pass their
 * own input hash (prompt/alt, read-aloud script) so a body typo fix does not
 * force a new illustration. Throws a GateError naming the command to rerun.
 */
export function requireStage(draft, stage, command, { key = 'draftHash', expected = draft.hash } = {}) {
  const record = readState(draft.slug).stages[stage]
  if (!record) {
    throw new GateError(`${stage} has not run for "${draft.slug}". Run \`${command}\` first.`)
  }
  if (record.status !== 'pass') {
    throw new GateError(`${stage} is "${record.status}" for "${draft.slug}". Fix it and rerun \`${command}\`.`)
  }
  if (record[key] !== expected) {
    throw new GateError(
      `${stage} passed against older inputs (the draft changed since ${record.at}). Rerun \`${command}\`.`,
    )
  }
  return record
}

export function ensureDir(p) {
  mkdirSync(p, { recursive: true })
  return p
}
