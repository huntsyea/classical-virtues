// Resolve a story's free-text `virtue` label to the seven-virtue canon exactly
// the way the site does, without importing TypeScript: canon titles and
// alternate names come from src/data/virtues.json, and the sub-virtue bridge is
// read out of the SUB_VIRTUE_TO_CANON_SLUG declaration wherever it lives under
// src/lib (it has moved before), so a one-line mapping added there is picked
// up here with no second edit.

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { REPO_ROOT } from './cli.mjs'

let cache

export function loadCanon() {
  if (cache) return cache
  const virtues = JSON.parse(readFileSync(join(REPO_ROOT, 'src', 'data', 'virtues.json'), 'utf8'))
  const subVirtues = {}
  const libDir = join(REPO_ROOT, 'src', 'lib')
  for (const file of readdirSync(libDir).filter((f) => f.endsWith('.ts'))) {
    const ts = readFileSync(join(libDir, file), 'utf8')
    const block = ts.match(/SUB_VIRTUE_TO_CANON_SLUG\s*(?::[^=]*)?=\s*\{([\s\S]*?)\}/)
    if (!block) continue
    for (const m of block[1].matchAll(/['"]?([\w-]+)['"]?\s*:\s*['"]([\w-]+)['"]/g)) {
      subVirtues[m[1].toLowerCase()] = m[2]
    }
    break
  }
  cache = { virtues, subVirtues }
  return cache
}

/** Return the canon entry for a label, or undefined when it would be an orphan. */
export function resolveCanon(label) {
  if (!label) return undefined
  const { virtues, subVirtues } = loadCanon()
  const needle = String(label).trim().toLowerCase()
  const direct = virtues.find(
    (v) => v.title.toLowerCase() === needle || (v.alternateName ?? '').toLowerCase() === needle || v.slug === needle,
  )
  if (direct) return direct
  const slug = subVirtues[needle]
  return slug ? virtues.find((v) => v.slug === slug) : undefined
}

export function canonTitles() {
  return loadCanon().virtues.map((v) => v.title)
}
