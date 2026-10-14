#!/usr/bin/env node
// Count stories per canon virtue hub: the live catalog snapshot plus drafts.
// Resolves labels the way the site does: canon title or alternateName from
// src/data/virtues.json, then SUB_VIRTUE_TO_CANON_SLUG declared in src/lib/*.ts.
// Usage (from the repo root): node .claude/skills/virtue-story-research/hub-counts.mjs

import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const virtues = JSON.parse(fs.readFileSync(path.join(root, 'src/data/virtues.json'), 'utf8'))
const label = new Map()
for (const v of virtues) {
  label.set(v.title.toLowerCase(), v.slug)
  if (v.alternateName) label.set(v.alternateName.toLowerCase(), v.slug)
}
const lib = path.join(root, 'src/lib')
for (const f of fs.readdirSync(lib).filter((n) => n.endsWith('.ts'))) {
  const m = fs.readFileSync(path.join(lib, f), 'utf8').match(/SUB_VIRTUE_TO_CANON_SLUG[^=]*=\s*\{([\s\S]*?)\}/)
  if (m) for (const e of m[1].matchAll(/['"]?([a-z][a-z -]*)['"]?\s*:\s*['"]([a-z]+)['"]/g)) label.set(e[1].trim(), e[2])
}

const rows = new Map(virtues.map((v) => [v.slug, []]))
const orphans = []
const place = (slug, virtue, where) => {
  const canon = label.get(String(virtue).trim().toLowerCase())
  if (canon && rows.has(canon)) rows.get(canon).push(`${slug}${where}`)
  else orphans.push(`${slug}${where} (${virtue})`)
}

const snap = path.join(root, 'backups/basehub/latest.json')
if (fs.existsSync(snap)) {
  const seen = new Set()
  ;(function walk(x) {
    if (Array.isArray(x)) return x.forEach(walk)
    if (x && typeof x === 'object') {
      if (x._slug && 'virtue' in x && !seen.has(x._slug)) { seen.add(x._slug); place(x._slug, x.virtue, '') }
      Object.values(x).forEach(walk)
    }
  })(JSON.parse(fs.readFileSync(snap, 'utf8')))
}

const drafts = path.join(root, 'content/drafts')
const walkDrafts = (dir, depth) => {
  if (!fs.existsSync(dir) || depth > 2) return
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walkDrafts(p, depth + 1)
    else if (/^[a-z0-9-]+\.md$/.test(e.name) && e.name !== 'brief.md') {
      const fm = fs.readFileSync(p, 'utf8').match(/^---\n([\s\S]*?)\n---/)
      const cv = fm?.[1].match(/^canonicalVirtue:\s*"?([^"\n]+)"?/m)?.[1]
      if (cv) place(path.basename(e.name, '.md'), cv, ' [draft]')
    }
  }
}
walkDrafts(drafts, 0)

console.log('Hub         count  stories')
for (const v of [...virtues].sort((a, b) => a.order - b.order)) {
  const list = rows.get(v.slug)
  console.log(`${v.title.padEnd(11)} ${String(list.length).padStart(5)}  ${list.join(', ') || '(empty)'}`)
}
if (orphans.length) console.log(`\nOrphans (resolve to no hub): ${orphans.join(', ')}`)
