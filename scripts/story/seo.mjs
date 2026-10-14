// story:seo: ladder step 4, SEO QA (production-recipe step 4, owner Quinn).
//
//   pnpm story:seo <slug>                    report only, writes nothing
//   pnpm story:seo <slug> --record           report and record content/drafts/<slug>.seo.md
//   --owner <name>                           the SEO owner who must sign off (default Quinn)
//
// The note says who actually ran the checks ("Run by": an agent thread or a
// person's account, never the owner's name on an agent's behalf) and leaves
// `- Owner sign-off:` blank. The owner reads the note and fills that line in
// by hand as `<name>, <YYYY-MM-DD>`; story:check refuses until they do.
// Re-recording against the same draft bytes keeps an existing sign-off.
//
// Checks discoverability surfaces only, never the prose:
//   slug       format, matches the file, short, carries the title's key words,
//              not already used by a published story (live Basehub, else backup)
//   title tag  "<title> | Classical Virtues" fits 60 characters
//   summary    is the meta description: 120-160 characters, no SEO stock phrases
//              ("discover", "learn how", "story for kids", "timeless tale"),
//              does not open by repeating the title
//   dek        when present: 80-160 characters, no stock phrasing, not the summary again
//   image alt  concrete, 8-30 words, under 150 characters, no "image of"
//   structured data inputs: canon virtue resolves, source note present
//   body       no links, headings, FAQ, or "moral of" scaffolding
//   internal links: recommendations OUTSIDE the body (canon hub, same-virtue
//              stories, the brief's ideas, each checked to exist)
// The note is recorded with verdict "clear" only when every check passes; it
// binds the draft's sha256, so editing the draft reopens SEO QA.

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { main, isEntry, log, c, GateError, REPO_ROOT, actorIdentity } from './lib/cli.mjs'
import { loadDraft, rel } from './lib/draft.mjs'
import { resolveCanon } from './lib/canon.mjs'
import { gql } from './lib/basehub-publish.mjs'

const SITE_NAME = 'Classical Virtues'
const STOCK = [/\bdiscover\b/i, /\blearn how\b/i, /story for kids/i, /timeless tale/i, /\binspiring\b/i, /\bmust[- ]read\b/i, /\bultimate\b/i]
const STOP = new Set(['a', 'an', 'and', 'the', 'of', 'in', 'on', 'to', 'for', 'with', 'his', 'her', 'their'])

/** Published stories: live Basehub when a token is set, else the latest backup. */
async function publishedStories() {
  const token = process.env.BASEHUB_TOKEN || process.env.BASEHUB_ADMIN_TOKEN
  if (token && !process.env.STORY_OFFLINE) {
    const data = await gql('query { stories { items { _slug _title virtue } } }', { token, draft: true })
    return { from: 'Basehub (draft tree)', stories: data.stories.items.map((s) => ({ slug: s._slug, title: s._title, virtue: s.virtue })) }
  }
  const backup = JSON.parse(readFileSync(join(REPO_ROOT, 'backups', 'basehub', 'latest.json'), 'utf8'))
  return { from: 'backups/basehub/latest.json', stories: backup.stories.map((s) => ({ slug: s._slug, title: s._title, virtue: s.virtue })) }
}

export async function seoChecks(draft) {
  const f = draft.fields
  const checks = []
  const add = (area, label, pass, detail, severity = 'fail') => checks.push({ area, label, pass: Boolean(pass), detail, severity })
  const { from, stories } = await publishedStories()

  // Slug
  const words = draft.slug.split('-')
  const titleWords = f.title.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter((w) => w && !STOP.has(w))
  const shared = titleWords.filter((w) => words.includes(w))
  add('slug', 'Slug is short (≤ 6 words, ≤ 50 chars)', words.length <= 6 && draft.slug.length <= 50, `/stories/${draft.slug}`)
  add('slug', "Slug carries the title's key words", titleWords.length === 0 || shared.length / titleWords.length >= 0.6, `${shared.length}/${titleWords.length} of: ${titleWords.join(', ')}`)
  add('slug', 'Slug has no SEO filler', !/(story|kids|moral|lesson|fable|for-children)/.test(draft.slug.replace(/^the-/, '')) || titleWords.some((w) => /story|fable/.test(w)), draft.slug)
  const taken = stories.find((s) => s.slug === draft.slug)
  add('slug', 'Slug is not already a published story', !taken, taken ? `already used by "${taken.title}" (${from}); publishing would overwrite it` : `free (${from})`)

  // Title tag
  const titleTag = `${f.title} | ${SITE_NAME}`
  add('title', 'Title tag fits 60 characters', titleTag.length <= 60, `${titleTag.length}: "${titleTag}"`)
  add('title', 'Title is plain (no colon subtitle, no "story")', !/[:|]/.test(f.title) && !/\bstory\b/i.test(f.title), f.title)

  // Summary = meta description
  const summary = f.summary
  add('summary', 'Meta description is 120-160 characters', summary.length >= 120 && summary.length <= 160, `${summary.length} characters`)
  const stock = STOCK.filter((re) => re.test(summary)).map((re) => re.source.replace(/\\b/g, ''))
  add('summary', 'No stock SEO phrasing', stock.length === 0, stock.join(', ') || 'none')
  add('summary', 'Does not open by repeating the title', !summary.toLowerCase().startsWith(f.title.toLowerCase()), summary.slice(0, 60))

  // Optional dek: the standfirst readers see under the title and on cards.
  if (f.dek) {
    add('dek', 'Dek is 80-160 characters', f.dek.length >= 80 && f.dek.length <= 160, `${f.dek.length} characters`)
    const dekStock = STOCK.filter((re) => re.test(f.dek)).map((re) => re.source.replace(/\\b/g, ''))
    add('dek', 'Dek has no stock SEO phrasing', dekStock.length === 0, dekStock.join(', ') || 'none')
    add('dek', 'Dek is not a copy of the summary', f.dek.trim() !== summary.trim(), 'differs')
  }

  // Image alt
  const alt = f.imageAlt
  const altWords = alt.split(/\s+/).filter(Boolean).length
  add('alt', 'Alt text is 8-30 words and under 150 characters', altWords >= 8 && altWords <= 30 && alt.length < 150, `${altWords} words, ${alt.length} characters`)
  add('alt', 'Alt text describes, not labels ("image of", "illustration")', !/^(an? )?(image|picture|photo|illustration|painting) (of|showing)/i.test(alt), alt.slice(0, 60))

  // Structured data inputs
  const canon = resolveCanon(f.virtue)
  add('structured', 'Virtue resolves to a canon hub (eyebrow link, Article about)', canon && canon.title === f.canonicalVirtue, canon ? `/virtues/${canon.slug}` : `"${f.virtue}" is an orphan`)
  add('structured', 'Source note present (provenance line, isBasedOn)', Boolean(f.source), f.source || 'missing')

  // Body boundary
  const scaffolding = [/\]\(/, /^\s{0,3}#/m, /what is the moral/i, /frequently asked/i, /related (reading|stories)/i, /story for kids/i].filter((re) => re.test(draft.body))
  add('body', 'Body carries no links, headings, FAQ or moral scaffolding', scaffolding.length === 0, scaffolding.map(String).join(', ') || 'clean')

  // Internal-link recommendations (outside the body)
  const recs = []
  if (canon) recs.push({ href: `/virtues/${canon.slug}`, label: `${canon.title} hub`, why: 'canon hub (the eyebrow links here)' })
  for (const s of stories.filter((s) => s.slug !== draft.slug && resolveCanon(s.virtue)?.slug === canon?.slug).slice(0, 3)) {
    recs.push({ href: `/stories/${s.slug}`, label: s.title, why: `same virtue (${canon.title})` })
  }
  const briefPath = join(draft.paths.dir, 'brief.md')
  if (existsSync(briefPath)) {
    const ideas = readFileSync(briefPath, 'utf8').match(/^-\s*Internal-link ideas\s*:\s*(.+)$/im)?.[1] ?? ''
    for (const s of stories.filter((s) => s.slug !== draft.slug && ideas.includes(s.title))) {
      if (!recs.some((r) => r.href === `/stories/${s.slug}`)) recs.push({ href: `/stories/${s.slug}`, label: s.title, why: 'named in the brief' })
    }
  }
  add('links', 'At least two internal-link recommendations that exist', recs.length >= 2, `${recs.length} found`)
  return { checks, recs, titleTag, from }
}

function noteFor(draft, { checks, recs, titleTag }, { owner, keepSignOff }) {
  const clear = checks.every((x) => x.pass || x.severity !== 'fail')
  const rows = checks.map((x) => `| ${x.area} | ${x.label} | ${x.pass ? 'pass' : 'FAIL'} | ${String(x.detail).replace(/\|/g, '/')} |`)
  return `# SEO QA: ${draft.fields.title} (\`${draft.slug}\`)

- Draft: content/drafts/${draft.slug}.md
- Draft sha256: ${draft.hash}
- Run by: ${actorIdentity()} via story:seo
- Date: ${new Date().toISOString().slice(0, 10)}
- Verdict: ${clear ? 'clear' : 'needs-work'}
- Owner: ${owner}
- Owner sign-off: ${keepSignOff ?? ''}

## Checks

| Area | Check | Result | Detail |
| --- | --- | --- | --- |
${rows.join('\n')}

## Metadata preview

- Title tag: ${titleTag}
- Meta description: ${draft.fields.summary}
- URL: /stories/${draft.slug}
- Image alt: ${draft.fields.imageAlt}

## Internal-link recommendations (outside the story body)

${recs.map((r) => `- [${r.label}](${r.href}): ${r.why}`).join('\n') || '- none'}

The site's "Read next" block and the eyebrow carry these; nothing here enters the body.
`
}

async function cli({ _, flags }) {
  const draft = loadDraft(_[0])
  const result = await seoChecks(draft)
  console.log(c.bold(`\nSEO QA: ${draft.fields.title}`) + c.dim(`  published stories from ${result.from}`))
  for (const x of result.checks) {
    console.log(`  ${x.pass ? c.green('pass') : c.red('FAIL')}  ${x.area.padEnd(10)} ${x.label}${c.dim(`  ${x.detail}`)}`)
  }
  console.log(c.bold('  internal-link recommendations (outside the body):'))
  for (const r of result.recs) console.log(`    ${r.href}  ${c.dim(`${r.label}: ${r.why}`)}`)
  const failed = result.checks.filter((x) => !x.pass && x.severity === 'fail')
  if (!flags.record) {
    log.info(c.dim('Report only. Re-run with --record to write the QA note.'))
    if (failed.length) throw new GateError(`${failed.length} SEO check(s) failed.`)
    return
  }
  const owner = flags.owner || 'Quinn'
  // Keep a human sign-off only if it was given for these exact draft bytes.
  let keepSignOff = null
  if (existsSync(draft.paths.seo)) {
    const old = readFileSync(draft.paths.seo, 'utf8')
    if (old.includes(`Draft sha256: ${draft.hash}`)) keepSignOff = old.match(/^-\s*Owner sign-?off\s*:[ \t]*(.+)$/im)?.[1]?.trim() || null
  }
  writeFileSync(draft.paths.seo, noteFor(draft, result, { owner, keepSignOff: failed.length ? null : keepSignOff }))
  if (failed.length) throw new GateError(`${failed.length} SEO check(s) failed; recorded needs-work in ${rel(draft.paths.seo)}.`)
  log.ok(`SEO QA clear, recorded in ${rel(draft.paths.seo)} (run by ${actorIdentity()}).`)
  if (!keepSignOff) log.info(`Next: ${owner} reads the note and adds \`- Owner sign-off: <name>, <YYYY-MM-DD>\` by hand. Then (ladder step 5): pnpm story:check ${draft.slug}`)
}

if (isEntry(import.meta.url)) main(cli, { meta: import.meta.url, args: [1, 1], flags: { record: 'boolean', owner: 'string' } })
