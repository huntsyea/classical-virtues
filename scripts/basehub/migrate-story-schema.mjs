// Evolve the Basehub `stories` schema toward the writing.md field contract.
//
// Adds, to the StoriesItem template (only if missing):
//   - canonicalVirtue  reference → one VirtuesItem (the seven-virtue canon)
//   - subVirtue        text      (the editorial angle: kindness, mercy, honesty…)
//   - audio            media     (audio only; Basehub reports duration and size)
//   - publishedAt      date      (editorial publication date; `_sys.createdAt`
//                                 is only when the entry was created)
//   - contentUpdatedAt date      (last substantive revision; `_sys.lastModifiedAt`
//                                 moves on every edit, including this backfill)
//   - dek              text      (editorial standfirst for the story page and
//                                 cards, 80 to 160 characters; never backfilled,
//                                 editors write it; the site falls back to summary)
// Optionally:
//   --enable-search    turn on "Index block" for the StoriesItem component so
//                      `_searchKey` + `basehub/search` start returning results
//   --backfill         fill EMPTY canonicalVirtue / subVirtue / audio values from
//                      the existing free-text `virtue` and `audioUrl` fields, and
//                      the two dates from the current `_sys` dates (read BEFORE
//                      the backfill touches the entry, so it fakes no freshness).
//                      Never overwrites a value an editor has set.
//   --limit N          backfill at most N stories (trial run, e.g. --limit 1 to
//                      confirm Basehub accepts the media op before the rest)
//
// `imageAlt` needs no field: the image block's own `alt` already carries it, and
// `source` already exists.
//
// SAFETY
//   - Dry run by default: reads the draft tree, prints the plan, writes nothing.
//   - `--apply` stages the plan as uncommitted changes (no `autoCommit`, no
//     `commit` op). Review and commit them in Basehub's Changes tab. Committing
//     publishes the WHOLE working tree, so check it holds nothing else first;
//     this script lists other pending changes it can see.
//   - Idempotent: fields are matched by apiName against the draft schema, and
//     backfill only touches empty values, so re-running is a no-op.
//   - The site tolerates every state: `src/lib/basehub.ts` introspects the
//     committed schema and only selects these fields once they exist.
//
// USAGE (needs a WRITE-scoped admin token for --apply; reads work with either)
//   node --env-file=.env.local scripts/basehub/migrate-story-schema.mjs
//   node --env-file=.env.local scripts/basehub/migrate-story-schema.mjs --enable-search --backfill
//   node --env-file=.env.local scripts/basehub/migrate-story-schema.mjs --apply
//   node --env-file=.env.local scripts/basehub/migrate-story-schema.mjs --apply --enable-search --backfill
//
// Backfill needs the fields to exist in the draft tree. On a first `--apply`
// that creates them, the script re-reads the draft and stages backfill in a
// second transaction.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { basehub } from 'basehub'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const API = 'https://api.basehub.com/graphql'
const ARGS = new Set(process.argv.slice(2))
const APPLY = ARGS.has('--apply')
const BACKFILL = ARGS.has('--backfill')
const ENABLE_SEARCH = ARGS.has('--enable-search')
const LIMIT = (() => {
  const i = process.argv.indexOf('--limit')
  const n = i > -1 ? Number(process.argv[i + 1]) : Infinity
  return Number.isFinite(n) && n > 0 ? n : Infinity
})()
const TOKEN = process.env.BASEHUB_ADMIN_TOKEN || process.env.BASEHUB_TOKEN

/* ---------------------------------------------------------------------------
 * Canon (single source of truth: src/data/virtues.json + src/lib/canon.ts)
 * ------------------------------------------------------------------------- */

const CANON = JSON.parse(readFileSync(join(ROOT, 'src', 'data', 'virtues.json'), 'utf8'))

/** Parse SUB_VIRTUE_TO_CANON_SLUG out of canon.ts so the mapping never forks. */
function readSubVirtueMap() {
  const source = readFileSync(join(ROOT, 'src', 'lib', 'canon.ts'), 'utf8')
  const body = source.match(/SUB_VIRTUE_TO_CANON_SLUG[^=]*=\s*\{([^}]*)\}/)?.[1]
  if (!body) throw new Error('Could not find SUB_VIRTUE_TO_CANON_SLUG in src/lib/canon.ts')
  return Object.fromEntries([...body.matchAll(/(\w+)\s*:\s*'([\w-]+)'/g)].map((m) => [m[1], m[2]]))
}
const SUB_VIRTUES = readSubVirtueMap()

function resolveCanon(virtue) {
  const needle = virtue?.trim().toLowerCase()
  if (!needle) return null
  return (
    CANON.find(
      (v) => needle === v.slug || needle === v.title.toLowerCase() || needle === v.alternateName?.toLowerCase(),
    ) ??
    CANON.find((v) => v.slug === SUB_VIRTUES[needle]) ??
    null
  )
}

/* ---------------------------------------------------------------------------
 * Read side (draft tree, read-only)
 * ------------------------------------------------------------------------- */

async function draftQuery(query, { draft = true } = {}) {
  const res = await fetch(API, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-basehub-api-version': '4',
      'x-basehub-token': TOKEN,
      'x-basehub-ref': 'main',
      ...(draft ? { 'x-basehub-draft': 'true' } : {}),
    },
    body: JSON.stringify({ query }),
  })
  const json = await res.json()
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join('; '))
  return json.data
}

/** Find a list block and its template component in `_structure`. */
function findList(structure, objectName) {
  const re = new RegExp(`<List [^>]*objectName="${objectName}" id="([^"]+)"[^>]*targetBlockId="([^"]+)"`)
  const m = structure.match(re)
  return m ? { listId: m[1], templateId: m[2] } : null
}

async function discover() {
  const { _structure: structure } = await draftQuery('query { _structure }')
  const text = typeof structure === 'string' ? structure : JSON.stringify(structure)
  const stories = findList(text, 'Stories')
  const virtues = findList(text, 'Virtues')
  if (!stories) throw new Error('Stories list not found in the repo structure')
  if (!virtues) throw new Error('Virtues list not found. Run scripts/seed-virtues.mjs first.')

  const schema = await draftQuery(
    'query { __type(name: "StoriesItem") { fields { name type { kind ofType { kind } } } } }',
  )
  // Field name → GraphQL kind. Reference and media fields may come back as an
  // OBJECT or a UNION depending on how Basehub types them, so selections adapt
  // (a plain selection on a union would make every later run fail).
  const kinds = new Map((schema.__type?.fields ?? []).map((f) => [f.name, f.type.ofType?.kind ?? f.type.kind]))
  const fields = new Set(kinds.keys())
  const select = (name, typeName, inner) =>
    !fields.has(name) ? '' : kinds.get(name) === 'UNION' ? `${name} { __typename ... on ${typeName} { ${inner} } }` : `${name} { ${inner} }`

  const optional = [
    select('canonicalVirtue', 'VirtuesItem', '_id'),
    fields.has('subVirtue') ? 'subVirtue' : '',
    select('audio', 'BlockAudio', 'url'),
    fields.has('publishedAt') ? 'publishedAt' : '',
    fields.has('contentUpdatedAt') ? 'contentUpdatedAt' : '',
  ].join(' ')
  const data = await draftQuery(`query {
    stories { items { _id _slug _title virtue audioUrl _sys { createdAt lastModifiedAt } ${optional} } }
    virtues { items { _id _slug _title } }
  }`)

  // Backfilled dates come from the PUBLISHED tree, so pending draft edits do
  // not leak into contentUpdatedAt.
  const published = await draftQuery('query { stories { items { _id _sys { createdAt lastModifiedAt } } } }', {
    draft: false,
  })
  const publishedSys = new Map(published.stories.items.map((i) => [i._id, i._sys]))
  for (const row of data.stories.items) row._publishedSys = publishedSys.get(row._id) ?? null

  let pending = null
  try {
    const diff = (await draftQuery('query { _diff }'))._diff
    pending = diff && typeof diff === 'object' ? diff : null
  } catch {
    pending = null
  }

  return { stories, virtues, fields, storyRows: data.stories.items, virtueRows: data.virtues.items, pending }
}

/* ---------------------------------------------------------------------------
 * Plan
 * ------------------------------------------------------------------------- */

function schemaOps(state) {
  const ops = []
  if (!state.fields.has('canonicalVirtue')) {
    ops.push({
      type: 'create',
      parentId: state.stories.templateId,
      data: {
        type: 'reference',
        title: 'Canonical Virtue',
        apiName: 'canonicalVirtue',
        description: 'One of the seven classical virtues this story belongs to. Drives the virtue hub it appears on.',
        allowedComponents: [state.virtues.templateId],
        multiple: false,
        isRequired: false,
      },
    })
  }
  if (!state.fields.has('subVirtue')) {
    ops.push({
      type: 'create',
      parentId: state.stories.templateId,
      data: {
        type: 'text',
        title: 'Sub-virtue',
        apiName: 'subVirtue',
        description: 'Optional editorial angle, e.g. Kindness or Honesty. Must map to the canonical virtue.',
        isRequired: false,
      },
    })
  }
  if (!state.fields.has('audio')) {
    ops.push({
      type: 'create',
      parentId: state.stories.templateId,
      data: {
        type: 'media',
        title: 'Audio',
        apiName: 'audio',
        description: 'Narration (MP3). Basehub reports its duration and size for feeds and structured data.',
        subTypes: ['audio'],
        isRequired: false,
      },
    })
  }
  if (!state.fields.has('publishedAt')) {
    ops.push({
      type: 'create',
      parentId: state.stories.templateId,
      data: {
        type: 'date',
        title: 'Published At',
        apiName: 'publishedAt',
        description: 'Editorial publication date. Drives datePublished, the feed pubDate, and sort order.',
        isRequired: false,
      },
    })
  }
  if (!state.fields.has('contentUpdatedAt')) {
    ops.push({
      type: 'create',
      parentId: state.stories.templateId,
      data: {
        type: 'date',
        title: 'Content Updated At',
        apiName: 'contentUpdatedAt',
        description: 'Set when the story text materially changes. Drives dateModified and sitemap lastmod.',
        isRequired: false,
      },
    })
  }
  if (!state.fields.has('dek')) {
    ops.push({
      type: 'create',
      parentId: state.stories.templateId,
      data: {
        type: 'text',
        title: 'Dek',
        apiName: 'dek',
        description:
          'Optional standfirst under the title and on cards, 80 to 160 characters, no em or en dashes. Leave empty to use the summary. The summary stays the meta description.',
        isRequired: false,
      },
    })
  }
  if (ENABLE_SEARCH) {
    ops.push({ type: 'update', id: state.stories.templateId, searchIndex: true })
  }
  return ops
}

function backfillOps(state) {
  const virtueIdBySlug = new Map(state.virtueRows.map((v) => [v._slug, v._id]))
  const ops = []
  const notes = []
  for (const row of state.storyRows) {
    const value = {}
    const canon = resolveCanon(row.virtue)

    if (state.fields.has('canonicalVirtue') && !row.canonicalVirtue?._id) {
      const id = canon && virtueIdBySlug.get(canon.slug)
      if (id) value.canonicalVirtue = { type: 'reference', value: id }
      else notes.push(`${row._slug}: virtue "${row.virtue}" maps to no canon entry; set canonicalVirtue by hand`)
    }

    if (state.fields.has('subVirtue') && !row.subVirtue?.trim() && row.virtue?.trim()) {
      const angle = row.virtue.trim()
      const isCanonName = canon && [canon.title, canon.alternateName].some((n) => n?.toLowerCase() === angle.toLowerCase())
      if (!isCanonName) value.subVirtue = { type: 'text', value: angle }
    }

    if (state.fields.has('audio') && !row.audio?.url && row.audioUrl) {
      value.audio = {
        type: 'media',
        value: { url: row.audioUrl, fileName: decodeURIComponent(new URL(row.audioUrl).pathname.split('/').pop()) },
      }
    }

    // Dates come from `_sys` as read before this backfill edits the entry.
    const sys = row._publishedSys ?? row._sys // unpublished stories fall back to the draft dates
    if (state.fields.has('publishedAt') && !row.publishedAt && sys?.createdAt) {
      value.publishedAt = { type: 'date', value: sys.createdAt }
    }
    if (state.fields.has('contentUpdatedAt') && !row.contentUpdatedAt && sys?.lastModifiedAt) {
      value.contentUpdatedAt = { type: 'date', value: sys.lastModifiedAt }
    }

    if (Object.keys(value).length) ops.push({ type: 'update', id: row._id, value, _slug: row._slug })
  }
  return { ops: ops.slice(0, LIMIT), notes, remaining: Math.max(0, ops.length - LIMIT) }
}

/* ---------------------------------------------------------------------------
 * Write side (only with --apply; never commits)
 * ------------------------------------------------------------------------- */

async function stage(label, ops) {
  if (!ops.length) {
    console.log(`  ${label}: nothing to do`)
    return
  }
  // `_slug` is plan-only bookkeeping for the log; strip it before sending.
  const data = ops.map((op) => Object.fromEntries(Object.entries(op).filter(([k]) => k !== '_slug')))
  const { transaction } = await basehub({ token: TOKEN }).mutation({
    // No autoCommit: changes stay in the working tree for a human to review.
    transaction: { __args: { data }, status: true, message: true, duration: true },
  })
  console.log(`  ${label}: ${transaction.status}${transaction.message ? `, ${transaction.message}` : ''}`)
  if (transaction.status !== 'Completed') throw new Error(`${label} did not complete (${transaction.status})`)
}

function describe(op) {
  if (op.type === 'create') return `create ${op.data.type} field "${op.data.apiName}" on StoriesItem`
  if (op.searchIndex) return 'enable search indexing on StoriesItem'
  return `update ${op._slug}: ${Object.keys(op.value).join(', ')}`
}

async function main() {
  if (!TOKEN) {
    console.error('✗ No token. Set BASEHUB_ADMIN_TOKEN (write scope for --apply) and rerun.')
    process.exit(1)
  }

  console.log(APPLY ? 'Mode: APPLY (stage, do not commit)' : 'Mode: DRY RUN (no writes)')
  let state = await discover()
  console.log(`Stories list ${state.stories.listId}, template ${state.stories.templateId}`)
  console.log(`Virtues template ${state.virtues.templateId} (${state.virtueRows.length} virtues)`)
  console.log(
    `Existing optional fields: ${['canonicalVirtue', 'subVirtue', 'audio', 'publishedAt', 'contentUpdatedAt', 'dek'].filter((f) => state.fields.has(f)).join(', ') || 'none'}`,
  )
  const pendingCount = Number(state.pending?.changesCount ?? 0)
  if (pendingCount > 0) {
    const blocks = (state.pending.items ?? [])
      .map((i) => i.value?.current ?? i.value?.previous)
      .filter((b) => b && b.type !== 'root')
      .map((b) => `${b.type}${b.title ? ` "${b.title}"` : ''}`)
    console.log(`\n⚠ The draft already holds ${pendingCount} uncommitted change(s) not made by this script:`)
    console.log(`  ${blocks.join(', ') || '(see the Changes tab)'}`)
    console.log('  A Basehub commit publishes all of them together. Review them before committing.')
  }

  const schema = schemaOps(state)
  console.log('\nSchema plan:')
  for (const op of schema) console.log(`  - ${describe(op)}`)
  if (!schema.length) console.log('  (up to date)')

  let backfill = { ops: [], notes: [], remaining: 0 }
  if (BACKFILL) {
    backfill = backfillOps(state)
    console.log('\nBackfill plan:')
    if (schema.some((op) => op.type === 'create')) {
      console.log('  Fields above must exist first; with --apply they are staged, then backfill is planned again.')
    }
    for (const op of backfill.ops) console.log(`  - ${describe(op)}`)
    if (backfill.remaining) console.log(`  (${backfill.remaining} more held back by --limit; re-run to continue)`)
    for (const note of backfill.notes) console.log(`  ! ${note}`)
    if (!backfill.ops.length && !backfill.notes.length) console.log('  (nothing to fill)')
  }

  if (!APPLY) {
    console.log('\nDry run complete. Re-run with --apply to stage these changes (still uncommitted).')
    return
  }

  console.log('\nStaging:')
  await stage('schema', schema)
  if (BACKFILL) {
    if (schema.some((op) => op.type === 'create')) {
      state = await discover()
      backfill = backfillOps(state)
    }
    await stage('backfill', backfill.ops)
  }
  console.log('\n✓ Staged. Review and commit in Basehub (Changes tab). Then run `pnpm basehub` to regenerate types.')
}

main().catch((err) => {
  console.error('✗ Migration failed:', err.message)
  process.exit(1)
})
