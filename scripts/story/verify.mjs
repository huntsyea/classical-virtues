// story:verify: ladder step 11, verify the rendered story page (recipe step 5).
//
//   pnpm story:verify <slug>                                                    local dev server
//   pnpm story:verify <slug> --base-url https://www.classicalvirtues.com --yes  production
//
// Expected values come from the draft (content/drafts/<slug>.md) when one
// exists, else from published Basehub content (BASEHUB_TOKEN), else from the
// latest backup. Then it fetches /stories/<slug> and checks what a reader and
// a search engine receive:
//   page resolves · h1 and <title> carry the title · meta description is the
//   summary · the standfirst is the dek (or the summary when there is none) · the moral renders exactly once · image alt is the approved alt ·
//   narration (when expected) is wired into the page and JSON-LD, serves
//   seekable audio/mpeg, is byte-for-byte the approved MP3 (sha256), and its
//   JSON-LD duration matches the file within 1 s · Article JSON-LD headline/description match ·
//   BreadcrumbList present · canonical points at this story and does not
//   redirect · eyebrow links the canon virtue hub · a path to another story ·
//   the source note renders · no body SEO scaffolding (moral headings, "story
//   for kids", related-reading or FAQ blocks, separators) · story is in the
//   sitemap.
// Exit 0 when everything passes, 2 otherwise.

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { main, isEntry, log, c, GateError, UsageError, assertSlug, REPO_ROOT } from './lib/cli.mjs'
import { draftPaths, loadDraft, writeStage, audioExpectation, readState, sha256, siteTarget, SITE_URL } from './lib/draft.mjs'
import { durationOf } from '../audio/lib/ffmpeg.mjs'
import { resolveCanon } from './lib/canon.mjs'
import { gql } from './lib/basehub-publish.mjs'
import { parseBody } from './lib/markdown.mjs'

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', mdash: '—', ndash: '–', hellip: '…' }
export function decode(s) {
  return String(s)
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m)
}
const norm = (s) => decode(s ?? '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim()
/** Markdown-lite to comparable plain text. */
const plain = (md) => norm(String(md ?? '').replace(/[*_`]/g, ''))

/** Visible text of the page: drop scripts, styles, and tags. */
function visibleText(html) {
  return norm(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
}

function count(haystack, needle) {
  if (!needle) return 0
  let n = 0
  let i = haystack.indexOf(needle)
  while (i !== -1) {
    n++
    i = haystack.indexOf(needle, i + needle.length)
  }
  return n
}

function jsonLdNodes(html) {
  const nodes = []
  for (const m of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(decode(m[1]))
      for (const item of [data].flat()) nodes.push(...(item['@graph'] ?? [item]))
    } catch {
      nodes.push({ '@type': '__invalid__' })
    }
  }
  return nodes
}

/** Expected field values for a slug. */
async function expectedFor(slug) {
  if (existsSync(draftPaths(slug).draft)) {
    const d = loadDraft(slug)
    const stages = readState(slug).stages
    const expectation = audioExpectation(d.fields)
    const audioUrl = expectation === 'none' ? '' : expectation === 'url' ? d.fields.audio : stages.publish?.audioUrl ?? null
    return { from: 'draft', title: d.fields.title, summary: d.fields.summary, moral: d.fields.virtueDescription, virtue: d.fields.virtue, source: d.fields.source, imageAlt: d.fields.imageAlt, audioUrl, audioSha256: stages.approval?.audioSha256 ?? null, draftHash: d.hash, body: d.body, dek: d.fields.dek ?? '' }
  }
  const token = process.env.BASEHUB_TOKEN || process.env.BASEHUB_ADMIN_TOKEN
  let story
  let from
  if (token) {
    // The published schema may or may not have the optional `dek` field yet.
    const fields = await gql('query { __type(name: "StoriesItem") { fields { name } } }', { token, draft: false })
    const hasDek = fields.__type.fields.some((x) => x.name === 'dek')
    const data = await gql(`query { stories { items { _slug _title virtue summary virtueDescription source audioUrl image { alt } content { markdown } ${hasDek ? 'dek' : ''} } } }`, { token, draft: false })
    story = data.stories.items.find((s) => s._slug === slug)
    from = 'basehub (published)'
  } else {
    const backup = join(REPO_ROOT, 'backups', 'basehub', 'latest.json')
    story = JSON.parse(readFileSync(backup, 'utf8')).stories.find((s) => s._slug === slug)
    from = 'backups/basehub/latest.json'
  }
  if (!story) throw new UsageError(`No draft and no published story for "${slug}".`)
  return { from, title: story._title, summary: story.summary, moral: story.virtueDescription, virtue: story.virtue, source: story.source ?? '', imageAlt: story.image?.alt ?? '', audioUrl: story.audioUrl || '', body: story.content?.markdown ?? '', dek: story.dek ?? '' }
}

export async function verifyStory(slug, baseUrl) {
  assertSlug(slug)
  const base = baseUrl.replace(/\/$/, '')
  const exp = await expectedFor(slug)
  const url = `${base}/stories/${slug}`
  const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(240_000) }).catch((err) => {
    throw new Error(`GET ${url} failed or timed out (${err.message}). Is the site up?`)
  })
  const html = res.status === 200 ? await res.text() : ''
  const text = visibleText(html)
  const checks = []
  const add = (label, pass, detail = '', severity = 'fail') => checks.push({ label, pass: Boolean(pass), detail, severity })

  add('Page resolves (200)', res.status === 200, `HTTP ${res.status}${res.headers.get('location') ? ` → ${res.headers.get('location')}` : ''}`)
  if (res.status !== 200) return { url, exp, checks }

  const h1 = norm(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, '') ?? '')
  add('h1 is the title', h1 === norm(exp.title), h1)
  const title = norm(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '')
  add('<title> carries the title', title.includes(norm(exp.title)), title)
  const desc = norm(html.match(/<meta name="description" content="([^"]*)"/i)?.[1] ?? '')
  add('Meta description is the summary', desc === norm(exp.summary), desc.slice(0, 90) + (desc.length > 90 ? '…' : ''))
  // The standfirst under the title: the dek when there is one, else the summary.
  const renderedDek = renderedDekText(html)
  const wantDek = norm(exp.dek?.trim() ? exp.dek : exp.summary)
  add('Dek under the title is the dek (or the summary when there is none)', renderedDek !== null && norm(renderedDek) === wantDek, renderedDek === null ? 'no .story-dek paragraph' : norm(renderedDek).slice(0, 90))
  const moralCount = count(text, plain(exp.moral))
  add('Moral renders exactly once', moralCount === 1, `${moralCount} occurrence(s)`)
  const alts = [...html.matchAll(/<img[^>]*\salt="([^"]*)"/gi)].map((m) => norm(m[1]))
  add('Hero image alt is the approved alt', exp.imageAlt ? alts.includes(norm(exp.imageAlt)) : alts.some((a) => a.length > 10), exp.imageAlt || '(no alt expected)')

  const nodes = jsonLdNodes(html)
  add('JSON-LD parses', nodes.length > 0 && !nodes.some((n) => n['@type'] === '__invalid__'), `${nodes.length} node(s)`)
  const article = nodes.find((n) => [n['@type']].flat().some((t) => /Article|CreativeWork|ShortStory/.test(t)))
  add('Article JSON-LD headline + description', article && norm(article.headline ?? article.name) === norm(exp.title) && norm(article.description) === norm(exp.summary), article ? `${[article['@type']].flat().join('/')}: ${norm(article.headline ?? article.name)}` : 'none')
  add('BreadcrumbList JSON-LD', nodes.some((n) => n['@type'] === 'BreadcrumbList'))

  if (exp.audioUrl === null) {
    add('Narration', false, 'draft expects audio but no published audioUrl is recorded; run story:publish first')
  } else if (exp.audioUrl) {
    // Either inline on the Article or a separate AudioObject node referenced by @id.
    const audioNodes = [...nodes.filter((n) => n['@type'] === 'AudioObject'), ...nodes.flatMap((n) => [n.audio, n.associatedMedia]).flat().filter(Boolean)]
    add('Narration in JSON-LD (AudioObject.contentUrl)', audioNodes.some((a) => a.contentUrl === exp.audioUrl), audioNodes.map((a) => a.contentUrl).join(', ') || 'none')
    add('Narration wired into the page', html.includes(exp.audioUrl.replace(/&/g, '&amp;')) || html.includes(exp.audioUrl))
    const head = await fetch(exp.audioUrl, { headers: { Range: 'bytes=0-1' } })
    add('Narration serves seekable audio/mpeg', head.status === 206 && /audio\/mpeg/.test(head.headers.get('content-type') ?? ''), `HTTP ${head.status} ${head.headers.get('content-type')}`)
    const full = Buffer.from(await (await fetch(exp.audioUrl)).arrayBuffer())
    const servedSha = sha256(full)
    if (exp.audioSha256) add('Served narration is the approved MP3', servedSha === exp.audioSha256, `sha256 ${servedSha.slice(0, 12)} vs approved ${exp.audioSha256.slice(0, 12)}`)
    const tmp = join(tmpdir(), `cv-verify-${servedSha.slice(0, 12)}.mp3`)
    writeFileSync(tmp, full)
    const actual = await durationOf(tmp)
    const declared = isoSeconds(audioNodes.find((a) => a.duration)?.duration)
    add('JSON-LD duration matches the file (±1 s)', declared !== null && Math.abs(declared - actual) <= 1, `declared ${declared ?? 'none'} s, file ${actual.toFixed(1)} s`)
  } else {
    add('No narration expected, none advertised', !nodes.some((n) => n.audio || n['@type'] === 'AudioObject'), '')
  }

  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/i)?.[1]
  add('Canonical is this story', canonical && new URL(canonical).pathname === `/stories/${slug}`, canonical ?? 'none')
  if (canonical && /^https:/.test(canonical) && !/localhost/.test(base)) {
    const c = await fetch(canonical, { method: 'HEAD', redirect: 'manual' })
    add('Canonical URL answers 200 (no redirect)', c.status === 200, `HTTP ${c.status}${c.headers.get('location') ? ` → ${c.headers.get('location')}` : ''}`, 'warn')
  } else if (canonical && new URL(canonical).host !== new URL(SITE_URL).host) {
    add('Canonical host matches the serving host', false, `canonical ${new URL(canonical).host}, production serves ${new URL(SITE_URL).host} (apex 308s to www)`, 'warn')
  }

  const canon = resolveCanon(exp.virtue)
  add('Eyebrow links the canon virtue hub', canon && html.includes(`href="/virtues/${canon.slug}"`), canon ? `/virtues/${canon.slug}` : `"${exp.virtue}" is an orphan label`)
  const otherStories = new Set([...html.matchAll(/href="\/stories\/([a-z0-9-]+)"/g)].map((m) => m[1]).filter((s) => s !== slug))
  add('A path to another story', otherStories.size > 0, [...otherStories].slice(0, 3).join(', '))
  if (exp.source) add('Source note renders', text.includes(norm(exp.source)), exp.source)

  const scaffolding = [/what is the moral/i, /story for kids/i, /related (reading|stories)\s*:/i, /frequently asked/i]
  const proseHtml = html.match(/<article[\s\S]*?<\/article>/i)?.[0] ?? html
  const hits = scaffolding.filter((re) => re.test(visibleText(proseHtml))).map(String)
  add('No SEO scaffolding in the story', hits.length === 0, hits.join(', ') || 'clean')

  // The rendered body: narrative paragraphs only, saying what the approved text says.
  const bodyHtml = storyBodyHtml(html)
  if (bodyHtml === null) add('Story body found (#story-body)', false, 'no #story-body container on the page')
  else {
    const extra = [...new Set([...bodyHtml.matchAll(/<(h[1-6]|hr|a|ul|ol|blockquote|table|img|details|aside|nav)\b/gi)].map((m) => m[1].toLowerCase()))]
    add('Story body is narrative only (no heading, rule, link, list or quote)', extra.length === 0, extra.length ? `found <${extra.join('>, <')}>` : 'paragraphs only')
    const rendered = compareWords(visibleText(bodyHtml))
    const approved = compareWords((await parseBody(exp.body ?? '')).text)
    const same = rendered === approved
    add('Story body matches the approved text', same, same ? `${approved.split(' ').length} words` : firstDifference(approved, rendered))
  }

  const sitemap = await fetch(`${base}/sitemap.xml`, { signal: AbortSignal.timeout(120_000) }).then((r) => (r.ok ? r.text() : ''))
  add('Listed in the sitemap', sitemap.includes(`/stories/${slug}<`), '')
  return { url, exp, checks }
}

/** Text of the standfirst paragraph (class "story-dek"), or null. */
export function renderedDekText(html) {
  const m = html.match(/<p[^>]*class="[^"]*\bstory-dek\b[^"]*"[^>]*>([\s\S]*?)<\/p>/i)
  return m ? decode(m[1].replace(/<[^>]+>/g, '')) : null
}

/** The inner HTML of the #story-body container, or null. */
export function storyBodyHtml(html) {
  const start = html.search(/<div[^>]*\bid="story-body"[^>]*>/i)
  if (start === -1) return null
  const open = html.indexOf('>', start) + 1
  let depth = 1
  const re = /<\/?div\b[^>]*>/gi
  re.lastIndex = open
  let m
  while ((m = re.exec(html))) {
    depth += m[0][1] === '/' ? -1 : 1
    if (depth === 0) return html.slice(open, m.index)
  }
  return null
}

/** Word sequence for comparison: typography (curly quotes, case, whitespace) ignored. */
export function compareWords(text) {
  return norm(text).toLowerCase().replace(/[^\p{L}\p{N}' ]+/gu, ' ').replace(/\s+/g, ' ').trim()
}

function firstDifference(a, b) {
  const x = a.split(' ')
  const y = b.split(' ')
  let i = 0
  while (i < x.length && x[i] === y[i]) i++
  return `differs at word ${i + 1}: approved "${x.slice(i, i + 6).join(' ')}", page "${y.slice(i, i + 6).join(' ')}"`
}

/** Seconds in an ISO 8601 duration such as PT2M58S, or null. */
function isoSeconds(iso) {
  const m = String(iso ?? '').match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?$/)
  return m ? Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0) : null
}

async function cli({ _, flags }) {
  const slug = _[0]
  const { base, local } = siteTarget(flags)
  const { url, exp, checks } = await verifyStory(slug, base)
  console.log(c.bold(`\n${url}`) + c.dim(`  (expected values from ${exp.from})`))
  for (const ch of checks) {
    const mark = ch.pass ? c.green('pass') : ch.severity === 'warn' ? c.yellow('warn') : c.red('FAIL')
    console.log(`  ${mark}  ${ch.label}${ch.detail ? c.dim(`  ${ch.detail}`) : ''}`)
  }
  const failed = checks.filter((ch) => !ch.pass && ch.severity === 'fail')
  if (existsSync(draftPaths(slug).draft)) {
    writeStage(slug, 'verify', { status: failed.length ? 'fail' : 'pass', url, local, draftHash: exp.draftHash, failed: failed.map((f) => f.label) })
    // A passing check of the live site (body, fields, and the approved MP3)
    // against these draft bytes is the evidence that a person committed the
    // staged story in the Basehub dashboard.
    const servedApproved = !exp.audioUrl || checks.some((ch) => ch.label === 'Served narration is the approved MP3' && ch.pass)
    const bodyMatches = checks.some((ch) => ch.label === 'Story body matches the approved text' && ch.pass)
    if (!failed.length && !local && servedApproved && bodyMatches) {
      const publish = readState(slug).stages.publish ?? {}
      writeStage(slug, 'publish', { ...publish, status: 'published', draftHash: exp.draftHash, confirmedBy: `story:verify ${url}` })
    }
  }
  if (failed.length) throw new GateError(`${failed.length} check(s) failed on ${url}.`)
  log.ok(`Rendered page verified: ${url}`)
}

if (isEntry(import.meta.url)) main(cli, { meta: import.meta.url, args: [1, 1], flags: { 'base-url': 'string', yes: 'boolean' } })
