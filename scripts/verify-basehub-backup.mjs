// Verify a Basehub backup snapshot is complete and restorable (PRO-94).
//
// Reads backups/basehub/latest.json (or a path passed as argv[2]) and asserts
// that every story and virtue can be fully reconstructed — i.e. the fields the
// site needs (src/lib/stories.ts / src/lib/virtues.ts) are all present and
// non-empty. This is the "demonstrably restorable" gate: if it passes, a human
// or a re-seed script has everything it needs to rebuild the CMS from the file
// alone.
//
// Usage:
//   node scripts/verify-basehub-backup.mjs [path-to-snapshot.json]
// Exit 0 = restorable, non-zero = missing/partial content.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const target =
  process.argv[2] || join(__dirname, '..', 'backups', 'basehub', 'latest.json')

const MIN_STORIES = Number(process.env.BASEHUB_BACKUP_MIN_STORIES ?? 8)
const MIN_VIRTUES = Number(process.env.BASEHUB_BACKUP_MIN_VIRTUES ?? 7)

// Fields required to rebuild a StoryData record (see src/lib/stories.ts).
const STORY_REQUIRED = ['_id', '_slug', '_title', 'virtue', 'summary', 'virtueDescription']
const VIRTUE_REQUIRED = ['_id', '_slug', '_title', 'tagline']

function fail(msg) {
  console.error(`✗ ${msg}`)
  process.exit(1)
}

const snap = JSON.parse(readFileSync(target, 'utf8'))
const stories = snap.stories ?? []
const virtues = snap.virtues ?? []

console.log(`Verifying ${target}`)
console.log(`  schema: ${snap.$schema}  generatedAt: ${snap.generatedAt}`)

if (stories.length < MIN_STORIES) fail(`only ${stories.length} stories (expected >= ${MIN_STORIES})`)
if (virtues.length < MIN_VIRTUES) fail(`only ${virtues.length} virtues (expected >= ${MIN_VIRTUES})`)

const slugs = new Set()
for (const s of stories) {
  for (const f of STORY_REQUIRED) {
    if (!s[f]) fail(`story "${s._slug ?? s._id ?? '?'}" missing field ${f}`)
  }
  if (!s.image?.url) fail(`story "${s._slug}" missing image.url`)
  if (!s.content?.markdown) fail(`story "${s._slug}" missing content.markdown`)
  if (!s.content?.plainText) fail(`story "${s._slug}" missing content.plainText`)
  if (slugs.has(s._slug)) fail(`duplicate story slug ${s._slug}`)
  slugs.add(s._slug)
}

for (const v of virtues) {
  for (const f of VIRTUE_REQUIRED) {
    if (!v[f]) fail(`virtue "${v._slug ?? v._id ?? '?'}" missing field ${f}`)
  }
  if (v.order == null) fail(`virtue "${v._slug}" missing order`)
  if (!v.description?.markdown) fail(`virtue "${v._slug}" missing description.markdown`)
}

console.log(`✓ Restorable: ${stories.length} stories, ${virtues.length} virtues — all required fields present.`)
console.log(`  stories: ${[...slugs].join(', ')}`)
