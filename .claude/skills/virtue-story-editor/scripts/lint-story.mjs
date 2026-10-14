#!/usr/bin/env node
// Deterministic linter for Classical Virtues story drafts (content/story-format.md).
// Zero dependencies. Usage:
//   node lint-story.mjs [--json] [--min-words N] [--max-words N] [--repo DIR] <draft.md>...
// Exit: 0 no errors, 1 at least one error, 2 usage or unreadable/unparseable file.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))

const KEYS = [
  'title', 'slug', 'virtue', 'canonicalVirtue', 'subVirtue', 'summary', 'dek',
  'virtueDescription', 'source', 'imageAlt', 'imagePrompt', 'audio',
]
const MAY_BE_EMPTY = new Set(['subVirtue', 'dek'])
// Optional keys: the contract allows them to be absent (content/story-format.md).
const OPTIONAL = new Set(['dek'])
const CANON = ['Prudence', 'Justice', 'Fortitude', 'Temperance', 'Faith', 'Hope', 'Charity']
const PROSE_FIELDS = ['title', 'summary', 'dek', 'virtueDescription', 'imageAlt']
const DEFAULT_PHRASE_FIELDS = ['title', 'summary', 'dek', 'virtueDescription', 'body']

// Named-virtue vocabulary. A narrator hit means the prose labels a virtue rather than
// showing it. Plain descriptions and verbs ("brave," "hope") are left out on purpose.
const VIRTUE_WORDS = [
  'prudence', 'prudent', 'wisdom', 'justice', 'honest', 'honesty', 'honestly',
  'truthful', 'truthfulness', 'integrity', 'fortitude', 'courage', 'courageous',
  'courageously', 'bravery', 'temperance', 'temperate',
  'self-control', 'moderation', 'faith', 'faithful', 'faithfully', 'faithfulness',
  'hope', 'hopeful', 'charity',
  'charitable', 'kindness', 'mercy', 'merciful', 'compassion', 'compassionate',
  'generosity', 'loyalty', 'humility', 'patience', 'perseverance', 'sincere',
  'sincerity', 'virtue', 'virtuous',
]
const MORAL_ENDING = [
  [/\b(learned|learnt) that\b/i, 'learned that'],
  [/\btaught (him|her|them|us|me) that\b/i, 'taught ... that'],
  [/\bthe lesson\b/i, 'the lesson'],
  [/\b(showed|proved|shows|proves) that\b/i, 'showed that'],
]
const SAID_BOOKISMS = [
  'exclaimed', 'retorted', 'chuckled', 'hissed', 'beamed', 'interjected', 'snapped',
  'sneered', 'boomed', 'proclaimed', 'intoned', 'queried', 'opined', 'gushed',
  'chortled', 'smirked', 'grinned', 'laughed', 'smiled', 'sighed', 'breathed',
]
const LY_NOT_ADVERBS = new Set([
  'only', 'early', 'family', 'holy', 'lily', 'belly', 'fly', 'reply', 'july', 'ugly',
  'lonely', 'daily', 'likely', 'silly', 'jolly', 'holly', 'bully', 'rely', 'supply',
  'apply', 'ally', 'italy', 'sly', 'ply', 'folly', 'wily', 'hilly', 'lowly',
  'friendly', 'lovely', 'lively', 'elderly', 'costly', 'deadly', 'curly', 'chilly',
  'woolly', 'oily', 'surly', 'burly', 'comely', 'homely', 'orderly', 'sickly',
  'smelly', 'prickly', 'wrinkly', 'bubbly', 'kindly', 'stately', 'manly', 'godly',
  'worldly', 'heavenly', 'earthly', 'unruly', 'gully', 'jelly', 'rally', 'tally',
  'bodily', 'scaly', 'wobbly', 'gangly', 'ghostly', 'leisurely', 'unlikely', 'fly',
  'butterfly', 'dragonfly', 'monthly', 'weekly', 'yearly', 'nightly', 'hourly',
])
// Evaluative adjectives tell the reader how to feel; density is a smell, not a rule.
const EVALUATIVE = new Set([
  'beautiful', 'wonderful', 'magnificent', 'majestic', 'mighty', 'glorious',
  'terrible', 'awful', 'amazing', 'incredible', 'extraordinary', 'remarkable',
  'lovely', 'noble', 'sacred', 'solemn', 'mysterious', 'peaceful', 'tender',
  'gentle', 'fierce', 'grand', 'vast', 'ancient', 'humble', 'precious', 'pure',
  'sweet', 'great', 'unexpected', 'powerful', 'profound', 'heartfelt', 'quiet',
  'soft', 'warm', 'brilliant', 'radiant', 'golden', 'dear',
])

// Words that make "The <noun>" an actor in an opening sentence.
const ACTOR_NOUNS = new Set([
  'boy', 'girl', 'man', 'woman', 'men', 'women', 'king', 'queen', 'prince', 'princess',
  'old', 'judge', 'judges', 'farmer', 'miller', 'fox', 'lion', 'mouse', 'crow', 'dog',
  'horse', 'ant', 'grasshopper', 'shepherd', 'soldier', 'widow', 'mother', 'father',
  'child', 'children', 'people', 'knight', 'emperor', 'monk', 'sailor', 'fisherman',
  'wife', 'husband', 'tortoise', 'hare', 'wolf', 'bird', 'dove', 'raven', 'hawk',
  'giant', 'cobbler', 'woodcutter', 'woodman', 'beggar', 'traveler', 'stranger',
  'young', 'little', 'poor', 'rich', 'priest', 'prophet', 'general', 'captain',
])
const NOT_ACTOR_OPENERS = new Set([
  'the', 'a', 'an', 'on', 'in', 'at', 'for', 'when', 'long', 'once', 'there', 'it', 'one',
  'many', 'after', 'before', 'years', 'this', 'that', 'now', 'then', 'all', 'every', 'by',
  'from', 'though', 'although', 'as', 'with', 'of', 'to', 'some', 'no', 'not', 'far',
  'high', 'deep', 'early', 'late', 'every', 'each', 'here', 'outside', 'inside',
])
// Words that suggest something can go wrong in paragraph one. A heuristic only.
const PRESSURE_CUES = [
  'but', 'until', 'could not', 'would not', 'cannot', 'no one', 'nothing', 'wrong',
  'lost', 'hungry', 'afraid', 'fear', 'alone', 'worn', 'dying', 'sick', 'storm', 'thirst',
  'thirsty', 'waited', 'waiting', 'enemy', 'lame', 'forbid', 'forbidden', 'decree',
  'must not', 'nowhere', 'starving', 'danger', 'trouble', 'worry', 'worried', 'trapped',
  'stuck', 'flood', 'escape', 'shut', 'catch', 'unless', 'wronged',
]

// Habits a blind reader hears across stories: how the last paragraph lands, the
// gesture it closes on, the spread of sentence lengths, and pet constructions
// (So/Then paragraph openers, a past-perfect backstory opening, archaisms kept as
// souvenirs, an echo planted early and returned at the close).
const GESTURES = {
  looking: ['look', 'looked', 'looks', 'watch', 'watched', 'watching', 'saw', 'behold', 'gazed'],
  waiting: ['wait', 'waited', 'waiting', 'evening', 'evenings', 'night'],
  light: ['light', 'dawn', 'morning', 'sun', 'lamp', 'bright'],
  rest: ['rest', 'rested', 'sleep', 'slept', 'stall', 'home', 'peace'],
  restoration: ['dry', 'whole', 'safe', 'unhurt', 'hurt', 'dinner', 'fed', 'free', 'glad', 'joy'],
}
const ARCHAISMS = ['behold', 'lo', 'exceedingly', 'unto', 'thee', 'thou', 'thy', 'thine', 'hath', 'doth', 'aforetime', 'altereth', 'ye', 'verily', 'nay', 'wherefore']
const STOP3 = new Set(['the', 'and', 'a', 'an', 'of', 'to', 'in', 'on', 'he', 'she', 'it', 'his', 'her', 'was', 'had', 'that', 'with', 'for', 'at', 'as', 'him', 'they', 'them', 'their', 'from', 'not', 'but', 'all', 'one'])
const lc = (x) => words(x).map((t) => t.toLowerCase().replace(/[^\p{L}']/gu, '')).filter(Boolean)
const narration = (t) => t.replace(/["“][^"”]*["”]/g, ' ')
function shapeOf(paraTexts, sourceText = null) {
  const paras = paraTexts.map((t) => sentencesOf(t))
  const all = paras.flat()
  if (!all.length) return null
  const last = all[all.length - 1]
  const lastN = words(last).length
  const lastPara = lc(paraTexts[paraTexts.length - 1])
  const hist = [0, 0, 0, 0, 0]
  for (const x of all) { const n = words(x).length; hist[n <= 6 ? 0 : n <= 12 ? 1 : n <= 18 ? 2 : n <= 25 ? 3 : 4]++ }
  const openers = paraTexts.filter((t) => /^(so|then)\b/i.test(t.trim())).length
  const firstTwelve = words(all[0]).slice(0, 12).join(' ').toLowerCase()
  const narr = lc(narration(paraTexts.join(' ')))
  const souvenirs = narr.filter((w) => ARCHAISMS.includes(w))
  // Echo: a 4-word phrase with two content words, planted in the first half and
  // returned in the last two paragraphs, that the governing text does not itself
  // repeat (an echo the source makes twice, like "live for ever", is the source's).
  // Content words exclude the story's own most frequent words (its characters and
  // setting), so "the king was" is not an echo but "rest for the sole" is.
  const freq = {}
  for (const w of lc(narration(paraTexts.join(' ')))) freq[w] = (freq[w] ?? 0) + 1
  const content = (x) => x.length >= 3 && !STOP3.has(x) && (freq[x] ?? 0) < 4
  const grams = (ts) => { const w = lc(narration(ts.join(' '))); const out = new Set(); for (let i = 0; i + 3 < w.length; i++) { const g = w.slice(i, i + 4); if (g.filter(content).length >= 2) out.add(g.join(' ')) } return out }
  const inSource = (g) => (sourceText ? sourceText.split(` ${g} `).length - 1 : 0)
  let echo = null
  if (paraTexts.length >= 5) {
    const late = grams(paraTexts.slice(-2))
    for (const g of grams(paraTexts.slice(0, Math.ceil(paraTexts.length / 2)))) if (late.has(g) && inSource(g) < 2) { echo = g; break }
  }
  return {
    cadence: lastN >= 18 && /,\s+and\b/i.test(last) ? 'and-chain' : lastN <= 8 ? 'short' : 'plain',
    gestures: Object.entries(GESTURES).filter(([, ws]) => ws.some((w) => lastPara.includes(w))).map(([k]) => k),
    hist: hist.map((n) => n / all.length),
    perfectOpening: /\bhad\s+(\p{L}+ed|been|gone|ridden|drifted|watched|grown|come|done|seen|known|made|taken|kept)\b/u.test(firstTwelve),
    openers,
    openersShare: openers / paraTexts.length,
    souvenirs,
    echo,
    refrain: refrainsOf(all).length ? 'refrain' : null,
    firstText: all[0],
    lastText: last,
  }
}
const rhythmSimilarity = (a, b) => 1 - a.reduce((s, x, i) => s + Math.abs(x - b[i]), 0) / 2
function refrainsOf(sentences) {
  const out = []
  for (let i = 1; i < sentences.length; i++) {
    // "<subject> did not", where the subject is one or two words ("She", "The lion").
    const neg = (x) => {
      const w = words(x).map((t) => t.toLowerCase().replace(/[^\p{L}']/gu, ''))
      const k = w.findIndex((t, j) => j >= 1 && j <= 2 && ['did', 'could', 'would', 'was', 'were', 'had'].includes(t) && w[j + 1] === 'not')
      return k === -1 ? null : w.slice(0, k + 2).join(' ')
    }
    const a = neg(sentences[i - 1])
    if (a && a === neg(sentences[i])) out.push(sentences[i - 1])
  }
  return out
}

const normSource = (t) => ' ' + t.toLowerCase().replace(/[^\p{L}\s']/gu, ' ').replace(/\s+/g, ' ') + ' '

// Other stories to compare shapes against: drafts under content/drafts (two levels
// deep, files whose slug equals their name) and the live catalog snapshot.
function loadCorpus(repo, opts) {
  const corpus = []
  const dir = opts.drafts ?? (repo ? path.join(repo, 'content/drafts') : null)
  const walk = (d, depth) => {
    if (!d || !fs.existsSync(d) || depth > 2) return
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name)
      if (e.isDirectory()) walk(p, depth + 1)
      else if (/^[a-z0-9-]+\.md$/.test(e.name) && e.name !== 'brief.md') {
        try {
          const dft = parseDraft(fs.readFileSync(p, 'utf8'))
          if (dft.fields.slug !== path.basename(e.name, '.md')) continue
          const src = path.join(path.dirname(p), dft.fields.slug, 'source.txt')
          corpus.push({ id: `draft ${path.relative(process.cwd(), p)}`, file: path.resolve(p), slug: dft.fields.slug, paras: paragraphsOf(dft.bodyLines).map((x) => x.text), source: fs.existsSync(src) ? normSource(fs.readFileSync(src, 'utf8')) : null })
        } catch { /* not a draft */ }
      }
    }
  }
  walk(dir, 0)
  if (repo && opts.catalog !== false) {
    try {
      const seen = new Set()
      ;(function w(x) {
        if (Array.isArray(x)) return x.forEach(w)
        if (x && typeof x === 'object') {
          if (x._slug && x.content?.markdown && !seen.has(x._slug)) {
            seen.add(x._slug)
            corpus.push({ id: `catalog ${x._slug}`, slug: x._slug, paras: x.content.markdown.split(/\n\s*\n/).map((t) => t.trim()).filter(Boolean) })
          }
          Object.values(x).forEach(w)
        }
      })(JSON.parse(fs.readFileSync(path.join(repo, 'backups/basehub/latest.json'), 'utf8')))
    } catch { /* no catalog snapshot */ }
  }
  return corpus
}

function parseArgs(argv) {
  const opts = { json: false, minWords: null, maxWords: null, repo: null, files: [], habits: true, catalog: true, drafts: null, source: null }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--json') opts.json = true
    else if (a === '--min-words') opts.minWords = Number(argv[++i])
    else if (a === '--max-words') opts.maxWords = Number(argv[++i])
    else if (a === '--repo') opts.repo = argv[++i]
    else if (a === '--no-habits') opts.habits = false
    else if (a === '--no-catalog') opts.catalog = false
    else if (a === '--drafts') opts.drafts = argv[++i]
    else if (a === '--source') opts.source = argv[++i]
    else if (a === '-h' || a === '--help') opts.help = true
    else opts.files.push(a)
  }
  return opts
}

function findRepo(start) {
  let dir = path.resolve(start)
  for (;;) {
    if (fs.existsSync(path.join(dir, 'src/data/virtues.json'))) return dir
    const up = path.dirname(dir)
    if (up === dir) return null
    dir = up
  }
}

// Canon resolution mirrors the site: canon title, alternateName, then the sub-virtue
// bridge SUB_VIRTUE_TO_CANON_SLUG, found in whichever src/lib/*.ts declares it. Read
// from the repo so the linter never drifts from the site.
function loadCanon(repo) {
  const out = { byLabel: new Map(), loaded: false, catalogSlugs: new Set() }
  for (const c of CANON) out.byLabel.set(c.toLowerCase(), c)
  if (!repo) return out
  try {
    const data = JSON.parse(fs.readFileSync(path.join(repo, 'src/data/virtues.json'), 'utf8'))
    const bySlug = new Map(data.map((v) => [v.slug, v.title]))
    for (const v of data) if (v.alternateName) out.byLabel.set(v.alternateName.toLowerCase(), v.title)
    const libDir = path.join(repo, 'src/lib')
    const decl = /SUB_VIRTUE_TO_CANON_SLUG[^=]*=\s*\{([\s\S]*?)\}/
    const block = fs.readdirSync(libDir).filter((n) => n.endsWith('.ts'))
      .map((n) => fs.readFileSync(path.join(libDir, n), 'utf8').match(decl)).find(Boolean)
    if (block) {
      for (const m of block[1].matchAll(/['"]?([a-z][a-z -]*)['"]?\s*:\s*['"]([a-z]+)['"]/g)) {
        if (bySlug.has(m[2])) out.byLabel.set(m[1].trim(), bySlug.get(m[2]))
      }
    }
    out.loaded = true
  } catch { /* canon files unavailable: fall back to canon titles only */ }
  try {
    const raw = fs.readFileSync(path.join(repo, 'backups/basehub/latest.json'), 'utf8')
    for (const m of raw.matchAll(/"_slug"\s*:\s*"([^"]+)"/g)) out.catalogSlugs.add(m[1])
  } catch { /* no catalog snapshot */ }
  return out
}

function parseDraft(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  if (lines[0] !== '---') throw new Error('frontmatter must open with --- on line 1')
  const end = lines.indexOf('---', 1)
  if (end === -1) throw new Error('frontmatter has no closing --- line')
  const fields = {}
  const fieldLine = {}
  const problems = []
  for (let i = 1; i < end; i++) {
    const line = lines[i]
    if (!line.trim()) continue
    const m = line.match(/^([A-Za-z][A-Za-z0-9]*):(?:\s(.*))?$/)
    if (!m) { problems.push({ rule: 'frontmatter-syntax', message: `cannot parse "${line}"`, line: i + 1 }); continue }
    const [, key, rawValue = ''] = m
    let value = rawValue.trim()
    if (value.startsWith('"')) {
      try { value = JSON.parse(value) } catch {
        problems.push({ rule: 'frontmatter-syntax', message: `${key}: value is not a valid double-quoted string`, line: i + 1 })
      }
    } else {
      problems.push({ rule: 'frontmatter-unquoted', message: `${key}: write the value as a double-quoted string`, line: i + 1, warn: true })
    }
    if (key in fields) problems.push({ rule: 'frontmatter-duplicate', message: `duplicate key ${key}`, line: i + 1 })
    fields[key] = value
    fieldLine[key] = i + 1
  }
  const bodyLines = lines.slice(end + 1).map((t, idx) => ({ text: t, line: end + 2 + idx }))
  return { fields, fieldLine, bodyLines, problems, keyOrder: Object.keys(fieldLine) }
}

function paragraphsOf(bodyLines) {
  const paras = []
  let cur = null
  for (const l of bodyLines) {
    if (!l.text.trim()) { cur = null; continue }
    if (!cur) { cur = { line: l.line, text: l.text.trim() }; paras.push(cur) } else cur.text += ' ' + l.text.trim()
  }
  return paras
}

const words = (s) => s.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w))
const plain = (s) => s.replace(/[*_`]/g, '')
function sentencesOf(text) {
  return plain(text)
    .split(/(?<=[.!?][”"’')]*)\s+(?=[“"‘(]*[\p{Lu}\d])/u)
    .map((s) => s.trim())
    .filter(Boolean)
}
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const phraseRe = (p) => new RegExp(`(?<![\\p{L}])${esc(p)}(?![\\p{L}])`, 'iu')
const snippet = (s, i, n = 30) => s.slice(Math.max(0, i - n), i + n).replace(/\s+/g, ' ')

function lintFile(file, opts, phrases, canon, corpus) {
  const errors = []
  const warnings = []
  const add = (p) => (p.warn ? warnings : errors).push({ rule: p.rule, message: p.message, ...(p.line ? { line: p.line } : {}) })
  const err = (rule, message, line) => add({ rule, message, line })
  const warn = (rule, message, line) => add({ rule, message, line, warn: true })

  const draft = parseDraft(fs.readFileSync(file, 'utf8'))
  draft.problems.forEach(add)
  const f = draft.fields
  const L = draft.fieldLine

  // Fields present, non-empty, nothing extra, contract order.
  for (const k of KEYS) {
    if (!(k in f)) { if (!OPTIONAL.has(k)) err('field-missing', `missing frontmatter key ${k}`) }
    else if (!MAY_BE_EMPTY.has(k) && !String(f[k]).trim()) err('field-empty', `${k} is empty`, L[k])
  }
  for (const k of Object.keys(f)) if (!KEYS.includes(k)) err('field-unknown', `unknown key ${k} (see content/story-format.md)`, L[k])
  const order = draft.keyOrder.filter((k) => KEYS.includes(k))
  if (order.join() !== KEYS.filter((k) => k in f).join()) warn('field-order', `keys should follow the contract order: ${KEYS.join(', ')}`)

  const body = draft.bodyLines
  const paras = paragraphsOf(body)
  const bodyText = paras.map((p) => p.text).join('\n\n')

  // Dashes: banned glyphs and dash substitutes in every reader-facing value.
  const DASH = /[‒–—―]/
  const FAKE_DASH = /(\S--\S|\s--\s|\s-\s)/
  for (const k of PROSE_FIELDS) {
    const v = f[k] ?? ''
    if (DASH.test(v)) err('dash-glyph', `${k} contains an em/en dash: "${snippet(v, v.search(DASH))}"`, L[k])
    if (FAKE_DASH.test(v)) err('dash-substitute', `${k} uses a hyphen as a dash: "${snippet(v, v.search(FAKE_DASH))}"`, L[k])
  }
  for (const l of body) {
    if (DASH.test(l.text)) err('dash-glyph', `body contains an em/en dash: "${snippet(l.text, l.text.search(DASH))}"`, l.line)
    if (FAKE_DASH.test(l.text) && !/^\s*-\s/.test(l.text)) err('dash-substitute', `body uses a hyphen as a dash: "${snippet(l.text, l.text.search(FAKE_DASH))}"`, l.line)
  }

  // Body is narrative only.
  if (!paras.length) err('body-empty', 'story body is empty')
  for (const l of body) {
    const t = l.text
    if (/^\s{0,3}#{1,6}\s/.test(t)) err('body-heading', `heading in body: "${t.trim()}"`, l.line)
    if (/^\s*([*_-])(\s*\1){2,}\s*$/.test(t)) err('body-separator', `separator in body: "${t.trim()}"`, l.line)
    else if (/^\s*([-*+]|\d+[.)])\s+/.test(t)) err('body-list', 'list item in body', l.line)
    if (/^\s*>/.test(t)) err('body-blockquote', 'block quote in body', l.line)
    if (/!\[/.test(t)) err('body-image', 'image in body', l.line)
    if (/\[[^\]]*\]\([^)]*\)|https?:\/\/|www\./i.test(t)) err('body-link', 'link or URL in body', l.line)
    if (/<\/?[a-z][^>]*>/i.test(t)) err('body-html', 'HTML in body', l.line)
    if (/\[\^/.test(t)) err('body-footnote', 'footnote in body', l.line)
    if (/^\s*(\*\*|__)?\s*(the\s+)?moral\s*[:.]/i.test(t)) err('body-moral', 'moral line in body; it belongs in virtueDescription', l.line)
    if (/^\s*(source|from|retold from)\s*:/i.test(t)) err('body-source', 'source note in body; it belongs in source', l.line)
  }

  // Length: 350-650 by default; a brief-approved exception is read from the sidecar
  // brief's "- Target length: <min>-<max>" line, and CLI flags override both.
  const briefFile = path.join(path.dirname(file), path.basename(file, '.md'), 'brief.md')
  const briefRange = fs.existsSync(briefFile) ? fs.readFileSync(briefFile, 'utf8').match(/^- Target length:\s*(\d+)\s*(?:-|to)\s*(\d+)/m) : null
  const minWords = opts.minWords ?? (briefRange ? Number(briefRange[1]) : 350)
  const maxWords = opts.maxWords ?? (briefRange ? Number(briefRange[2]) : 650)
  const lengthFrom = opts.minWords ?? opts.maxWords ? 'flags' : briefRange ? 'brief' : 'default'
  const wordCount = words(plain(bodyText)).length
  if (paras.length && (wordCount < minWords || wordCount > maxWords)) {
    err('word-count', `body is ${wordCount} words; target ${minWords}-${maxWords} (${lengthFrom}). An exception needs a reason in the brief's "- Target length:" line`)
  }
  if (lengthFrom !== 'default' && (minWords !== 350 || maxWords !== 650)) warn('length-exception', `length target ${minWords}-${maxWords} from ${lengthFrom}; the editor must confirm the brief's reason`)

  // Banned phrases.
  const scan = { title: f.title ?? '', summary: f.summary ?? '', dek: f.dek ?? '', virtueDescription: f.virtueDescription ?? '', imageAlt: f.imageAlt ?? '' }
  for (const [level, list] of [['error', phrases.error], ['warn', phrases.warn]]) {
    for (const p of list) {
      const re = phraseRe(p.phrase)
      for (const field of p.fields ?? DEFAULT_PHRASE_FIELDS) {
        if (field === 'body') {
          for (const l of body) if (re.test(l.text)) add({ rule: level === 'error' ? 'banned-phrase' : 'drift-phrase', message: `"${p.phrase}" in body (${p.why})`, line: l.line, warn: level === 'warn' })
        } else if (re.test(scan[field] ?? '')) {
          add({ rule: level === 'error' ? 'banned-phrase' : 'drift-phrase', message: `"${p.phrase}" in ${field} (${p.why})`, line: L[field], warn: level === 'warn' })
        }
      }
    }
  }

  // Virtue named before shown, too often, or as a closing moral. Only the narrator's
  // labels count: a word inside quoted speech, or in a phrase the governing text
  // itself uses (--source, or content/drafts/<slug>/source.txt), is attested.
  const vRe = new RegExp(`(?<![\\p{L}-])(${VIRTUE_WORDS.map(esc).join('|')})(?![\\p{L}-])`, 'giu')
  const sourceFile = opts.source ?? path.join(path.dirname(file), path.basename(file, '.md'), 'source.txt')
  const sourceText = fs.existsSync(sourceFile) ? normSource(fs.readFileSync(sourceFile, 'utf8')) : null
  const inQuotes = (text, idx) => ((text.slice(0, idx).match(/["“”]/g) ?? []).length % 2) === 1
  const attestedBySource = (text, idx, word) => {
    if (!sourceText) return false
    const before = text.slice(0, idx).toLowerCase().match(/([\p{L}']+)[^\p{L}']*$/u)?.[1]
    const after = text.slice(idx + word.length).toLowerCase().match(/^[^\p{L}']*([\p{L}']+)/u)?.[1]
    const w = word.toLowerCase()
    return (before && sourceText.includes(` ${before} ${w} `)) || (after && sourceText.includes(` ${w} ${after} `))
  }
  const hits = []
  const attested = []
  paras.forEach((p, i) => {
    const t = plain(p.text)
    for (const m of t.matchAll(vRe)) {
      const h = { word: m[1], para: i, line: p.line }
      if (m[1].toLowerCase() === 'hope') {
        // "I hope that...", "to hope", "they hope": a verb, not a label.
        const prev = t.slice(0, m.index).toLowerCase().match(/([\p{L}']+)[^\p{L}']*$/u)?.[1]
        const next = t.slice(m.index + 4).toLowerCase().match(/^[^\p{L}']*([\p{L}']+)/u)?.[1]
        if (['i', 'we', 'they', 'you', 'he', 'she', 'to', 'did', 'do', 'could', 'would'].includes(prev) || ['that', 'to', 'for', 'so'].includes(next)) continue
      }
      if (inQuotes(t, m.index)) attested.push({ ...h, why: 'speech' })
      // Source phrasing excuses later paragraphs only: paragraph one is the narrator's.
      else if (i > 0 && attestedBySource(t, m.index, m[1])) attested.push({ ...h, why: 'source' })
      else hits.push(h)
    }
  })
  if (attested.length) warn('virtue-attested', `virtue words in quoted speech or source phrasing (${attested.map((a) => `${a.word}: ${a.why}`).join(', ')}); fine when the source says it, but check none is the narrator's moral`)
  if (hits.length) {
    const list = hits.map((h) => h.word).join(', ')
    if (hits.length > 2) err('virtue-label-repeat', `narrator names a virtue ${hits.length} times (${list}); default is one named moment, at or after the decisive act`)
    else if (hits.length === 2) warn('virtue-label-repeat', `narrator names a virtue twice (${list}); keep one unless each does distinct narrative work`)
    const first = hits.find((h) => h.para === 0)
    if (first) err('virtue-named-early', `virtue named in the first paragraph ("${first.word}") before the action shows it`, first.line)
    const last = hits.find((h) => h.para === paras.length - 1 && paras.length > 1)
    if (last) warn('virtue-in-ending', `virtue named in the final paragraph ("${last.word}"); end on the action`, last.line)
  }
  if (paras.length > 1) {
    const end = paras[paras.length - 1]
    for (const [re, label] of MORAL_ENDING) if (re.test(end.text)) err('moral-ending', `final paragraph explains the lesson ("${label}"); move reflection to virtueDescription`, end.line)
  }

  // Rhythm and diction smells.
  const sentences = paras.flatMap((p) => sentencesOf(p.text).map((s) => ({ s, n: words(s).length, line: p.line })))
  for (const x of sentences) if (x.n > 40) warn('long-sentence', `${x.n}-word sentence is hard to read aloud in one breath: "${x.s.slice(0, 60)}..."`, x.line)
  for (let i = 2; i < sentences.length; i++) {
    if ([0, 1, 2].every((k) => sentences[i - k].n >= 25)) { warn('sentence-monotony', `three consecutive sentences of 25+ words near "${sentences[i - 2].s.slice(0, 40)}..."; break one into short beats`, sentences[i - 2].line); i += 2 }
  }
  const allWords = words(plain(bodyText)).map((w) => w.toLowerCase().replace(/[^\p{L}-]/gu, ''))
  const adverbs = allWords.filter((w) => w.length > 3 && w.endsWith('ly') && !LY_NOT_ADVERBS.has(w))
  const lyRate = wordCount ? (adverbs.length * 100) / wordCount : 0
  if (lyRate > 1.5) warn('adverb-density', `${adverbs.length} -ly adverbs (${lyRate.toFixed(1)} per 100 words; aim for 1.5 or fewer): ${[...new Set(adverbs)].join(', ')}`)
  const evaluative = allWords.filter((w) => EVALUATIVE.has(w))
  const evRate = wordCount ? (evaluative.length * 100) / wordCount : 0
  if (evRate > 2) warn('modifier-density', `${evaluative.length} evaluative adjectives (${evRate.toFixed(1)} per 100 words; aim for 2 or fewer): ${[...new Set(evaluative)].join(', ')}`)
  const bookism = new RegExp(`[”"]\\s*,?\\s*(?:[\\p{L}]+\\s+){0,2}(${SAID_BOOKISMS.join('|')})\\b`, 'iu')
  const adverbTag = /\b(said|asked|replied|answered|whispered|called)\s+(\w+ly)\b/i
  for (const l of body) {
    const b = l.text.match(bookism)
    if (b) warn('dialogue-tag', `"${b[1]}" as a dialogue tag; "said" or an action beat reads aloud cleaner`, l.line)
    const a = l.text.match(adverbTag)
    if (a && !LY_NOT_ADVERBS.has(a[2].toLowerCase())) warn('dialogue-tag', `"${a[0]}": let the line or a gesture carry the tone`, l.line)
  }
  const firstWord = (x) => (words(x.s)[0] ?? '').toLowerCase().replace(/[^\p{L}']/gu, '')
  for (let i = 0; i < sentences.length; i++) {
    let j = i
    while (j + 1 < sentences.length && sentences[j + 1].n < 8 && sentences[i].n < 8 && firstWord(sentences[j + 1]) === firstWord(sentences[i])) j++
    if (j - i + 1 >= 4) { warn('staccato-run', `${j - i + 1} short sentences in a row all starting "${firstWord(sentences[i])}" near "${sentences[i].s}"; vary the shape`, sentences[i].line); i = j }
  }
  for (const x of refrainsOf(sentences.map((y) => y.s))) warn('doubled-negative', `doubled negative refrain "${x}"; strong once in a catalog, a habit after that (craft.md §12)`, sentences.find((y) => y.s === x)?.line)

  // Paragraph one: an actor acts early, and something can go wrong by its end.
  if (paras.length) {
    const p1 = sentencesOf(paras[0].text)
    const startsWithActor = (x) => {
      const w = words(x).map((t) => t.replace(/[^\p{L}']/gu, ''))
      const lw = (w[0] ?? '').toLowerCase()
      if (['he', 'she', 'they', 'i', 'we'].includes(lw)) return true
      if (lw === 'the' || lw === 'a' || lw === 'an') return ACTOR_NOUNS.has((w[1] ?? '').toLowerCase())
      // "Atri is a little town": a place being described, not an actor acting.
      if (['is', 'was', 'lies', 'lay', 'stands', 'stood'].includes((w[1] ?? '').toLowerCase()) && ['a', 'an', 'the'].includes((w[2] ?? '').toLowerCase())) return false
      return /^\p{Lu}/u.test(w[0] ?? '') && !NOT_ACTOR_OPENERS.has(lw)
    }
    if (!p1.slice(0, 2).some(startsWithActor)) warn('opening-no-actor', `neither of the first two sentences starts with a person or creature acting ("${p1[0]}"); name the actor and let them act (heuristic)`, paras[0].line)
    const p1Words = words(paras[0].text).length
    if (p1Words > 110) warn('opening-long', `paragraph one is ${p1Words} words; pressure should arrive sooner (heuristic)`, paras[0].line)
    const p1Lower = ' ' + paras[0].text.toLowerCase().replace(/[^\p{L}\s']/gu, ' ') + ' '
    if (!PRESSURE_CUES.some((c) => p1Lower.includes(` ${c} `))) warn('opening-no-pressure', 'paragraph one has no sign of anything that could go wrong (heuristic; writing.md requires visible moral pressure by its end)', paras[0].line)
  }

  // Habits inside this story, then shared with other drafts and catalog stories.
  const shape = shapeOf(paras.map((p) => p.text), sourceText)
  if (shape) {
    if (shape.openers >= 3) warn('pet-openers', `${shape.openers} paragraphs open on "So" or "Then"; that is the scripture register's habit, keep it to two (craft.md §12)`)
    if (shape.echo) warn('invented-echo', `"${shape.echo}" is planted in the first paragraphs and returned at the close, and the governing text does not make that echo; a callback of your own is a device (craft.md §12)`)
    if (shape.souvenirs.length >= 2) warn('archaism-souvenirs', `archaisms in narration outside quoted speech (${shape.souvenirs.join(', ')}); keep the source's refrain, not a sprinkle around it (craft.md §12)`)
  }
  if (shape && opts.habits && corpus) {
    const self = path.resolve(file)
    for (const other of corpus) {
      if (other.file === self || other.slug === f.slug) continue
      const o = shapeOf(other.paras, other.source)
      if (!o) continue
      const same = []
      if (o.cadence === 'and-chain' && shape.cadence === 'and-chain') same.push('a last sentence that is one long "and" chain')
      const g = shape.gestures.filter((x) => o.gestures.includes(x))
      if (g.length) same.push(`an ending gesture (${g.join(', ')})`)
      const sim = rhythmSimilarity(shape.hist, o.hist)
      if (sim >= 0.85) same.push(`sentence-length spread (${Math.round(sim * 100)}% alike)`)
      if (o.perfectOpening && shape.perfectOpening) same.push('a past-perfect backstory opening')
      if (o.openersShare >= 0.2 && shape.openersShare >= 0.2) same.push('So/Then paragraph openers')
      if (o.souvenirs.length >= 2 && shape.souvenirs.length >= 2) same.push('archaism souvenirs')
      if (o.echo && shape.echo) same.push('an invented closing echo')
      if (o.refrain && shape.refrain) same.push('a doubled-negative refrain')
      if (same.length >= 3) warn('house-tic', `sounds like ${other.id}: shares ${same.join('; ')}. Vary at least one before a reader hears one hand (craft.md §12)`)
    }
  }

  // Field contract details.
  const title = f.title ?? ''
  if (/[:|]/.test(title)) err('title-subtitle', 'title carries a subtitle or separator', L.title)
  if (title.length > 50) warn('title-length', `title is ${title.length} characters; anthology titles are short`, L.title)

  const slug = f.slug ?? ''
  if (slug && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) err('slug-format', `slug "${slug}" must be lowercase words joined by single hyphens`, L.slug)
  const base = path.basename(file, '.md')
  if (slug && base !== slug) err('slug-filename', `file name "${base}.md" must equal the slug "${slug}.md"`, L.slug)
  if (slug && canon.catalogSlugs.has(slug)) warn('slug-in-catalog', `slug "${slug}" already exists in backups/basehub/latest.json; fine only when revising that story`, L.slug)

  const cv = f.canonicalVirtue ?? ''
  if (cv && !CANON.includes(cv)) err('canon-virtue', `canonicalVirtue "${cv}" must be one of ${CANON.join(', ')}`, L.canonicalVirtue)
  const sub = (f.subVirtue ?? '').trim()
  const virtue = (f.virtue ?? '').trim()
  if (virtue && cv && virtue.toLowerCase() !== cv.toLowerCase() && virtue.toLowerCase() !== sub.toLowerCase()) {
    err('virtue-label', `virtue "${virtue}" must equal canonicalVirtue ("${cv}") or the capitalized subVirtue`, L.virtue)
  }
  if (sub) {
    if (sub !== sub.toLowerCase()) warn('subvirtue-case', 'subVirtue is a lowercase angle, e.g. "mercy"', L.subVirtue)
    const resolved = canon.byLabel.get(sub.toLowerCase())
    if (!resolved) err('subvirtue-orphan', `subVirtue "${sub}" resolves to no canon virtue; add it to SUB_VIRTUE_TO_CANON_SLUG in src/lib (engineering) or use virtue "${cv}"${canon.loaded ? '' : ' (canon files not found; pass --repo)'}`, L.subVirtue)
    else if (cv && resolved !== cv) err('subvirtue-mapping', `subVirtue "${sub}" resolves to ${resolved}, not ${cv}`, L.subVirtue)
  }

  const summary = f.summary ?? ''
  if (summary) {
    const n = summary.length
    if (n < 100 || n > 170) err('summary-length', `summary is ${n} characters; meta descriptions want 120-160`, L.summary)
    else if (n < 120 || n > 160) warn('summary-length', `summary is ${n} characters; aim for 120-160`, L.summary)
    if (!/[.!?]["”’]?$/.test(summary)) warn('summary-punctuation', 'summary should end as a full sentence', L.summary)
  }

  // dek: optional standfirst, 80-160 characters when present; never a copy of the summary.
  const dek = (f.dek ?? '').trim()
  if (dek) {
    if (dek.length < 80 || dek.length > 160) err('dek-length', `dek is ${dek.length} characters; the standfirst runs 80-160`, L.dek)
    if (dek === (f.summary ?? '').trim()) warn('dek-summary', 'dek repeats the summary; leave it empty to fall back, or write it for the reader already at the story', L.dek)
  }
  const vd = f.virtueDescription ?? ''
  if (vd) {
    const n = words(vd).length
    if (n < 12 || n > 90) err('reflection-length', `virtueDescription is ${n} words; one short reflection runs 20-60`, L.virtueDescription)
    else if (n > 60) warn('reflection-length', `virtueDescription is ${n} words; past 60 it turns into a homily`, L.virtueDescription)
    if (/^\s*(the moral|this story|in this story|the lesson|this tale)\b/i.test(vd)) err('reflection-opening', 'virtueDescription opens by announcing the moral', L.virtueDescription)
  }

  const alt = f.imageAlt ?? ''
  if (alt) {
    if (/^illustration for\b/i.test(alt)) err('alt-text', 'imageAlt is the generic fallback', L.imageAlt)
    if (alt.length < 20 || alt.length > 300) err('alt-text', `imageAlt is ${alt.length} characters; describe the scene in 40-200`, L.imageAlt)
    else if (alt.length < 40 || alt.length > 200) warn('alt-text', `imageAlt is ${alt.length} characters; aim for 40-200`, L.imageAlt)
    if (/^(an?\s+)?(image|picture|illustration|painting|photo)\s+(of|for|showing)\b/i.test(alt)) warn('alt-text', 'imageAlt should describe the scene, not announce that it is an image', L.imageAlt)
  }

  const prompt = f.imagePrompt ?? ''
  if (prompt) {
    if (!/\boil\b/i.test(prompt)) warn('image-prompt-style', 'imagePrompt should name the house style (classical oil painting)', L.imagePrompt)
    if (!/3:2|landscape/i.test(prompt)) warn('image-prompt-format', 'imagePrompt should ask for a 3:2 landscape composition', L.imagePrompt)
  }

  const source = f.source ?? ''
  if (/https?:\/\/|www\./i.test(source)) err('source-url', 'source renders as plain text; drop the URL', L.source)
  if (source.length > 120) warn('source-length', 'source is an attribution, not a citation; keep it short', L.source)

  const audio = f.audio ?? ''
  if (audio && !['none', 'planned', 'human'].includes(audio) && !/^https:\/\/\S+$/.test(audio)) err('audio-value', 'audio must be "none", "planned", "human", or an https URL', L.audio)

  const quotedShare = wordCount ? words((plain(bodyText).match(/[“"][^”"]*[”"]/g) ?? []).join(' ')).length / wordCount : 0
  if (quotedShare > 0.4) warn('dialogue-share', `${Math.round(quotedShare * 100)}% of the body is quoted speech; craft.md §5 keeps dialogue under about a third, with room for attested speeches`)
  const quoted = (plain(bodyText).match(/[“"][^”"]*[”"]/g) ?? []).join(' ')
  const stats = {
    words: wordCount,
    lengthTarget: `${minWords}-${maxWords} (${lengthFrom})`,
    paragraphs: paras.length,
    sentences: sentences.length,
    avgSentence: sentences.length ? +(wordCount / sentences.length).toFixed(1) : 0,
    longestSentence: sentences.reduce((m, x) => Math.max(m, x.n), 0),
    lyPer100: +lyRate.toFixed(2),
    evaluativePer100: +evRate.toFixed(2),
    dialogueShare: wordCount ? +(words(quoted).length / wordCount).toFixed(2) : 0,
    virtueLabels: hits.map((h) => h.word),
    attestedVirtueWords: attested.map((h) => h.word),
    firstSentence: shape?.firstText ?? '',
    lastSentence: shape?.lastText ?? '',
    shape: shape ? { cadence: shape.cadence, gestures: shape.gestures, perfectOpening: shape.perfectOpening, openers: shape.openers, souvenirs: shape.souvenirs, echo: shape.echo, refrain: shape.refrain, rhythm: shape.hist.map((x) => +x.toFixed(2)) } : null,
    readAloudMinutes: +(wordCount / 150).toFixed(1),
    summaryChars: summary.length,
  }
  return { file, ok: errors.length === 0, errors, warnings, stats }
}

function printReport(r) {
  const out = []
  out.push(`${r.file}`)
  out.push(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.errors.length} error(s), ${r.warnings.length} warning(s)`)
  const fmt = (lvl, p) => `  ${lvl.padEnd(5)} ${p.rule.padEnd(22)} ${p.line ? `line ${String(p.line).padEnd(4)}` : '         '} ${p.message}`
  r.errors.forEach((p) => out.push(fmt('error', p)))
  r.warnings.forEach((p) => out.push(fmt('warn', p)))
  const s = r.stats
  if (s) {
    out.push(`  stats words ${s.words} (target ${s.lengthTarget}) · paragraphs ${s.paragraphs} · sentences ${s.sentences} · avg ${s.avgSentence} · longest ${s.longestSentence}`)
    out.push(`        shape close [${s.shape?.cadence}] gestures [${s.shape?.gestures.join(', ')}] rhythm [${s.shape?.rhythm.join(' ')}] So/Then ${s.shape?.openers} · past-perfect open ${s.shape?.perfectOpening ? 'yes' : 'no'} · echo [${s.shape?.echo ?? 'none'}]`)
    out.push(`        -ly ${s.lyPer100}/100 · evaluative ${s.evaluativePer100}/100 · dialogue ${Math.round(s.dialogueShare * 100)}% · virtue labels [${s.virtueLabels.join(', ')}] · summary ${s.summaryChars} chars · ~${s.readAloudMinutes} min aloud`)
  }
  return out.join('\n')
}

const opts = parseArgs(process.argv.slice(2))
if (opts.help || !opts.files.length) {
  console.error('usage: node lint-story.mjs [--json] [--min-words N] [--max-words N] [--repo DIR] [--source FILE] [--drafts DIR] [--no-catalog] [--no-habits] <draft.md>...')
  process.exit(opts.help ? 0 : 2)
}
const phrases = JSON.parse(fs.readFileSync(path.join(HERE, 'banned-phrases.json'), 'utf8'))
const repo = opts.repo ?? findRepo(process.cwd()) ?? findRepo(HERE)
const canon = loadCanon(repo)
const corpus = opts.habits ? loadCorpus(repo, opts) : null
let fatal = false
// Briefs and gate notes sit beside drafts (content/story-format.md); skip them so a glob works.
const skipped = opts.files.filter((f) => /\.[a-z]+\.md$/.test(path.basename(f)))
opts.files = opts.files.filter((f) => !skipped.includes(f))
if (skipped.length && !opts.json) console.error(`skipped ${skipped.length} non-draft file(s): ${skipped.join(', ')}`)
const results = opts.files.map((file) => {
  try { return lintFile(file, opts, phrases, canon, corpus) } catch (e) {
    fatal = true
    return { file, ok: false, errors: [{ rule: 'unreadable', message: e.message }], warnings: [], stats: null }
  }
})
if (opts.json) console.log(JSON.stringify({ files: results }, null, 2))
else console.log(results.map((r) => printReport(r, opts)).join('\n\n'))
process.exit(fatal ? 2 : results.every((r) => r.ok) ? 0 : 1)
