// story:status: where each story stands on the ladder, and the one next step.
//
//   pnpm story:status            every story with a brief or a draft
//   pnpm story:status <slug>     one story
//
// Read-only. Every stage is recomputed from the files on disk (brief, draft,
// gate note, SEO note, image, MP3, approval hashes); state.json only supplies
// what cannot be recomputed (publish and verify results). It never runs a
// stage: each handoff stays a deliberate command.
//
// The ladder (same numbers in every script header, content/pipeline.md, and
// the virtue-story-pipeline skill):
//    1 brief       pnpm story:new <slug>, then the virtue-story-research skill
//    2 draft       the virtue-story-writer skill
//    3 editor gate the virtue-story-editor skill (a separate reviewer), then the
//                  editor of record's own sign-off line
//    4 SEO QA      pnpm story:seo <slug> --record, then the owner's sign-off line
//    5 check       pnpm story:check <slug>
//    6 image       pnpm story:image <slug>
//    7 audio       pnpm story:audio <slug>
//    8 approval    a person runs pnpm story:approve <slug> --by "<name>"
//    9 publish     pnpm story:publish <slug> (dry run, --assets --yes, --yes), then a
//                  person commits in the Basehub dashboard
//   10 revalidate  pnpm story:revalidate --base-url https://www.classicalvirtues.com --yes
//   11 verify      pnpm story:verify <slug> --base-url https://www.classicalvirtues.com --yes

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { main, isEntry, c, assertSlug } from './lib/cli.mjs'
import { DRAFTS_DIR, draftPaths, loadDraft, readState } from './lib/draft.mjs'
import { lintDraft, contractChecks, readGateNote, readSeoNote } from './lib/checks.mjs'
import { imageArtifact, audioArtifact, approvalProblems } from './lib/artifacts.mjs'

function briefFilled(path) {
  const text = readFileSync(path, 'utf8')
  const value = (label) => text.match(new RegExp(`^-[ \\t]*${label}[^:\\n]*:[ \\t]*(.*)$`, 'im'))?.[1]?.trim() ?? ''
  return Boolean(value('Source') && value('Canonical virtue'))
}

async function stagesFor(slug) {
  const paths = draftPaths(slug)
  const rows = []
  const row = (n, name, ok, detail, next) => rows.push({ n, name, ok, detail, next })

  const hasBrief = existsSync(paths.brief)
  const filled = hasBrief && briefFilled(paths.brief)
  row(1, 'brief', filled, hasBrief ? (filled ? 'filled' : 'scaffolded, not filled') : 'none', hasBrief ? 'fill the brief with the virtue-story-research skill' : `pnpm story:new ${slug}`)
  if (!existsSync(paths.draft)) {
    row(2, 'draft', false, 'no draft yet', 'draft it with the virtue-story-writer skill')
    return { rows }
  }
  const draft = loadDraft(slug)
  const lint = lintDraft(draft)
  const contract = await contractChecks(draft)
  row(2, 'draft', lint.ok && contract.length === 0, `${lint.stats?.words ?? '?'} words, ${lint.errors.length + contract.length} errors`, 'revise with the virtue-story-writer skill until the linter is clean')
  const gate = readGateNote(draft)
  const gateNext = gate.next === 'sign-off'
    ? `ask the editor of record to read round ${gate.round} and add their own \`- Sign-off: <name>, <YYYY-MM-DD>\` line to it`
    : 'review with the virtue-story-editor skill in a separate thread'
  row(3, 'editor gate', gate.exists && gate.problems.length === 0, gate.exists ? `round ${gate.round ?? '?'}: ${gate.verdict ?? '?'}${gate.problems.length ? ` (${gate.problems[0]})` : ''}` : 'no gate note', gateNext)
  const seo = readSeoNote(draft)
  const seoNext = seo.next === 'sign-off'
    ? `ask the SEO owner (${seo.owner ?? 'the user'}) to read content/drafts/${slug}.seo.md and fill in \`- Owner sign-off: <name>, <YYYY-MM-DD>\``
    : `pnpm story:seo ${slug} --record`
  row(4, 'SEO QA', seo.exists && seo.problems.length === 0, seo.exists ? `${seo.verdict}${seo.signOff ? `, signed off by ${seo.signOff.name}` : ''}${seo.problems.length ? ` (${seo.problems[0]})` : ''}` : 'no SEO note', seoNext)
  const checkOk = rows.every((r) => r.ok)
  row(5, 'check', checkOk, checkOk ? 'all mechanical gates pass' : 'blocked by the steps above', `pnpm story:check ${slug}`)
  const image = await imageArtifact(draft)
  row(6, 'image', image.problems.length === 0, image.problems[0] ?? `${image.file.split('/').pop()} ${image.sha256.slice(0, 12)}`, `pnpm story:image ${slug}`)
  const audio = await audioArtifact(draft)
  row(7, 'audio', audio.problems.length === 0, audio.problems[0] ?? (audio.expectation === 'none' ? 'none by design' : `${audio.record?.durationISO ?? ''} ${audio.sha256?.slice(0, 12) ?? audio.url ?? ''}`), `pnpm story:audio ${slug}`)
  const approval = gate.hash && seo.hash ? approvalProblems(draft, { gate, seo }, image, audio) : { problems: ['needs the gate and SEO notes first'] }
  row(8, 'approval', approval.problems.length === 0, approval.problems[0] ?? `by ${approval.approval.by}`, `a person reviews, then runs in their own terminal: pnpm story:approve ${slug} --by "<their name>"`)
  const publish = readState(slug).stages.publish
  const pubFresh = publish?.draftHash === draft.hash
  const pubLabel = !publish ? 'not started' : publish.status === 'assets' ? 'assets uploaded, story not staged' : publish.status === 'staged' ? (pubFresh ? 'staged in Basehub, NOT live until committed' : 'staged from an older draft') : publish.status === 'published' ? (pubFresh ? 'committed' : 'committed from an older draft') : publish.status
  const verify = readState(slug).stages.verify
  const liveVerified = verify?.status === 'pass' && !verify.local && verify.draftHash === draft.hash
  const published = (publish?.status === 'published' && pubFresh) || liveVerified
  const pubNext = !publish || publish.status === 'assets' || !pubFresh
    ? `pnpm story:publish ${slug}   (dry run; then --assets --yes; then --yes)`
    : 'a person commits it in the Basehub dashboard Changes tab, then runs steps 10 and 11'
  row(9, 'publish', published, published ? (liveVerified ? 'live (confirmed by story:verify)' : 'committed') : pubLabel, pubNext)
  row(10, 'revalidate', liveVerified, liveVerified ? 'done (the live page shows the new content)' : 'once, after the commit', 'pnpm story:revalidate --base-url https://www.classicalvirtues.com --yes')
  row(11, 'verify', liveVerified, verify ? `${verify.status} at ${verify.url}${verify.local ? ' (local only)' : ''}` : 'not run', `pnpm story:verify ${slug} --base-url https://www.classicalvirtues.com --yes`)
  return { rows }
}

async function describe(slug) {
  const { rows } = await stagesFor(slug)
  console.log(c.bold(`\n${slug}`))
  let next = null
  for (const r of rows) {
    console.log(`  ${String(r.n).padStart(2)} ${r.name.padEnd(11)} ${r.ok ? c.green('done') : c.dim('open')}  ${c.dim(r.detail)}`)
    if (!r.ok && !next) next = r
  }
  console.log(next ? `  ${c.bold('next')}  ${next.next}` : `  ${c.bold('next')}  nothing: the story is live and verified`)
}

async function cli({ _ }) {
  if (_[0]) return describe(assertSlug(_[0]))
  const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
  if (!existsSync(DRAFTS_DIR)) return console.log('No stories in progress. Start one with: pnpm story:new <slug>')
  const slugs = new Set()
  for (const f of readdirSync(DRAFTS_DIR, { withFileTypes: true })) {
    const name = f.isFile() && /^[^.]+\.md$/.test(f.name) ? f.name.slice(0, -3) : f.isDirectory() && existsSync(join(DRAFTS_DIR, f.name, 'brief.md')) ? f.name : null
    if (!name) continue
    if (!SLUG_RE.test(name)) {
      console.log(c.yellow(`! skipping "${f.name}": not a valid story slug`))
      continue
    }
    slugs.add(name)
  }
  if (!slugs.size) console.log('No stories in progress. Start one with: pnpm story:new <slug>')
  for (const slug of [...slugs].sort()) await describe(slug)
}

if (isEntry(import.meta.url)) main(cli, { meta: import.meta.url, args: [0, 1], flags: {} })
