// Seed the seven-virtue canon into Basehub (PRO-19).
//
// Stands up a `virtues` collection with a component template and one instance
// per classical virtue (4 cardinal + 3 theological). Idempotent: the collection
// is keyed on apiName and each row on slug, so re-running updates in place
// rather than duplicating.
//
// The canon itself lives in src/data/virtues.json — the single source of truth
// shared with the website (src/lib/virtues.ts), so there is no drift.
//
// Usage:
//   BASEHUB_TOKEN must have WRITE scope (an Admin Token). The read token used by
//   the site at runtime is NOT sufficient. Provide the admin token via the
//   BASEHUB_ADMIN_TOKEN env var (preferred) or BASEHUB_TOKEN:
//
//     BASEHUB_ADMIN_TOKEN=bsh_xxx node --env-file=.env.local scripts/seed-virtues.mjs
//
// On success it auto-commits to the Basehub repo and the site's read token will
// then see the `virtues` collection (run `pnpm basehub` to regenerate types).

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { basehub } from 'basehub'

const __dirname = dirname(fileURLToPath(import.meta.url))
const VIRTUES = JSON.parse(
  readFileSync(join(__dirname, '..', 'src', 'data', 'virtues.json'), 'utf8'),
)

function rowFor(v) {
  return {
    type: 'instance',
    title: v.title,
    slug: v.slug,
    idempotency: { key: 'slug', value: v.slug },
    value: {
      order: { type: 'number', value: v.order },
      tagline: { type: 'text', value: v.tagline },
      alternateName: { type: 'text', value: v.alternateName ?? '' },
      description: {
        type: 'rich-text',
        value: { format: 'markdown', value: v.description },
      },
    },
  }
}

const transaction = [
  {
    type: 'collection',
    title: 'Virtues',
    apiName: 'virtues',
    description: 'The seven classical virtues — each a home for the stories that teach it.',
    idempotency: { key: 'apiName', value: 'virtues' },
    template: [
      { type: 'number', title: 'Order', apiName: 'order' },
      { type: 'text', title: 'Tagline', apiName: 'tagline' },
      { type: 'text', title: 'Alternate Name', apiName: 'alternateName' },
      { type: 'rich-text', title: 'Description', apiName: 'description' },
    ],
    rows: VIRTUES.map(rowFor),
  },
]

async function main() {
  const token = process.env.BASEHUB_ADMIN_TOKEN || process.env.BASEHUB_TOKEN
  if (!token) {
    console.error('✗ No token. Set BASEHUB_ADMIN_TOKEN (write scope) and rerun.')
    process.exit(1)
  }

  console.log(`Seeding ${VIRTUES.length} virtues into Basehub…`)
  const { transaction: result } = await basehub({ token }).mutation({
    transaction: {
      __args: {
        autoCommit: 'PRO-19: stand up the seven-virtue canon',
        data: transaction,
      },
      status: true,
      message: true,
      duration: true,
    },
  })

  console.log(`Status: ${result.status} (${result.duration ?? '?'}ms)`)
  if (result.message) console.log(`Message: ${result.message}`)
  if (result.status !== 'Completed') process.exit(1)
  console.log('✓ Done. Run `pnpm basehub` to regenerate types, then switch the')
  console.log('  read path in src/lib/virtues.ts to prefer Basehub if desired.')
}

main().catch((err) => {
  console.error('✗ Transaction failed:', err.message)
  process.exit(1)
})
