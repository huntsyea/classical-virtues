// story:new: ladder step 1. Scaffold the brief for a new story (recipe step 1).
//
//   pnpm story:new <slug> [--title "Working Title"]
//
// Creates content/drafts/<slug>/brief.md from the recipe's brief checklist
// (the same shape virtue-story-research fills in). Refuses if the slug is
// already a story in Basehub (live draft tree when a token is set, plus the
// latest backup) or already has a draft, and never
// overwrites an existing brief. It writes no draft: drafting is the writer's
// handoff, triggered by a human.

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { main, isEntry, log, assertSlug, UsageError, REPO_ROOT } from './lib/cli.mjs'
import { gql } from './lib/basehub-publish.mjs'
import { draftPaths, rel } from './lib/draft.mjs'

function titleFromSlug(slug) {
  const small = new Set(['and', 'the', 'of', 'a', 'an', 'in', 'on', 'to', 'for'])
  return slug
    .split('-')
    .map((w, i) => (i > 0 && small.has(w) ? w : w[0].toUpperCase() + w.slice(1)))
    .join(' ')
}

export function briefTemplate(slug, title) {
  const today = new Date().toISOString().slice(0, 10)
  return `# Brief: ${title}

- Working title: ${title}
- Slug: ${slug} (checked against backups/basehub/latest.json and content/drafts/ on ${today})
- Source:
- Edition read:
- Public-domain basis:
- Source note for the page: ""
- Departures and uncertainty (verify or cut):
- Canonical virtue (one of Prudence, Justice, Fortitude, Temperance, Faith, Hope, Charity):
- Sub-virtue angle (optional; must resolve via SUB_VIRTUE_TO_CANON_SLUG or a canon alternate name):
- Why this mapping:
- Decisive choice:
- Telling details in the source:
- Attested lines (no invented quotations):
- Reader fit:
- Target length: 350-650 words
- Fields:
  - summary angle (120 to 160 characters):
  - virtueDescription angle:
  - source:
  - imageAlt scene:
  - imagePrompt scene:
  - audio: planned
- SEO guidance (metadata, summary, slug, alt text, internal links only; never the body):
- Internal-link ideas:
`
}

async function cli({ _, flags }) {
  const slug = assertSlug(_[0])
  const paths = draftPaths(slug)
  const token = process.env.BASEHUB_TOKEN || process.env.BASEHUB_ADMIN_TOKEN
  if (token && !process.env.STORY_OFFLINE) {
    const live = await gql('query { stories { items { _slug _title } } }', { token, draft: true })
    const hit = live.stories.items.find((s) => s._slug === slug)
    if (hit) throw new UsageError(`"${slug}" is already a story in Basehub ("${hit._title}"). Pick another slug.`)
  }

  const backup = join(REPO_ROOT, 'backups', 'basehub', 'latest.json')
  if (existsSync(backup)) {
    const published = JSON.parse(readFileSync(backup, 'utf8')).stories.map((s) => s._slug)
    if (published.includes(slug)) throw new UsageError(`"${slug}" is already published (backups/basehub/latest.json). Pick another slug.`)
  }
  if (existsSync(paths.draft)) throw new UsageError(`${rel(paths.draft)} already exists; this story is past the brief stage.`)
  if (existsSync(paths.brief)) {
    log.ok(`Brief already exists: ${rel(paths.brief)} (left untouched).`)
    return
  }

  mkdirSync(paths.dir, { recursive: true })
  writeFileSync(paths.brief, briefTemplate(slug, flags.title || titleFromSlug(slug)))
  log.ok(`Brief scaffolded: ${rel(paths.brief)}`)
  log.info('Next: fill the brief with the virtue-story-research skill (ladder step 1), then draft with virtue-story-writer (step 2).')
}

if (isEntry(import.meta.url)) main(cli, { meta: import.meta.url, args: [1, 1], flags: { title: 'string' } })
