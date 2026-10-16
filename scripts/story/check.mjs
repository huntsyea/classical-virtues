// story:check: ladder step 5, the mechanical gate (production-recipe steps 3-4).
//
//   pnpm story:check <slug>
//
// Passes only when all of these hold for the draft bytes on disk:
//   1. the editor linter (or the built-in subset) reports no errors;
//   2. the publish contract holds (fields, slug, canon resolution, no dashes);
//   3. content/drafts/<slug>.gate.md: header names this draft, the latest round
//      says "publish" and records `Draft sha256:` equal to this draft's sha256,
//      and two locked vault exemplars are named;
//   4. content/drafts/<slug>.seo.md (story:seo): verdict "clear" for this draft.
// The result goes to content/drafts/<slug>/state.json as a convenience for
// story:status. It is never trusted: story:approve and story:publish run these
// same checks again themselves before doing anything.
// Exit 0 pass, 2 gate closed.

import { main, isEntry, log, c, GateError } from './lib/cli.mjs'
import { loadDraft, writeStage, rel } from './lib/draft.mjs'
import { lintDraft, contractChecks, readGateNote, readSeoNote } from './lib/checks.mjs'

/** Run every mechanical check in-process. Returns { pass, draft, gate, seo, problems[] }. */
export async function runCheck(slug, { quiet = false, record = true } = {}) {
  const draft = loadDraft(slug)
  const lint = lintDraft(draft)
  const contract = await contractChecks(draft)
  const gate = readGateNote(draft)
  const seo = readSeoNote(draft)
  const problems = [
    ...lint.errors.map((e) => `lint ${e.rule}: ${e.message}`),
    ...contract.map((e) => `${e.rule}: ${e.message}`),
    ...gate.problems,
    ...seo.problems,
  ]
  const pass = problems.length === 0

  if (!quiet) {
    console.log(c.bold(`\n${draft.fields.title || slug}  ${c.dim(rel(draft.paths.draft))}  ${c.dim(`sha256 ${draft.hash.slice(0, 12)}`)}`))
    const mark = (ok) => (ok ? c.green('pass') : c.red('FAIL'))
    console.log(`  ${mark(lint.ok)}  lint (${lint.tool}): ${lint.errors.length} errors, ${lint.warnings.length} warnings${lint.stats?.words ? `, ${lint.stats.words} words` : ''}`)
    for (const e of lint.errors) console.log(c.red(`        ${e.rule}${e.line ? ` L${e.line}` : ''}: ${e.message}`))
    for (const w of lint.warnings) console.log(c.yellow(`        ${w.rule}${w.line ? ` L${w.line}` : ''}: ${w.message}`))
    console.log(`  ${mark(contract.length === 0)}  publish contract`)
    for (const e of contract) console.log(c.red(`        ${e.rule}: ${e.message}`))
    console.log(`  ${mark(gate.exists && gate.problems.length === 0)}  editor gate note${gate.exists ? ` (round ${gate.round ?? '?'}: ${gate.verdict ?? 'no verdict'}; exemplars: ${gate.exemplarsNamed.join(', ') || 'none'})` : ''}`)
    for (const p of gate.problems) console.log(c.red(`        ${p}`))
    console.log(`  ${mark(seo.exists && seo.problems.length === 0)}  SEO QA note${seo.exists ? ` (${seo.verdict ?? 'no verdict'}${seo.by ? `, by ${seo.by}` : ''})` : ''}`)
    for (const p of seo.problems) console.log(c.red(`        ${p}`))
  }

  if (record) {
    writeStage(slug, 'check', {
      status: pass ? 'pass' : 'fail',
      draftHash: draft.hash,
      gateHash: gate.hash ?? null,
      seoHash: seo.hash ?? null,
      lint: { tool: lint.tool, errors: lint.errors.length, warnings: lint.warnings.length, words: lint.stats?.words ?? null },
      gate: gate.exists ? { round: gate.round, verdict: gate.verdict, exemplars: gate.exemplarsNamed } : null,
      seo: seo.exists ? { verdict: seo.verdict, by: seo.by } : null,
      problems,
    })
  }
  return { pass, draft, gate, seo, problems }
}

/** Throw unless the full check passes right now. Used by approve and publish. */
export async function requireCheck(slug) {
  const result = await runCheck(slug, { quiet: true, record: false })
  if (!result.pass) {
    throw new GateError(`story:check does not pass for the draft on disk:\n  - ${result.problems.join('\n  - ')}\nFix it and rerun \`pnpm story:check ${slug}\`.`)
  }
  return result
}

async function cli({ _ }) {
  const { pass } = await runCheck(_[0])
  if (!pass) throw new GateError('story:check failed. Fix the items above; later stages stay closed until it passes.')
  log.ok(`story:check passed. Next (ladder step 6): pnpm story:image ${_[0]}`)
}

if (isEntry(import.meta.url)) main(cli, { meta: import.meta.url, args: [1, 1], flags: {} })
