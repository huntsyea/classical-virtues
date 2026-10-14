#!/usr/bin/env node
// Runs lint-story.mjs over every fixture in expected.json and checks the outcome.
// Usage: node .claude/skills/virtue-story-editor/scripts/test/run-tests.mjs
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const LINT = path.join(HERE, '..', 'lint-story.mjs')
const expected = JSON.parse(fs.readFileSync(path.join(HERE, 'expected.json'), 'utf8'))
let failed = 0
for (const [rel, want] of Object.entries(expected)) {
  if (rel.startsWith('_')) continue
  const file = path.join(HERE, rel)
  const args = (want.args ?? ['--no-habits']).map((a) => (a.startsWith('fixtures/') ? path.join(HERE, a) : a))
  let out
  try { out = execFileSync('node', [LINT, '--json', ...args, file], { encoding: 'utf8' }) } catch (e) { out = e.stdout }
  const r = JSON.parse(out).files[0]
  const rules = new Set(r.errors.map((e) => e.rule))
  const warned = new Set(r.warnings.map((e) => e.rule))
  const problems = []
  if (r.ok !== want.ok) problems.push(`ok=${r.ok}, expected ${want.ok}${r.ok ? '' : ` (errors: ${[...rules].join(', ')})`}`)
  for (const rule of want.errors ?? []) if (!rules.has(rule)) problems.push(`missing error ${rule}`)
  for (const rule of want.warnings ?? []) if (!warned.has(rule)) problems.push(`missing warning ${rule}`)
  for (const rule of want.absent ?? []) if (warned.has(rule) || rules.has(rule)) problems.push(`${rule} fired but must not`)
  console.log(`${problems.length ? 'FAIL' : 'ok  '} ${rel}${problems.length ? `\n     ${problems.join('\n     ')}` : ''}`)
  if (problems.length) failed++
}
console.log(failed ? `\n${failed} fixture(s) failed` : '\nall fixtures behave as expected')
process.exit(failed ? 1 : 0)
