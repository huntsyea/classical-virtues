// Seed the seven-virtue canon into Basehub (PRO-19).
//
// Stands up a `virtues` collection with a component template and one instance
// per classical virtue (4 cardinal + 3 theological), then commits so the site's
// read token sees it. Idempotent: the collection is keyed on apiName, and each
// instance is matched to an existing row by slug and UPDATED in place (the
// Mutation API's per-instance `idempotency` key auto-suffixes the slug instead
// of updating, so we resolve ids ourselves and emit update-vs-create ops).
//
// The canon itself lives in src/data/virtues.json — the single source of truth
// shared with the website (src/lib/virtues.ts), so there is no drift.
//
// Usage:
//   BASEHUB_ADMIN_TOKEN must have WRITE scope (an Admin Token). The read token
//   used by the site at runtime is NOT sufficient. Provide it via env:
//
//     BASEHUB_ADMIN_TOKEN=bshb_xxx node --env-file=.env.local scripts/seed-virtues.mjs
//
// Why three phases (learned the hard way against the live Mutation API):
//   1. Create the collection + its template, with NO autoCommit. The API
//      refuses to autoCommit a transaction that introduces a brand-new
//      collection, and it will not even stage a collection that carries its
//      rows inline — so the template must go up on its own first.
//   2. Create the instances as children of the collection (parentId), again
//      with NO autoCommit, so they stage cleanly under the staged template.
//   3. Commit the working tree with an explicit `commit` operation, which is
//      what actually publishes new collections (autoCommit cannot).
//
// NOTE: the `commit` operation publishes the ENTIRE working tree on `main`, not
// just this script's changes. Run it only when the Basehub working draft holds
// nothing you are not ready to publish.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { basehub } from 'basehub'

const __dirname = dirname(fileURLToPath(import.meta.url))
const VIRTUES = JSON.parse(
  readFileSync(join(__dirname, '..', 'src', 'data', 'virtues.json'), 'utf8'),
)

const TOKEN = process.env.BASEHUB_ADMIN_TOKEN || process.env.BASEHUB_TOKEN
const API = 'https://api.basehub.com/graphql'

/** Read against the draft (working) tree, where staged-but-uncommitted changes are visible. */
async function draftQuery(query) {
  const res = await fetch(API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-basehub-api-version': '4',
      'x-basehub-token': TOKEN,
      'x-basehub-ref': 'main',
      'x-basehub-draft': 'true',
    },
    body: JSON.stringify({ query }),
  })
  return res.json()
}

/** Field values shared by create and update ops. */
function fieldsFor(v) {
  return {
    order: { type: 'number', value: v.order },
    tagline: { type: 'text', value: v.tagline },
    alternateName: { type: 'text', value: v.alternateName ?? '' },
    description: {
      type: 'rich-text',
      value: { format: 'markdown', value: v.description },
    },
  }
}

/** Update an existing row when we already have its id, otherwise create a child. */
function instanceOp(collectionId, v, existingId) {
  if (existingId) {
    return { type: 'update', id: existingId, value: fieldsFor(v) }
  }
  return {
    type: 'create',
    parentId: collectionId,
    data: { type: 'instance', title: v.title, slug: v.slug, value: fieldsFor(v) },
  }
}

async function transact(label, data, autoCommit) {
  const args = { data }
  if (autoCommit) args.autoCommit = autoCommit
  const { transaction } = await basehub({ token: TOKEN }).mutation({
    transaction: { __args: args, status: true, message: true, duration: true },
  })
  console.log(`${label}: ${transaction.status}${transaction.message ? ` — ${transaction.message}` : ''}`)
  if (transaction.status !== 'Completed') {
    throw new Error(`${label} did not complete (status ${transaction.status})`)
  }
}

async function main() {
  if (!TOKEN) {
    console.error('✗ No token. Set BASEHUB_ADMIN_TOKEN (write scope) and rerun.')
    process.exit(1)
  }

  // Phase 1 — collection + template (no commit; new collections cannot autoCommit).
  await transact('1/3 collection template', [
    {
      type: 'create',
      data: {
        type: 'collection',
        title: 'Virtues',
        apiName: 'virtues',
        description:
          'The seven classical virtues — each a home for the stories that teach it.',
        idempotency: { key: 'apiName', value: 'virtues' },
        template: [
          { type: 'number', title: 'Order', apiName: 'order' },
          { type: 'text', title: 'Tagline', apiName: 'tagline' },
          { type: 'text', title: 'Alternate Name', apiName: 'alternateName' },
          { type: 'rich-text', title: 'Description', apiName: 'description' },
        ],
      },
    },
  ])

  // Resolve the (possibly just-staged) collection id and any existing rows from
  // the draft tree, so we update rows in place instead of duplicating them.
  const idResult = await draftQuery(
    'query { virtues { _id items { _id _slug } } }',
  )
  const collectionId = idResult?.data?.virtues?._id
  if (!collectionId) {
    throw new Error(`Could not resolve virtues collection id: ${JSON.stringify(idResult?.errors ?? idResult)}`)
  }
  const idBySlug = new Map(
    (idResult?.data?.virtues?.items ?? []).map((i) => [i._slug, i._id]),
  )
  console.log(`    virtues collection id: ${collectionId} (${idBySlug.size} existing rows)`)

  // Phase 2 — upsert instances as children (no commit; stage under the template).
  await transact(
    `2/3 ${VIRTUES.length} virtue instances`,
    VIRTUES.map((v) => instanceOp(collectionId, v, idBySlug.get(v.slug))),
  )

  // Phase 3 — publish the working tree.
  await transact('3/3 commit', [
    { type: 'commit', branchName: 'main', message: 'PRO-19: stand up the seven-virtue canon' },
  ])

  // Verify against the published (non-draft) tree.
  const check = await fetch(API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-basehub-api-version': '4',
      'x-basehub-token': TOKEN,
      'x-basehub-ref': 'main',
    },
    body: JSON.stringify({ query: 'query { virtues { items { _title _slug } } }' }),
  }).then((r) => r.json())
  const items = check?.data?.virtues?.items ?? []
  console.log(`✓ Published ${items.length} virtues: ${items.map((i) => i._slug).join(', ')}`)
  if (items.length !== VIRTUES.length) {
    throw new Error(`Expected ${VIRTUES.length} virtues published, found ${items.length}`)
  }
}

main().catch((err) => {
  console.error('✗ Seed failed:', err.message)
  process.exit(1)
})
