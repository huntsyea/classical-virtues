// Back up ALL Basehub content — the company's only real asset (PRO-94).
//
// Exports every story and every virtue, with their full field set (rich text in
// markdown / html / plainText / json, image metadata, audio, and _sys
// timestamps), to a single self-describing JSON file. The export is a plain,
// human-readable snapshot: restoring is "read the JSON and re-seed", no
// proprietary format, no partial fidelity.
//
// Output (relative to repo root):
//   backups/basehub/basehub-backup-<UTC-ISO>.json   — the timestamped snapshot
//   backups/basehub/latest.json                     — copy of the newest snapshot
//   backups/basehub/MANIFEST.md                     — human index of all snapshots
//
// The weekly GitHub Actions workflow (.github/workflows/basehub-backup.yml)
// runs this and commits the result, so the repo itself is the durable,
// versioned backup store (every snapshot is also uploaded as a workflow
// artifact for off-repo retention).
//
// Usage:
//   BASEHUB_TOKEN=bshb_xxx node --env-file=.env.local scripts/backup-basehub.mjs
//
// A read token is sufficient (this only queries published content on `main`).
// Exit codes: 0 on a verified backup, non-zero on any fetch/validation failure
// so CI fails loudly rather than committing an empty or partial snapshot.

import { mkdirSync, writeFileSync, readdirSync, copyFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..')
const OUT_DIR = join(REPO_ROOT, 'backups', 'basehub')

const TOKEN = process.env.BASEHUB_TOKEN || process.env.BASEHUB_ADMIN_TOKEN
const API = 'https://api.basehub.com/graphql'

// Minimum content we expect to find. A backup that captures fewer stories than
// this is treated as a failure (likely a token/permission/API regression)
// rather than silently overwriting a good snapshot with a thin one.
const MIN_STORIES = Number(process.env.BASEHUB_BACKUP_MIN_STORIES ?? 8)
const MIN_VIRTUES = Number(process.env.BASEHUB_BACKUP_MIN_VIRTUES ?? 7)

// Full field selection — everything Basehub exposes for these collections, so a
// restore loses nothing. Kept as a raw GraphQL string (no codegen dependency)
// so the backup keeps working even if the generated client drifts.
const QUERY = `query BackupAllContent {
  stories {
    _meta { totalCount }
    items {
      _id _slug _title _idPath _slugPath
      _sys { id createdAt lastModifiedAt hash slug title }
      virtue
      summary
      virtueDescription
      audioUrl
      image {
        url alt aspectRatio width height fileName fileSize mimeType
        blurDataURL thumbhash lastModified
      }
      content { markdown html plainText readingTime }
    }
  }
  virtues {
    _meta { totalCount }
    items {
      _id _slug _title _idPath _slugPath
      _sys { id createdAt lastModifiedAt hash slug title }
      order
      tagline
      alternateName
      description { markdown html plainText }
    }
  }
}`

async function fetchAllContent() {
  const res = await fetch(API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-basehub-api-version': '4',
      'x-basehub-token': TOKEN,
      'x-basehub-ref': 'main',
    },
    body: JSON.stringify({ query: QUERY }),
  })
  if (!res.ok) {
    throw new Error(`Basehub API returned HTTP ${res.status} ${res.statusText}`)
  }
  const body = await res.json()
  if (body.errors) {
    throw new Error(`Basehub GraphQL errors: ${JSON.stringify(body.errors)}`)
  }
  if (!body.data) {
    throw new Error('Basehub response had no data')
  }
  return body.data
}

// A stable, deterministic timestamp for the filename. We intentionally do NOT
// embed the exact minute/second so re-running within the same day overwrites
// the same file (one snapshot per day max); the commit history preserves prior
// days. Callers wanting a precise stamp can read `generatedAt` inside the file.
function utcDateStamp(now) {
  return now.toISOString().slice(0, 10) // YYYY-MM-DD
}

function main() {
  if (!TOKEN) {
    console.error('✗ No BASEHUB_TOKEN (or BASEHUB_ADMIN_TOKEN). Set it and rerun.')
    process.exit(1)
  }

  return fetchAllContent().then((data) => {
    const stories = data.stories?.items ?? []
    const virtues = data.virtues?.items ?? []

    if (stories.length < MIN_STORIES) {
      throw new Error(
        `Refusing to write backup: got ${stories.length} stories, expected >= ${MIN_STORIES}.`,
      )
    }
    if (virtues.length < MIN_VIRTUES) {
      throw new Error(
        `Refusing to write backup: got ${virtues.length} virtues, expected >= ${MIN_VIRTUES}.`,
      )
    }

    const now = new Date()
    const snapshot = {
      $schema: 'classical-virtues/basehub-backup@1',
      source: 'basehub:main',
      generatedAt: now.toISOString(),
      counts: {
        stories: stories.length,
        virtues: virtues.length,
      },
      // Keep the reported totalCount alongside the fetched length so a future
      // reader can spot silent pagination truncation.
      reportedTotals: {
        stories: data.stories?._meta?.totalCount ?? null,
        virtues: data.virtues?._meta?.totalCount ?? null,
      },
      stories,
      virtues,
    }

    mkdirSync(OUT_DIR, { recursive: true })
    const fileName = `basehub-backup-${utcDateStamp(now)}.json`
    const filePath = join(OUT_DIR, fileName)
    const json = JSON.stringify(snapshot, null, 2)
    writeFileSync(filePath, json + '\n', 'utf8')
    copyFileSync(filePath, join(OUT_DIR, 'latest.json'))

    // Rebuild a small human-readable manifest of every snapshot on disk.
    const snapshots = readdirSync(OUT_DIR)
      .filter((f) => /^basehub-backup-\d{4}-\d{2}-\d{2}\.json$/.test(f))
      .sort()
      .reverse()
    const manifest = [
      '# Basehub content backups',
      '',
      'Automated weekly snapshots of all Basehub content (stories + virtues).',
      'Produced by `scripts/backup-basehub.mjs` via the `basehub-backup` workflow.',
      'Each file is a complete, restorable JSON snapshot; `latest.json` mirrors the newest.',
      '',
      '| Snapshot | Stories | Virtues |',
      '| --- | --- | --- |',
      `| **latest.json** (→ ${fileName}) | ${stories.length} | ${virtues.length} |`,
      ...snapshots.map((f) => `| ${f} | | |`),
      '',
      `_Last updated: ${now.toISOString()}_`,
      '',
    ].join('\n')
    writeFileSync(join(OUT_DIR, 'MANIFEST.md'), manifest, 'utf8')

    console.log(`✓ Backup written: backups/basehub/${fileName}`)
    console.log(`  stories: ${stories.length}  virtues: ${virtues.length}`)
    console.log(`  slugs: ${stories.map((s) => s._slug).join(', ')}`)
    console.log(`  bytes: ${json.length}`)
  })
}

main().catch((err) => {
  console.error('✗ Backup failed:', err.message)
  process.exit(1)
})
