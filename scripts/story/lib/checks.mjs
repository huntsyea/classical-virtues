// Mechanical checks behind `story:check`.
//
// 1. The editor skill's linter (.claude/skills/virtue-story-editor/scripts/
//    lint-story.mjs) is the authority on prose craft when it exists;
//    `builtinLint` stands in when it does not (or when STORY_LINTER=builtin).
// 2. `contractChecks` always runs and does not depend on the linter. It
//    checks what publishing and the page depend on, the way the site renders
//    it: required fields, slug (matches the file, not a reserved route), canon
//    resolution, dashes in every reader-facing field and the body after
//    decoding character references (so `&#x02014;` counts, as it renders as
//    an em dash), the body's structure parsed with the site's own markdown
//    stack (paragraphs and emphasis only: no heading of any style, link of
//    any kind, footnote, list, quote, rule, image or HTML), SEO scaffolding,
//    and related-reading invitations or other catalog titles in the body.
// 3. `readGateNote` parses content/drafts/<slug>.gate.md. Rounds are found in
//    any heading style (#..######, **bold**, setext, Roman numerals); the
//    highest round number is current. It fails closed on anything ambiguous:
//    a heading with two verdicts, a heading and Verdict line that disagree, a
//    duplicate round, a round without a readable verdict, or any other heading
//    that says kill or revise (an override section). The current round must be
//    publish, record `Draft sha256:` equal to the draft's sha256, and carry a
//    person's `Sign-off: <name>, <YYYY-MM-DD>` (not an agent's name, not in
//    the future, not before the round's own date).
// 4. `readSeoNote` parses content/drafts/<slug>.seo.md (story:seo --record):
//    clear for the current draft, who ran it, and the owner's sign-off with
//    the same rules.
// These stop honest mistakes and agent drift. A person editing hashes or
// notes on their own disk is outside the threat model (content/pipeline.md).

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join, basename } from 'node:path'
import { REPO_ROOT } from './cli.mjs'
import { EXEMPLARS_DIR, sha256 } from './draft.mjs'
import { resolveCanon, canonTitles } from './canon.mjs'
import { parseBody, decodeReferences } from './markdown.mjs'
import { allowedAssetHost } from './basehub-publish.mjs'

export const LINTER = join(REPO_ROOT, '.claude', 'skills', 'virtue-story-editor', 'scripts', 'lint-story.mjs')
export const REQUIRED_FIELDS = ['title', 'slug', 'virtue', 'canonicalVirtue', 'summary', 'virtueDescription', 'source', 'imageAlt', 'imagePrompt', 'audio']

// Dash glyphs, after character references are decoded: figure dash, en, em,
// horizontal bar, minus sign, two- and three-em dash, vertical and small em
// dashes, small and fullwidth hyphen-minus; plus a spaced or joined double hyphen.
const DASH_GLYPHS = /[‒-―−⸺⸻︱︲﹘﹣－]|\s--\s|\w--\w/
export const hasDash = (text) => DASH_GLYPHS.test(decodeReferences(text))

const SCAFFOLDING = /what is the moral|story for kids|frequently asked|^\s*moral\s*:/im
const INVITATION = /\bif you (liked|enjoyed|loved)\b|\b(you|readers) (might|may|should|will) also\b|\breaders who (liked|enjoyed|loved)\b|\bnext story\b|\brelated (reading|stories)\b/i

/** Run the editor linter if present, else the built-in subset. Returns { tool, ok, errors, warnings, stats }. */
export function lintDraft(draft) {
  // STORY_LINTER=builtin pins the built-in subset (the self-test uses it so a
  // change to the editor's linter cannot make the pipeline's gate tests flaky).
  if (existsSync(LINTER) && process.env.STORY_LINTER !== 'builtin') {
    const r = spawnSync(process.execPath, [LINTER, '--json', '--repo', REPO_ROOT, draft.paths.draft], { encoding: 'utf8' })
    if (r.status === 2 || !r.stdout.trim().startsWith('{')) {
      return { tool: 'lint-story.mjs', ok: false, errors: [{ rule: 'unreadable', message: (r.stderr || r.stdout).trim() }], warnings: [], stats: {} }
    }
    const file = JSON.parse(r.stdout).files[0]
    return { tool: 'lint-story.mjs', ok: file.ok, errors: file.errors, warnings: file.warnings, stats: file.stats }
  }
  return { tool: 'built-in (lint-story.mjs not used)', ...builtinLint(draft) }
}

/** Fallback prose checks; the structural rules live in contractChecks. */
export function builtinLint(draft) {
  const warnings = []
  const words = (draft.body.match(/[\p{L}\p{N}'’-]+/gu) ?? []).length
  if (words < 350 || words > 650) warnings.push({ rule: 'length', message: `Body is ${words} words; writing.md asks for 350-650 unless the brief justifies it.` })
  return { ok: true, errors: [], warnings, stats: { words } }
}

/** Route directories under src/app/stories that would shadow a story slug. */
export function reservedSlugs() {
  const dir = join(REPO_ROOT, 'src', 'app', 'stories')
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory() && !e.name.startsWith('[') && !e.name.startsWith('(')).map((e) => e.name)
}

/** Titles of other stories in the catalog (latest backup), for related-reading detection. */
function catalogTitles(ownTitle) {
  const file = join(REPO_ROOT, 'backups', 'basehub', 'latest.json')
  if (!existsSync(file)) return []
  return JSON.parse(readFileSync(file, 'utf8')).stories.map((s) => s._title).filter((t) => t && t !== ownTitle && t.split(/\s+/).length >= 2)
}

/** Contract checks the publish step depends on. Returns [{ rule, message }] errors. */
export async function contractChecks(draft) {
  const errors = []
  const f = draft.fields
  const add = (rule, message) => errors.push({ rule, message })
  if (!draft.hasFrontmatter) add('frontmatter', 'Draft has no frontmatter block.')
  for (const key of REQUIRED_FIELDS) {
    if (typeof f[key] !== 'string' || f[key] === '') add('field', `Missing or empty \`${key}\`.`)
  }
  if (f.slug && f.slug !== draft.slug) add('slug', `slug "${f.slug}" does not match the file name "${draft.slug}".`)
  if (reservedSlugs().includes(draft.slug)) add('slug', `"${draft.slug}" is a fixed route under src/app/stories/ and would shadow the story.`)

  const canon = resolveCanon(f.virtue)
  if (f.virtue && !canon) add('canon', `virtue "${f.virtue}" resolves to no canon page (orphan). Use a canon title or add it to SUB_VIRTUE_TO_CANON_SLUG.`)
  if (f.canonicalVirtue && !canonTitles().includes(f.canonicalVirtue)) add('canon', `canonicalVirtue "${f.canonicalVirtue}" is not one of ${canonTitles().join(', ')}.`)
  if (canon && f.canonicalVirtue && canon.title !== f.canonicalVirtue) add('canon', `virtue "${f.virtue}" resolves to ${canon.title} on the site, but canonicalVirtue says ${f.canonicalVirtue}.`)
  if (f.subVirtue && resolveCanon(f.subVirtue)?.title !== f.canonicalVirtue) add('canon', `subVirtue "${f.subVirtue}" does not resolve to ${f.canonicalVirtue}.`)

  // Optional standfirst (falls back to the summary on the page): 80-160 characters when present.
  if (typeof f.dek === 'string' && f.dek !== '') {
    const n = f.dek.replace(/\s+/g, ' ').trim().length
    if (n < 80 || n > 160) add('dek', `dek is ${n} characters; it must be 80-160 (or empty to use the summary).`)
  } else if (f.dek !== undefined && typeof f.dek !== 'string') add('dek', 'dek must be a single-line string.')
  for (const key of ['title', 'summary', 'dek', 'virtueDescription', 'imageAlt', 'source', 'subVirtue', 'virtue']) {
    if (hasDash(f[key])) add('dash', `\`${key}\` contains a dash (glyph, character reference, or spaced "--").`)
  }
  if (hasDash(draft.body)) add('dash', 'Body contains a dash (glyph, character reference, or spaced "--").')

  const body = await parseBody(draft.body)
  for (const node of body.disallowed) add('body-structure', `Body contains a ${node.label}${node.line ? ` (line ${node.line})` : ''}; the body is narrative paragraphs only.`)
  if (SCAFFOLDING.test(body.text)) add('seo-scaffolding', 'Body contains SEO scaffolding (moral heading, "story for kids", FAQ).')
  if (INVITATION.test(body.text)) add('related-reading', 'Body contains a related-reading invitation; the site supplies "Read next".')
  const named = catalogTitles(f.title).filter((t) => body.text.includes(t))
  if (named.length) add('related-reading', `Body names other catalog stories (${named.join(', ')}); internal links belong outside the body.`)

  if (/^illustration (for|of)\b/i.test(f.imageAlt ?? '') || (f.imageAlt && f.imageAlt.split(/\s+/).length < 6)) add('imageAlt', 'imageAlt is generic or too thin; describe the scene concretely.')
  const audio = String(f.audio ?? '')
  if (audio && !/^(planned|human|none|https:\/\/\S+)$/.test(audio)) add('audio', `audio "${audio}" must be "planned", "human", "none", or an https:// URL.`)
  if (/^https:/.test(audio) && !allowedAssetHost(audio)) add('audio', `audio URL ${audio} is not on this project's Blob store or assets.basehub.com.`)
  return errors
}

/** Titles and slugs of the locked vault exemplars. */
export function exemplars() {
  if (!existsSync(EXEMPLARS_DIR)) return []
  return readdirSync(EXEMPLARS_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const text = readFileSync(join(EXEMPLARS_DIR, f), 'utf8')
      return { slug: basename(f, '.md'), title: (text.match(/^#\s+(.+)$/m)?.[1] ?? '').trim() }
    })
}

const HASH_LINE = /draft\s+sha256\s*:\s*`?([0-9a-f]{64})`?/i
const VERDICT_G = /\b(publish|revise-with-notes|revise|kill)\b/gi
const AGENTISH = /\b(agent|claude|codex|gpt|chatgpt|bot|assistant|llm|copilot|gemini)\b|thr_|\bthread\b/i
const ROMAN = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 }

function romanToInt(s) {
  let total = 0
  const chars = s.toLowerCase()
  for (let i = 0; i < chars.length; i++) {
    const v = ROMAN[chars[i]]
    total += ROMAN[chars[i + 1]] > v ? -v : v
  }
  return total
}

const stripMarkup = (s) => s.replace(/[`*_~]/g, '').trim()
const verdictTokens = (s) => [...new Set([...s.matchAll(VERDICT_G)].map((t) => t[1].toLowerCase().replace(/^revise$/, 'revise-with-notes')))]

// Every heading-like line: ATX (# to ######), a whole line in bold, or a setext heading.
function headingLines(text) {
  const lines = text.split('\n')
  const out = []
  let offset = 0
  lines.forEach((line, i) => {
    const atx = line.match(/^\s{0,3}#{1,6}\s+(.*?)\s*#*\s*$/)
    const bold = line.match(/^\s*(?:\*\*|__)(.+?)(?:\*\*|__)[\s:.]*$/)
    const setext = i + 1 < lines.length && /^\s{0,3}(=+|-{2,})\s*$/.test(lines[i + 1]) && line.trim() && !/^\s*[-*+>|]|^\s*\d+[.)]/.test(line)
    const content = atx?.[1] ?? bold?.[1] ?? (setext ? line.trim() : null)
    if (content) out.push({ content: stripMarkup(content), index: offset })
    offset += line.length + 1
  })
  return out
}

/** Problems with a sign-off ({ name, date }), given the earliest date it may carry. */
export function signOffProblems(signOff, label, notBefore) {
  const problems = []
  const today = new Date().toISOString().slice(0, 10)
  if (AGENTISH.test(signOff.name)) problems.push(`${label} names "${signOff.name}", which reads as an agent. A person signs off.`)
  if (signOff.date > today) problems.push(`${label} is dated ${signOff.date}, in the future.`)
  if (notBefore && signOff.date < notBefore) problems.push(`${label} is dated ${signOff.date}, before the review it signs (${notBefore}).`)
  return problems
}

/**
 * Parse the gate note. Returns { exists, verdict, round, reviewer, signOff,
 * exemplarsNamed, hash, problems[], next } where `next` is 'editor' (a review
 * round is needed) or 'sign-off' (only the person's sign-off is missing).
 */
export function readGateNote(draft) {
  const path = draft.paths.gate
  if (!existsSync(path)) {
    return { exists: false, problems: [`No gate note at content/drafts/${draft.slug}.gate.md. The editor (virtue-story-editor) writes it.`], next: 'editor' }
  }
  const bytes = readFileSync(path)
  const text = bytes.toString('utf8')
  const problems = []
  const rounds = []
  for (const h of headingLines(text)) {
    const m = h.content.match(/^Round\s+(\d+|[ivxlcdm]+)\b(.*)$/i)
    if (m) rounds.push({ n: /^\d+$/.test(m[1]) ? Number(m[1]) : romanToInt(m[1]), heading: h.content, detail: m[2], index: h.index })
    else if (/\b(kill|revise|revise-with-notes|rejected?)\b/i.test(h.content)) {
      problems.push(`A heading outside the numbered rounds says "${h.content}". Record every verdict as a new numbered round.`)
    }
  }
  rounds.forEach((r, i) => {
    r.body = text.slice(r.index, rounds[i + 1]?.index ?? text.length)
    const tokens = verdictTokens(r.detail)
    if (tokens.length > 1) problems.push(`Round ${r.n}'s heading names more than one verdict (${tokens.join(', ')}).`)
    r.fromHeading = tokens.length === 1 ? tokens[0] : null
    const verdictLine = r.body.split('\n').map(stripMarkup).find((l) => /^-?\s*Verdict\s*:/i.test(l))
    const lineTokens = verdictLine ? verdictTokens(verdictLine) : []
    if (lineTokens.length > 1) problems.push(`Round ${r.n}'s Verdict line names more than one verdict.`)
    r.fromLine = lineTokens.length === 1 ? lineTokens[0] : null
    if (!r.fromHeading && !r.fromLine && tokens.length <= 1) problems.push(`"${r.heading}" has no readable verdict (publish, revise-with-notes, or kill).`)
    if (r.fromHeading && r.fromLine && r.fromHeading !== r.fromLine) problems.push(`Round ${r.n} says "${r.fromHeading}" in its heading but "${r.fromLine}" in its Verdict line.`)
  })
  const seen = new Set()
  for (const r of rounds) {
    if (seen.has(r.n)) problems.push(`Round ${r.n} appears twice; number every round once.`)
    seen.add(r.n)
  }
  const current = rounds.reduce((a, r) => (!a || r.n > a.n ? r : a), null)
  const header = text.slice(0, rounds.length ? Math.min(...rounds.map((r) => r.index)) : text.length)
  let verdict = null
  if (!current) problems.push('Gate note has no "## Round N: <verdict>" section.')
  else {
    verdict = current.fromHeading ?? current.fromLine
    if (verdict !== 'publish') problems.push(`Latest gate verdict is "${verdict ?? 'unreadable'}" (round ${current.n}), not "publish".`)
  }
  const draftLine = header.match(/^-\s*Draft\s*:\s*(\S+)/im)?.[1]?.replace(/`/g, '')
  if (!draftLine || !draftLine.endsWith(`/${draft.slug}.md`)) {
    problems.push(`Gate note header must name this draft (\`- Draft: content/drafts/${draft.slug}.md\`); it says ${draftLine ? `"${draftLine}"` : 'nothing'}.`)
  }
  const reviewed = current?.body.match(HASH_LINE)?.[1]
  if (current && !reviewed) {
    problems.push(`Round ${current.n} does not record the draft it reviewed. The editor adds \`Draft sha256: ${draft.hash}\` (sha256sum of the draft) to the round.`)
  } else if (reviewed && reviewed !== draft.hash) {
    problems.push(`Round ${current.n} reviewed a different version of the draft (sha256 ${reviewed.slice(0, 12)}…, now ${draft.hash.slice(0, 12)}…). The editor must review the current text in a new round.`)
  }
  const exemplarText = current?.body.match(/^-?\s*Exemplars?\s*:\s*(.+)$/im)?.[1] ?? header.match(/^-\s*Exemplars?\s*:\s*(.+)$/im)?.[1] ?? ''
  const named = exemplars().filter((e) => exemplarText.toLowerCase().includes(e.title.toLowerCase()) || exemplarText.includes(e.slug))
  if (named.length < 2) {
    problems.push(`Gate note's Exemplars line names ${named.length} locked exemplar(s) (${named.map((e) => e.title).join(', ') || 'none'}); writing.md requires two from content/vault/exemplars/.`)
  }
  const roundDate = current?.detail.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? null
  const reviewer = current?.detail.match(/\(([^)]*)\)/)?.[1]?.replace(/^\s*\d{4}-\d{2}-\d{2}\s*,\s*/, '').trim() || null
  const sign = current?.body.split('\n').map(stripMarkup).map((l) => l.match(/^-?\s*Sign-?off\s*:\s*(.+?),\s*(\d{4}-\d{2}-\d{2})\s*$/i)).find(Boolean)
  const signOff = sign ? { name: sign[1].trim(), date: sign[2] } : null
  // Only the person's sign-off missing on an otherwise valid publish round: the
  // next step is asking them to sign, not another review round.
  const next = problems.length === 0 && verdict === 'publish' && !signOff ? 'sign-off' : 'editor'
  if (current && verdict === 'publish' && !signOff) {
    problems.push(`Round ${current.n} has no editorial sign-off. After reading the round, the editor of record adds \`- Sign-off: <name>, <YYYY-MM-DD>\` to it; an agent never writes that line.`)
  }
  if (signOff) problems.push(...signOffProblems(signOff, `Round ${current.n}'s sign-off`, roundDate))
  return { exists: true, verdict, round: current?.n ?? null, reviewer, signOff, exemplarsNamed: named.map((e) => e.title), reviewedHash: reviewed ?? null, hash: sha256(bytes), problems, next }
}

/**
 * Parse the SEO QA note written by story:seo. Returns { exists, verdict, runBy,
 * owner, signOff, hash, problems[], next } where `next` is 'record' or 'sign-off'.
 */
export function readSeoNote(draft) {
  const path = draft.paths.seo
  if (!existsSync(path)) {
    return { exists: false, problems: [`No SEO QA note at content/drafts/${draft.slug}.seo.md. Run \`pnpm story:seo ${draft.slug} --record\`.`], next: 'record' }
  }
  const bytes = readFileSync(path)
  const text = bytes.toString('utf8')
  const field = (label) => text.match(new RegExp(`^-\\s*${label}\\s*:[ \\t]*(.*)$`, 'im'))?.[1]?.trim() || null
  const verdict = field('Verdict')?.toLowerCase() ?? null
  const runBy = field('Run by')
  const owner = field('Owner')
  const date = field('Date')
  const sign = text.match(/^-\s*Owner sign-?off\s*:\s*(.+?),\s*(\d{4}-\d{2}-\d{2})\s*$/im)
  const signOff = sign ? { name: sign[1].trim(), date: sign[2] } : null
  const reviewed = text.match(HASH_LINE)?.[1]
  const problems = []
  let next = 'record'
  if (verdict !== 'clear') problems.push(`SEO QA verdict is "${verdict ?? 'missing'}", not "clear".`)
  if (reviewed !== draft.hash) problems.push(`SEO QA was run on a different version of the draft. Rerun \`pnpm story:seo ${draft.slug} --record\`.`)
  if (!runBy) problems.push('SEO QA note does not say who ran it.')
  if (!problems.length && !signOff) {
    problems.push(`SEO QA needs its owner's sign-off. ${owner ?? 'The SEO owner'} reads the note and adds \`- Owner sign-off: <name>, <YYYY-MM-DD>\`; an agent never writes that line.`)
    next = 'sign-off'
  }
  if (signOff) problems.push(...signOffProblems(signOff, 'SEO owner sign-off', date))
  return { exists: true, verdict, runBy, owner, signOff, by: signOff?.name ?? null, hash: sha256(bytes), problems, next }
}
