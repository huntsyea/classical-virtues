// story:selftest: regression tests for the story and narration pipeline.
//
//   pnpm story:selftest
//
// Runs with no network (fetch is replaced by a counter that throws, and child
// processes get the same preload) against a scratch drafts directory holding a
// self-contained fixture story; it never reads or writes content/drafts,
// Basehub, or Blob. Covers:
//   - every `pnpm story:*` / `pnpm audio:*` named in content/pipeline.md, the
//     pipeline skill and the scripts exists in package.json, and every script
//     answers --help without side effects; strict flags (--yes=false, unknown)
//   - dash spellings (glyphs, &mdash;, &#8212;, &#x2014;, Unicode variants) in
//     every reader-facing field, related-reading paragraphs, body links
//   - gate-note parsing: kill rounds in seven heading styles, newest-first
//     order, duplicate rounds, heading/Verdict conflicts, missing sign-off,
//     wrong draft, stale hash; SEO note sign-off and hash
//   - files over records: swapped or wrong-size illustration, swapped or
//     mistagged MP3, forged state.json records, approval binding to bytes
//   - payload validation: placeholder and foreign-host asset URLs, migrated
//     Basehub fields required when the live schema has them
//   - remote-target allowlist (lookalike Vercel previews refused), audio:upload
//     guards, story:status surviving stray files, transcript WER math
// Exit 0 when every case passes.

import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { spawnSync, execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const scratch = mkdtempSync(join(tmpdir(), 'cv-selftest-'))
const drafts = join(scratch, 'drafts')
mkdirSync(drafts)

// --- isolation: no network, scratch drafts, deterministic linter ----------
let networkCalls = 0
globalThis.fetch = async (url) => {
  networkCalls++
  throw new Error(`selftest: network disabled (${url})`)
}
const preload = join(scratch, 'offline.mjs')
writeFileSync(preload, "globalThis.fetch = async (u) => { throw new Error('selftest child: network disabled ' + u) }\n")
Object.assign(process.env, {
  STORY_DRAFTS_DIR: drafts,
  STORY_OFFLINE: '1',
  STORY_LINTER: 'builtin',
  STORY_ACTOR: 'selftest',
  BLOB_READ_WRITE_TOKEN: 'vercel_blob_rw_SELFTESTSTORE_notasecret',
  REHEARSAL_VOICE_FILE: '',
})
// Run as a plain shell regardless of who launched the self-test; cases that
// need an agent session set it explicitly.
for (const k of Object.keys(process.env)) if (k === 'BB_THREAD_ID' || k === 'CLAUDECODE' || k === 'CLAUDE_CODE_ENTRYPOINT' || k.startsWith('CODEX_')) delete process.env[k]
delete process.env.BASEHUB_TOKEN
delete process.env.BASEHUB_ADMIN_TOKEN
delete process.env.OPENAI_API_KEY
delete process.env.ELEVENLABS_API_KEY
const childEnv = { ...process.env, NODE_OPTIONS: `--import ${preload}` }

const { loadDraft, writeStage, readState, sha256, draftPaths } = await import('./lib/draft.mjs')
const { contractChecks, readGateNote, readSeoNote, hasDash } = await import('./lib/checks.mjs')
const { runCheck } = await import('./check.mjs')
const { reservedSlugs } = await import('./lib/checks.mjs')
const { storyBodyHtml, compareWords, renderedDekText } = await import('./verify.mjs')
const { seoChecks } = await import('./seo.mjs')
const { verifyAsset } = await import('./lib/basehub-publish.mjs')
const { lineDiff } = await import('./publish.mjs')
const { runImage } = await import('./image.mjs')
const { runAudio } = await import('./audio.mjs')
const { imageArtifact, audioArtifact, approvalProblems } = await import('./lib/artifacts.mjs')
const { validateOperation, storyOperation, allowedAssetHost } = await import('./lib/basehub-publish.mjs')
const { siteTarget } = await import('./lib/draft.mjs')
const { wer, compareTranscript } = await import('../audio/lib/transcript.mjs')

// --- tiny harness ----------------------------------------------------------
const results = []
async function test(name, fn) {
  const log = console.log
  const warn = console.warn
  console.log = () => {}
  console.warn = () => {}
  try {
    await fn()
    results.push([true, name])
  } catch (err) {
    results.push([false, name, err.message.split('\n')[0]])
  } finally {
    console.log = log
    console.warn = warn
  }
}
const assert = (cond, msg) => {
  if (!cond) throw new Error(msg)
}
const throws = async (fn, re, msg) => {
  try {
    await fn()
  } catch (err) {
    if (re && !re.test(err.message)) throw new Error(`${msg}: threw "${err.message.slice(0, 120)}"`)
    return
  }
  throw new Error(`${msg}: did not throw`)
}

// --- fixture story -----------------------------------------------------------
const SLUG = 'selftest-lion-and-mouse'
const BODY = `A lion lay asleep in the heat of the afternoon, his great head on his paws. A small mouse ran across his nose, and the lion woke and caught her under one heavy paw.

The mouse did not struggle. She begged him to let her go, and promised that one day she would help him in return. The lion laughed at the thought of a mouse helping a lion. Still, he lifted his paw, and she ran away into the grass.

Some days later the lion walked into a hunter's net. The ropes pulled tight around him, and the more he fought, the tighter they held. His roar rolled across the plain.

The mouse heard it and came running. She found the rope that held the knot and began to gnaw. It took her a long time. At last the rope parted, the net fell open, and the lion stepped out free.

He looked down at the mouse for a long moment. Then he lay down beside her in the grass.
`
const FIELDS = {
  title: 'The Lion and the Mouse',
  slug: SLUG,
  virtue: 'Mercy',
  canonicalVirtue: 'Charity',
  subVirtue: 'mercy',
  summary: 'A sleeping lion catches a small mouse under his paw, laughs at her promise to repay him, and lets her go. Days later he walks into a net.',
  virtueDescription: 'Mercy costs the strong very little and can mean everything to the weak. The lion let the mouse go expecting nothing, and that small kindness came back to free him.',
  source: "From Aesop's Fables",
  imageAlt: 'A small brown mouse gnawing through a thick rope net that holds a lion lying in tall dry grass at dusk.',
  imagePrompt: 'A mouse gnawing a rope net that holds a lion, tall dry grass, dusk light from the left.',
  audio: 'human',
}
const draftText = (fields = FIELDS, body = BODY) =>
  `---\n${Object.entries(fields).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n')}\n---\n\n${body}`
const paths = draftPaths(SLUG)
const writeDraft = (text) => writeFileSync(paths.draft, text)
const hashOf = (text) => createHash('sha256').update(text).digest('hex')
const gateNote = (hash, round = '## Round 1: publish (2026-10-13, selftest reviewer)', extra = '') => `# Gate: The Lion and the Mouse (\`${SLUG}\`)

- Draft: content/drafts/${SLUG}.md
- Exemplars: Androcles and the Lion, David and Mephibosheth (selftest)

${round}

- Draft sha256: ${hash}
- Sign-off: Selftest Editor, 2026-10-13
${extra}`
const seoNote = (hash, signOff = 'Selftest Owner, 2026-10-13') => `# SEO QA

- Draft: content/drafts/${SLUG}.md
- Draft sha256: ${hash}
- Run by: selftest via story:seo
- Verdict: clear
- Owner: Selftest Owner
- Owner sign-off: ${signOff}
`
function writeCleanStory() {
  const text = draftText()
  writeDraft(text)
  writeFileSync(paths.gate, gateNote(hashOf(text)))
  writeFileSync(paths.seo, seoNote(hashOf(text)))
  return text
}

// --- 1. commands exist and parse strictly -----------------------------------
const pkg = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8'))
await test('every documented pnpm story:/audio: command is a package.json script', () => {
  const sources = [join(REPO, 'content', 'pipeline.md'), join(REPO, '.claude', 'skills', 'virtue-story-pipeline', 'SKILL.md')]
  for (const dir of ['story', 'audio']) {
    const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : e.name.endsWith('.mjs') ? [join(d, e.name)] : []))
    sources.push(...walk(join(REPO, 'scripts', dir)))
  }
  const missing = new Set()
  for (const file of sources) {
    for (const m of readFileSync(file, 'utf8').matchAll(/pnpm (?:run )?((?:story|audio):[a-z-]+)/g)) if (!pkg.scripts[m[1]]) missing.add(`${m[1]} (${file.replace(REPO + '/', '')})`)
  }
  assert(!missing.size, `missing: ${[...missing].join(', ')}`)
})
await test('every story:/audio: script answers --help, exit 0, no network', () => {
  for (const [name, cmd] of Object.entries(pkg.scripts).filter(([k]) => /^(story|audio):/.test(k))) {
    if (name === 'story:selftest') continue
    const file = cmd.match(/scripts\/\S+\.mjs/)[0]
    const r = spawnSync(process.execPath, [join(REPO, file), '--help'], { env: childEnv, encoding: 'utf8', timeout: 30_000 })
    assert(r.status === 0 && r.stdout.includes(name.split(':')[1]), `${name} --help exited ${r.status}`)
  }
})
await test('strict flags: --yes=false and unknown flags are refused', () => {
  const run = (args) => spawnSync(process.execPath, [join(REPO, 'scripts/story/revalidate.mjs'), ...args], { env: childEnv, encoding: 'utf8' })
  assert(run(['--base-url', 'https://www.classicalvirtues.com', '--yes=false']).status === 1, '--yes=false accepted')
  assert(run(['--bogus']).status === 1, 'unknown flag accepted')
  assert(run(['--base-url', 'https://www.classicalvirtues.com']).status === 2, 'production without --yes not refused')
})

// --- 2. content gates -------------------------------------------------------
writeCleanStory()
await test('fixture story passes story:check', async () => {
  const r = await runCheck(SLUG, { quiet: true, record: false })
  assert(r.pass, r.problems.join('; '))
})
await test('dash spellings are caught in every reader-facing field and the body', async () => {
  const variants = ['—', '–', '&mdash;', '&ndash;', '&#8212;', '&#8211;', '&#x2014;', '&#X2013;', '―', '⸺', '⸻', '﹘', '－']
  for (const v of variants) assert(hasDash(`waited ${v} and waited`), `${JSON.stringify(v)} not detected`)
  assert(!hasDash('true-hearted read-aloud'), 'plain hyphen flagged')
  for (const field of ['title', 'summary', 'virtueDescription', 'imageAlt', 'source']) {
    writeDraft(draftText({ ...FIELDS, [field]: `${FIELDS[field]} &mdash; more` }))
    assert((await contractChecks(loadDraft(SLUG))).some((e) => e.rule === 'dash'), `${field} entity dash not caught`)
  }
  writeDraft(draftText(FIELDS, BODY.replace('The mouse did not struggle.', 'The mouse did not struggle &#8212; at all.')))
  assert((await contractChecks(loadDraft(SLUG))).some((e) => e.rule === 'dash'), 'body entity dash not caught')
})
await test('related-reading paragraphs and links in the body are caught', async () => {
  writeDraft(draftText(FIELDS, `${BODY}\nIf you liked this story, read David and Mephibosheth next.\n`))
  assert((await contractChecks(loadDraft(SLUG))).some((e) => e.rule === 'related-reading'), 'related reading not caught')
  writeDraft(draftText(FIELDS, `${BODY}\nSee [more](https://example.com).\n`))
  assert((await contractChecks(loadDraft(SLUG))).some((e) => e.rule === 'body-structure'), 'link not caught')
})
await test('kill rounds close the gate in every heading style and order', () => {
  const text = writeCleanStory()
  const h = hashOf(text)
  const styles = [
    `## Round 2: kill\n\n- Draft sha256: ${h}\n- Sign-off: X, 2026-10-13`,
    `## Round 2 - kill\n\n- Draft sha256: ${h}`,
    `## Round 2 — kill\n\n- Draft sha256: ${h}`,
    `## Round 2 (kill)\n\n- Draft sha256: ${h}`,
    `### Round 2: kill\n\n- Draft sha256: ${h}`,
    `## Round 2\n\n- Verdict: kill\n- Draft sha256: ${h}`,
    `# Round 2: KILL\n\n- Draft sha256: ${h}`,
  ]
  for (const style of styles) {
    writeFileSync(paths.gate, `${gateNote(h)}\n${style}\n`)
    assert(readGateNote(loadDraft(SLUG)).problems.length, `gate stayed open for: ${style.split('\n')[0]}`)
  }
  // Newest-first log: round 2 (kill) written above round 1 (publish).
  writeFileSync(paths.gate, gateNote(h, `## Round 2: kill (selftest)\n\n- Draft sha256: ${h}\n\n## Round 1: publish (selftest)`))
  assert(readGateNote(loadDraft(SLUG)).problems.length, 'newest-first kill ignored')
})
await test('ambiguous or unbound gate notes fail closed', () => {
  const text = writeCleanStory()
  const h = hashOf(text)
  const d = () => readGateNote(loadDraft(SLUG))
  writeFileSync(paths.gate, `${gateNote(h)}\n## Round 1: publish\n\n- Draft sha256: ${h}\n- Sign-off: X, 2026-10-13\n`)
  assert(d().problems.some((p) => /twice/.test(p)), 'duplicate round accepted')
  writeFileSync(paths.gate, gateNote(h, '## Round 1: publish (selftest)', '- Verdict: kill'))
  assert(d().problems.some((p) => /Verdict line/.test(p)), 'heading/Verdict conflict accepted')
  writeFileSync(paths.gate, gateNote(h).replace(/- Sign-off:.*\n/, ''))
  assert(d().problems.some((p) => /sign-off/i.test(p)), 'missing sign-off accepted')
  writeFileSync(paths.gate, gateNote(h).replace(`content/drafts/${SLUG}.md`, 'content/drafts/other-story.md'))
  assert(d().problems.some((p) => /must name this draft/.test(p)), 'gate note for another draft accepted')
  writeFileSync(paths.gate, gateNote('0'.repeat(64)))
  assert(d().problems.some((p) => /different version/.test(p)), 'stale hash accepted')
  writeFileSync(paths.gate, gateNote(h).replace('## Round 1: publish', '## Round 1: approved'))
  assert(d().problems.length, 'unreadable verdict accepted')
})
await test('SEO note needs the owner sign-off and the current draft hash', () => {
  const text = writeCleanStory()
  writeFileSync(paths.seo, seoNote(hashOf(text), ''))
  assert(readSeoNote(loadDraft(SLUG)).problems.some((p) => /sign-off/.test(p)), 'missing SEO sign-off accepted')
  writeFileSync(paths.seo, seoNote('1'.repeat(64)))
  assert(readSeoNote(loadDraft(SLUG)).problems.length, 'stale SEO note accepted')
  writeFileSync(paths.seo, seoNote(hashOf(text)).replace(/- Run by:.*\n/, ''))
  assert(readSeoNote(loadDraft(SLUG)).problems.some((p) => /who ran it/.test(p)), 'anonymous SEO note accepted')
})
await test('story:seo --record names the actor, never the owner, and leaves sign-off blank', () => {
  writeCleanStory()
  rmSync(paths.seo)
  const record = () => spawnSync(process.execPath, [join(REPO, 'scripts/story/seo.mjs'), SLUG, '--record'], { env: { ...childEnv, STORY_ACTOR: 'agent (selftest thread)' }, encoding: 'utf8' })
  record()
  const note = readFileSync(paths.seo, 'utf8')
  assert(/^- Run by: agent \(selftest thread\) via story:seo$/m.test(note), 'actor not recorded')
  assert(/^- Owner: Quinn$/m.test(note) && /^- Owner sign-off:[ \t]*$/m.test(note), 'owner or blank sign-off wrong')
  assert(!/Quinn,/.test(note), "owner's name used as a signature")
  // A person signs; re-recording the same draft bytes keeps the signature.
  if (/^- Verdict: clear$/m.test(note)) {
    writeFileSync(paths.seo, note.replace(/^- Owner sign-off:[ \t]*$/m, '- Owner sign-off: Quinn Person, 2026-10-13'))
    record()
    assert(/^- Owner sign-off: Quinn Person, 2026-10-13$/m.test(readFileSync(paths.seo, 'utf8')), 'sign-off lost on re-record of same bytes')
  }
  writeCleanStory()
})

// --- 3. files over records --------------------------------------------------
const img = join(scratch, 'painting.png')
execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=s=1536x1024', '-frames:v', '1', img])
const voice = join(scratch, 'voice.wav')
// ~60 s of syllable-like noise bursts: plausible pace for the fixture's ~260 spoken words.
execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'anoisesrc=d=110:c=pink:a=0.3:r=44100', '-af', "volume='if(lt(mod(t,0.42),0.28),1,0.02)':eval=frame,lowpass=f=5000", '-ac', '1', voice])

await test('image and narration stages produce artifacts that pass from the files', async () => {
  writeCleanStory()
  await runImage(SLUG, { input: img })
  await runAudio(SLUG, { input: voice })
  const d = loadDraft(SLUG)
  const image = await imageArtifact(d)
  const audio = await audioArtifact(d)
  assert(!image.problems.length, image.problems.join('; '))
  assert(!audio.problems.length, audio.problems.join('; '))
  assert(audio.warnings.some((w) => /Transcript not verified/.test(w)), 'unverified transcript not warned')
})
const goodImage = readFileSync(join(paths.imageDir, `${SLUG}.jpg`))
const goodMp3 = readFileSync(join(paths.audioDir, `${SLUG}.mp3`))
const restore = () => {
  writeFileSync(join(paths.imageDir, `${SLUG}.jpg`), goodImage)
  writeFileSync(join(paths.audioDir, `${SLUG}.mp3`), goodMp3)
}
await test('a swapped illustration closes the gate, even with a forged record', async () => {
  const other = join(scratch, 'other.jpg')
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=red:s=1536x1024', '-frames:v', '1', other])
  copyFileSync(other, join(paths.imageDir, `${SLUG}.jpg`))
  assert((await imageArtifact(loadDraft(SLUG))).problems.length, 'swapped image accepted')
  const small = join(scratch, 'small.jpg')
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=red:s=600x600', '-frames:v', '1', small])
  copyFileSync(small, join(paths.imageDir, `${SLUG}.jpg`))
  writeStage(SLUG, 'image', { ...readState(SLUG).stages.image, sha256: sha256(readFileSync(small)) }) // forged record
  assert((await imageArtifact(loadDraft(SLUG))).problems.some((p) => /1536px|3:2/.test(p)), 'forged 600x600 image accepted')
  restore()
  writeStage(SLUG, 'image', { ...readState(SLUG).stages.image, sha256: sha256(goodImage) })
})
await test('a swapped or mistagged MP3 closes the gate, even with a forged record', async () => {
  const bad = Buffer.from(goodMp3)
  bad[bad.length - 1000] ^= 0xff
  writeFileSync(join(paths.audioDir, `${SLUG}.mp3`), bad)
  assert((await audioArtifact(loadDraft(SLUG))).problems.length, 'modified MP3 accepted')
  // Retitle the MP3 (as if it were another story's master) and forge the record to match.
  const retitled = Buffer.from(goodMp3.toString('latin1').replace('The Lion and the Mouse', 'Androcles & the Lion!'), 'latin1')
  writeFileSync(join(paths.audioDir, `${SLUG}.mp3`), retitled)
  writeStage(SLUG, 'audio', { ...readState(SLUG).stages.audio, sha256: sha256(retitled) })
  assert((await audioArtifact(loadDraft(SLUG))).problems.some((p) => /tagged/.test(p)), 'foreign-titled MP3 accepted')
  restore()
  writeStage(SLUG, 'audio', { ...readState(SLUG).stages.audio, sha256: sha256(goodMp3) })
})
await test('a forged state.json cannot open the check gate for a bad draft', async () => {
  writeDraft(draftText({ ...FIELDS, virtue: 'Grit', summary: `${FIELDS.summary} &mdash; ok` }, `${BODY}\n## What is the moral of this story for kids?\n`))
  writeStage(SLUG, 'check', { status: 'pass', draftHash: loadDraft(SLUG).hash })
  assert(!(await runCheck(SLUG, { quiet: true, record: false })).pass, 'forged check record accepted')
})
await test('approval binds draft, notes and both files byte for byte', async () => {
  writeCleanStory()
  const d = loadDraft(SLUG)
  const check = await runCheck(SLUG, { quiet: true, record: false })
  const image = await imageArtifact(d)
  const audio = await audioArtifact(d)
  writeStage(SLUG, 'approval', { status: 'pass', by: 'Selftest Operator', draftHash: d.hash, gateHash: check.gate.hash, seoHash: check.seo.hash, imageSha256: image.sha256, audioSha256: audio.sha256 })
  assert(!approvalProblems(d, check, image, audio).problems.length, 'fresh approval rejected')
  const swapped = { ...image, sha256: 'f'.repeat(64) }
  assert(approvalProblems(d, check, swapped, audio).problems.some((p) => /illustration/.test(p)), 'image swap after approval accepted')
  const reround = { ...check, gate: { ...check.gate, hash: 'e'.repeat(64) } }
  assert(approvalProblems(d, reround, image, audio).problems.some((p) => /gate note/.test(p)), 'new gate round after approval accepted')
})

// --- 4. payload validation --------------------------------------------------
const target = { existing: null, collectionId: 'jds6AnsHFrNdiZJzTKcyX' }
const story = () => loadDraft(SLUG)
const goodUrls = { imageUrl: 'https://assets.basehub.com/x/y.jpg', imageFileName: 'y.jpg', audioUrl: 'https://selfteststore.public.blob.vercel-storage.com/audio/x.mp3' }
const BASE_FIELDS = {
  content: { type: 'Content_1', kind: 'OBJECT' }, virtue: { type: 'String' }, image: { type: 'BlockImage' }, summary: { type: 'String' },
  virtueDescription: { type: 'String' }, audioUrl: { type: 'String' }, source: { type: 'String' },
}
const MIGRATED = { ...BASE_FIELDS, canonicalVirtue: { type: 'VirtuesItem', kind: 'OBJECT' }, subVirtue: { type: 'String' }, audio: { kind: 'UNION' }, publishedAt: { type: 'String' }, contentUpdatedAt: { type: 'String' } }
await test('placeholder and foreign-host asset URLs are invalid', async () => {
  writeCleanStory()
  for (const urls of [{ ...goodUrls, imageUrl: '<pending upload>' }, { ...goodUrls, audioUrl: 'https://evil.example.net/x.mp3' }, { ...goodUrls, imageUrl: 'https://otherstore.public.blob.vercel-storage.com/x.jpg' }]) {
    const op = storyOperation(story(), target, { ...urls, liveFields: BASE_FIELDS, today: '2026-10-13T00:00:00Z' })
    assert((await validateOperation(op, BASE_FIELDS)).length, `accepted ${JSON.stringify(urls)}`)
  }
  assert(allowedAssetHost(goodUrls.audioUrl) && allowedAssetHost(goodUrls.imageUrl), 'own hosts refused')
  const op = storyOperation(story(), target, { ...goodUrls, liveFields: BASE_FIELDS, today: '2026-10-13T00:00:00Z' })
  const problems = await validateOperation(op, BASE_FIELDS)
  assert(!problems.length, problems.join('; '))
})
await test('migrated Basehub fields are written when the schema has them, and required', async () => {
  const ctx = { ...goodUrls, liveFields: MIGRATED, virtueIds: { charity: 'ABCDEFGHIJKLMNOPQRSTU' }, canonSlug: 'charity', today: '2026-10-13T00:00:00Z' }
  const op = storyOperation(story(), target, ctx)
  const v = op.data.value
  assert(v.canonicalVirtue?.value === 'ABCDEFGHIJKLMNOPQRSTU' && v.subVirtue?.value === 'mercy' && v.audio?.value?.url === goodUrls.audioUrl && v.publishedAt && v.contentUpdatedAt, 'migrated fields missing')
  const problems = await validateOperation(op, MIGRATED)
  assert(!problems.length, problems.join('; '))
  const old = storyOperation(story(), target, { ...goodUrls, liveFields: BASE_FIELDS, today: 'x' })
  assert((await validateOperation(old, MIGRATED)).some((p) => /canonicalVirtue: live field the payload does not set/.test(p)), 'missing migrated field accepted')
  assert((await validateOperation(op, { ...MIGRATED, mysteryField: { type: 'String' } })).some((p) => /mysteryField/.test(p)), 'unknown live field ignored')
})

// --- 5. remote targets and guards ------------------------------------------
await test('remote targets: lookalike previews refused, production needs --yes', async () => {
  await throws(() => siteTarget({ 'base-url': 'https://classical-virtues-attacker.vercel.app', yes: true }), /not this site/, 'lookalike preview')
  await throws(() => siteTarget({ 'base-url': 'https://www.classicalvirtues.com' }), /--yes/, 'production without --yes')
  await throws(() => siteTarget({ 'base-url': 'http://www.classicalvirtues.com', yes: true }), /https/, 'plain http')
  process.env.STORY_PREVIEW_HOSTS = 'classical-virtues-abc123def-team.vercel.app'
  assert(siteTarget({ 'base-url': 'https://classical-virtues-abc123def-team.vercel.app', yes: true }).production === false, 'listed preview refused')
  delete process.env.STORY_PREVIEW_HOSTS
  assert(siteTarget({}).local, 'default is not local')
})
await test('audio:upload refuses draft slugs and unknown slugs, whatever STORY_DRAFTS_DIR says', () => {
  const run = (args, env = childEnv) => spawnSync(process.execPath, [join(REPO, 'scripts/audio/upload.mjs'), join(paths.audioDir, `${SLUG}.mp3`), ...args], { env, encoding: 'utf8' })
  assert(run(['--slug', 'the-cherry-tree', '--yes']).status === 2, 'published slug without --remaster accepted')
  assert(run(['--slug', 'no-such-story-anywhere', '--yes', '--remaster']).status === 2, 'unknown slug accepted')
  const repoDraft = readdirSync(join(REPO, 'content', 'drafts')).find((f) => /^[a-z0-9-]+\.md$/.test(f))
  if (repoDraft) {
    const empty = mkdtempSync(join(scratch, 'empty-'))
    assert(run(['--slug', repoDraft.slice(0, -3), '--yes', '--remaster'], { ...childEnv, STORY_DRAFTS_DIR: empty }).status === 2, 'repo draft slug accepted via empty STORY_DRAFTS_DIR')
  }
})
await test('story:status survives stray files in the drafts directory', () => {
  writeFileSync(join(drafts, 'a--b.md'), 'stray')
  const r = spawnSync(process.execPath, [join(REPO, 'scripts/story/status.mjs')], { env: childEnv, encoding: 'utf8', timeout: 120_000 })
  rmSync(join(drafts, 'a--b.md'))
  assert(r.status === 0 && r.stdout.includes(SLUG) && /skipping "a--b.md"/.test(r.stdout), `status exit ${r.status}: ${r.stderr.slice(0, 200)}`)
})
await test('transcript comparison: same text passes, another story fails', () => {
  const script = BODY
  assert(compareTranscript(script, script.replace('heavy', 'big')).pass, 'near-identical transcript failed')
  const other = readFileSync(join(REPO, 'content', 'vault', 'exemplars', 'androcles-and-the-lion.md'), 'utf8')
  assert(!compareTranscript(script, other).pass && wer(script, other) > 0.5, 'other story passed')
})

// --- 6. round-3 critic repros ---------------------------------------------
await test('no code path issues a Basehub commit (publishing is a person in the dashboard)', () => {
  const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : e.name.endsWith('.mjs') ? [join(d, e.name)] : []))
  const offenders = []
  for (const file of [...walk(join(REPO, 'scripts', 'story')), ...walk(join(REPO, 'scripts', 'audio'))]) {
    if (file.endsWith('selftest.mjs')) continue
    readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      const code = line.replace(/\/\/.*$/, '').replace(/^\s*\*.*$/, '')
      if (/type:\s*['"]commit['"]|autoCommit\s*:|['"]--commit['"]|\bcommit:\s*['"]boolean['"]|'include-others'/.test(code)) offenders.push(`${file.replace(REPO + '/', '')}:${i + 1}`)
    })
  }
  for (const doc of [join(REPO, 'content', 'pipeline.md'), join(REPO, '.claude', 'skills', 'virtue-story-pipeline', 'SKILL.md')]) {
    if (/--commit\b|--include-others\b/.test(readFileSync(doc, 'utf8'))) offenders.push(doc.replace(REPO + '/', ''))
  }
  assert(!offenders.length, `commit code or docs at ${offenders.join(', ')}`)
  const r = spawnSync(process.execPath, [join(REPO, 'scripts/story/publish.mjs'), SLUG, '--yes', '--commit'], { env: childEnv, encoding: 'utf8' })
  assert(r.status === 1 && /Unknown option "--commit"/.test(r.stderr), '--commit still accepted')
})
await test('the seven kill spellings that slipped past round 2 close the gate', () => {
  const text = writeCleanStory()
  const h = hashOf(text)
  const so = '- Sign-off: Selftest Editor, 2026-10-13'
  const attacks = [
    `## Round 9: not ready to publish, kill (2026-10-13, selftest)\n\n- Draft sha256: ${h}\n${so}`,
    `**Round 9: kill**\n\n- Draft sha256: ${h}`,
    `##### Round 9: kill\n\n- Draft sha256: ${h}`,
    `## Round IX: kill\n\n- Draft sha256: ${h}`,
    `Round 9: kill\n-------------\n\n- Draft sha256: ${h}`,
    `## Editor-in-chief override: kill (Selftest, 2026-10-13)`,
    `## Round 9 (2026-10-13, publish desk)\n\n- Verdict: \`kill\`\n- Draft sha256: ${h}\n${so}`,
  ]
  for (const a of attacks) {
    writeFileSync(paths.gate, `${gateNote(h)}\n${a}\n`)
    assert(readGateNote(loadDraft(SLUG)).problems.length, `gate stayed open for: ${a.split('\n')[0]}`)
  }
  writeCleanStory()
})
await test('sign-offs by agent names, in the future, or before the review are refused', () => {
  const text = writeCleanStory()
  const h = hashOf(text)
  for (const line of ['- Sign-off: Claude (agent thr_x), 2026-10-13', '- Sign-off: Selftest Editor, 2099-12-31', '- Sign-off: Selftest Editor, 2020-01-01']) {
    writeFileSync(paths.gate, gateNote(h).replace(/- Sign-off:.*/, line))
    assert(readGateNote(loadDraft(SLUG)).problems.some((p) => /agent|future|before the review/.test(p)), `accepted: ${line}`)
  }
  writeFileSync(paths.seo, seoNote(h, 'Codex bot, 2026-10-13'))
  assert(readSeoNote(loadDraft(SLUG)).problems.some((p) => /agent/.test(p)), 'agent SEO sign-off accepted')
  writeCleanStory()
})
await test('a publish round missing only its sign-off asks for the sign-off, not another review', () => {
  const text = writeCleanStory()
  writeFileSync(paths.gate, gateNote(hashOf(text)).replace(/- Sign-off:.*\n/, ''))
  assert(readGateNote(loadDraft(SLUG)).next === 'sign-off', 'next step is not the sign-off')
  writeFileSync(paths.gate, gateNote('0'.repeat(64)).replace(/- Sign-off:.*\n/, ''))
  assert(readGateNote(loadDraft(SLUG)).next === 'editor', 'stale round did not send to the editor')
  writeCleanStory()
})
await test('dash forms the site renders (leading zeros, two-em, minus, vertical em, spaced --) are caught', async () => {
  for (const v of ['&#x02014;', '&#08212;', '&#11834;', '&#x2E3A;', '−', '︱', ' -- ']) {
    writeDraft(draftText(FIELDS, BODY.replace('The mouse did not struggle.', `The mouse did not struggle${v}at all.`)))
    assert((await contractChecks(loadDraft(SLUG))).some((e) => e.rule === 'dash'), `${JSON.stringify(v)} in body not caught`)
  }
  writeDraft(draftText({ ...FIELDS, summary: `${FIELDS.summary} ︱ more` }))
  assert((await contractChecks(loadDraft(SLUG))).some((e) => e.rule === 'dash'), 'U+FE31 in summary not caught')
  writeCleanStory()
})
await test('body constructs that render as structure are caught (reference link, setext, autolink, footnote, rule)', async () => {
  const cases = {
    'reference link': 'See [the net][n] again.\n\n[n]: /stories/the-three-men',
    'setext heading': 'The Moral\n=========',
    'www autolink': 'Visit www.example.com tonight.',
    footnote: 'A note[^1].\n\n[^1]: More.',
    rule: '***',
  }
  for (const [name, extra] of Object.entries(cases)) {
    writeDraft(draftText(FIELDS, `${BODY}\n${extra}\n`))
    assert((await contractChecks(loadDraft(SLUG))).some((e) => e.rule === 'body-structure'), `${name} not caught`)
  }
  writeCleanStory()
})
await test('related reading: catalog titles and invitations caught, ordinary "read ... next" prose allowed', async () => {
  writeDraft(draftText(FIELDS, `${BODY}\nReaders who enjoyed this tale should turn to David and Mephibosheth.\n`))
  assert((await contractChecks(loadDraft(SLUG))).some((e) => e.rule === 'related-reading'), 'title-based related reading not caught')
  writeDraft(draftText(FIELDS, BODY.replace('The mouse heard it and came running.', 'The mouse read the wind, and next she came running.')))
  assert(!(await contractChecks(loadDraft(SLUG))).some((e) => e.rule === 'related-reading'), 'ordinary prose flagged')
  writeCleanStory()
})
await test('reserved route slugs and duplicate frontmatter keys are refused', async () => {
  const reserved = reservedSlugs()
  if (reserved.length) {
    const slug = reserved[0]
    writeFileSync(join(drafts, `${slug}.md`), draftText({ ...FIELDS, slug }))
    assert((await contractChecks(loadDraft(slug))).some((e) => /fixed route/.test(e.message)), `reserved slug "${slug}" accepted`)
    rmSync(join(drafts, `${slug}.md`))
  }
  writeDraft(draftText(FIELDS).replace('---\n\n', `summary: ${JSON.stringify('A dash — here.')}\n---\n\n`))
  await throws(() => loadDraft(SLUG), /duplicate key/, 'duplicate summary key')
  writeCleanStory()
})
await test('STORY_ACTOR cannot put an owner name on agent work', () => {
  const run = (env) => spawnSync(process.execPath, [join(REPO, 'scripts/story/seo.mjs'), SLUG, '--record'], { env: { ...childEnv, ...env }, encoding: 'utf8' })
  writeCleanStory()
  const r = run({ BB_THREAD_ID: 'thr_selftest', STORY_ACTOR: 'Quinn' })
  assert(r.status === 1 && /names an owner/.test(r.stderr), `owner name accepted in an agent session (exit ${r.status})`)
  run({ BB_THREAD_ID: 'thr_selftest', STORY_ACTOR: 'Hunter' })
  assert(/^- Run by: agent \(bb thread thr_selftest\) for Hunter via story:seo$/m.test(readFileSync(paths.seo, 'utf8')), 'agent identity replaced')
  writeCleanStory()
})
await test('hosted narration is measured like a local file (host allowlist, bytes, tags)', async () => {
  writeDraft(draftText({ ...FIELDS, audio: 'https://evil.example.net/x.mp3' }))
  assert((await contractChecks(loadDraft(SLUG))).some((e) => e.rule === 'audio'), 'foreign audio host accepted')
  // An allowed host serving another story's master (mocked in-process, no network).
  const hosted = 'https://assets.basehub.com/selftest/narration.mp3'
  const foreign = Buffer.from(goodMp3.toString('latin1').replace('The Lion and the Mouse', 'Androcles & the Lion!'), 'latin1')
  writeDraft(draftText({ ...FIELDS, audio: hosted }))
  writeStage(SLUG, 'audio', { status: 'pass', external: true, url: hosted, sha256: sha256(foreign), scriptHash: 'forged' })
  const real = globalThis.fetch
  globalThis.fetch = async (url) => (url === hosted ? new Response(foreign) : real(url))
  try {
    const audio = await audioArtifact(loadDraft(SLUG))
    assert(audio.problems.some((p) => /tagged/.test(p)), `hosted foreign master accepted: ${audio.problems.join('; ')}`)
  } finally {
    globalThis.fetch = real
  }
  writeCleanStory()
  writeStage(SLUG, 'audio', { ...readState(SLUG).stages.audio, status: 'pass', external: undefined, url: undefined, sha256: sha256(goodMp3), provider: 'human' })
})
await test('story:verify reads the rendered body: narrative only, same words as the draft', () => {
  const page = (inner) => `<html><body><article><div id="story-body" class="story-body"><div>${inner}</div></div><section><h2>The moral</h2></section></article></body></html>`
  const paras = BODY.trim().split(/\n\n/).map((p) => `<p>${p.replace(/'/g, '’')}</p>`).join('')
  const approved = compareWords(BODY.replace(/\n+/g, ' '))
  assert(compareWords(storyBodyHtml(page(paras)).replace(/<[^>]+>/g, ' ')) === approved, 'typography-only difference flagged')
  assert(compareWords(storyBodyHtml(page(paras.replace('heavy paw', 'big paw'))).replace(/<[^>]+>/g, ' ')) !== approved, 'edited body not detected')
  assert(/<h2/i.test(storyBodyHtml(page(`${paras}<h2>The Moral</h2>`))), 'heading inside the body not visible to the check')
  assert(!/The moral/.test(storyBodyHtml(page(paras))), 'body extraction leaked the moral section')
})
await test('payload: null media and malformed dates are invalid; asset fetch failures do not crash', async () => {
  writeCleanStory()
  const ctx = { ...goodUrls, liveFields: MIGRATED, virtueIds: { charity: 'ABCDEFGHIJKLMNOPQRSTU' }, canonSlug: 'charity', today: 'not-a-date' }
  const op = storyOperation(story(), target, ctx)
  assert((await validateOperation(op, MIGRATED)).some((p) => /ISO date/.test(p)), 'bad date accepted')
  op.data.value.audio = { type: 'media', value: null }
  assert((await validateOperation(op, MIGRATED)).some((p) => /null value/.test(p)), 'null media accepted')
  const noAudio = storyOperation(story(), target, { ...ctx, audioUrl: '', today: '2026-10-13T00:00:00Z' })
  assert(!('audio' in noAudio.data.value), 'audio media sent for a story without narration')
  assert(!(await validateOperation(noAudio, MIGRATED)).length, 'story without narration rejected')
  const real = globalThis.fetch
  globalThis.fetch = async () => { throw new Error('offline') }
  try {
    const v = await verifyAsset(goodUrls.imageUrl, 'a'.repeat(64), sha256)
    assert(v.ok === false && /could not fetch/.test(v.reason), 'fetch failure not reported cleanly')
  } finally {
    globalThis.fetch = real
  }
})
await test('update diff shows reorders and duplicates', () => {
  const d = lineDiff('one\ntwo\nthree', 'two\none\nthree\nthree')
  assert(d.filter(([op]) => op !== '=').length >= 2, 'reorder/duplicate hidden')
})
await test('every flag in a printed or documented command is one the script accepts', () => {
  const specFlags = {}
  for (const [name, cmd] of Object.entries(pkg.scripts).filter(([k]) => /^(story|audio):/.test(k))) {
    const src = readFileSync(join(REPO, cmd.match(/scripts\/\S+\.mjs/)[0]), 'utf8')
    const block = src.match(/flags:\s*\{([^}]*)\}\s*,?\s*\}\s*\)?/g)?.pop() ?? ''
    specFlags[name] = new Set([...block.matchAll(/'([a-z-]+)'\s*:|\b([a-z]+)\s*:\s*'(?:boolean|string)'/g)].map((m) => m[1] ?? m[2]).concat(['help']))
  }
  const files = [join(REPO, 'content', 'pipeline.md'), join(REPO, '.claude', 'skills', 'virtue-story-pipeline', 'SKILL.md')]
  for (const dir of ['story', 'audio']) for (const f of readdirSync(join(REPO, 'scripts', dir))) if (f.endsWith('.mjs') && f !== 'selftest.mjs') files.push(join(REPO, 'scripts', dir, f))
  const bad = []
  for (const file of files) {
    for (const m of readFileSync(file, 'utf8').matchAll(/pnpm ((?:story|audio):[a-z-]+)([^`'"\n|)]*)/g)) {
      for (const f of m[2].matchAll(/--([a-z][a-z-]*)/g)) if (specFlags[m[1]] && !specFlags[m[1]].has(f[1])) bad.push(`${m[1]} --${f[1]} (${file.replace(REPO + '/', '')})`)
    }
  }
  assert(!bad.length, `unknown flags in printed commands: ${[...new Set(bad)].join(', ')}`)
})

// --- 7. optional dek ----------------------------------------------------------
const DEK = 'A lion who laughed at a promise from a mouse learns, caught in a hunter\'s net, what small help is worth.'
await test('dek: optional; when present 80-160 characters and dash-free', async () => {
  writeCleanStory()
  assert(!(await contractChecks(loadDraft(SLUG))).some((e) => e.rule === 'dek'), 'missing dek flagged')
  writeDraft(draftText({ ...FIELDS, dek: DEK }))
  assert(!(await contractChecks(loadDraft(SLUG))).length, 'good dek rejected')
  for (const bad of ['Too short.', `${DEK} ${DEK}`]) {
    writeDraft(draftText({ ...FIELDS, dek: bad }))
    assert((await contractChecks(loadDraft(SLUG))).some((e) => e.rule === 'dek'), `dek of ${bad.length} characters accepted`)
  }
  writeDraft(draftText({ ...FIELDS, dek: DEK.replace(', caught', ' &mdash; caught') }))
  assert((await contractChecks(loadDraft(SLUG))).some((e) => e.rule === 'dash'), 'dash in dek accepted')
  writeCleanStory()
})
await test('dek: SEO QA checks it when present', async () => {
  writeDraft(draftText({ ...FIELDS, dek: FIELDS.summary }))
  const { checks } = await seoChecks(loadDraft(SLUG))
  assert(checks.some((x) => x.area === 'dek' && !x.pass && /copy of the summary/.test(x.label)), 'dek equal to summary not flagged')
  writeCleanStory()
  assert(!(await seoChecks(loadDraft(SLUG))).checks.some((x) => x.area === 'dek'), 'dek checks ran without a dek')
})
await test('dek: written when the schema has it (empty means use the summary), required like any live field', async () => {
  const WITH_DEK = { ...MIGRATED, dek: { type: 'String' } }
  const ctx = { ...goodUrls, liveFields: WITH_DEK, virtueIds: { charity: 'ABCDEFGHIJKLMNOPQRSTU' }, canonSlug: 'charity', today: '2026-10-13T00:00:00Z' }
  writeDraft(draftText({ ...FIELDS, dek: DEK }))
  let op = storyOperation(story(), target, ctx)
  assert(op.data.value.dek?.value === DEK, 'dek not written')
  assert(!(await validateOperation(op, WITH_DEK)).length, 'dek payload rejected')
  writeCleanStory()
  op = storyOperation(story(), target, ctx)
  assert(op.data.value.dek?.value === '', 'missing dek not written as empty')
  const noDek = storyOperation(story(), target, { ...ctx, liveFields: MIGRATED })
  assert(!('dek' in noDek.data.value), 'dek written to a schema without it')
  assert((await validateOperation(noDek, WITH_DEK)).some((p) => /^dek: live field/.test(p)), 'unset live dek accepted')
})
await test('dek: story:verify reads the rendered standfirst', () => {
  const html = '<h1>The Lion and the Mouse</h1><p class="dek story-dek mt-4">A lion who laughed at a promise &amp; more</p>'
  assert(renderedDekText(html) === 'A lion who laughed at a promise & more', 'dek text not extracted')
  assert(renderedDekText('<p class="dek">x</p>') === null, 'non-story dek matched')
})

await test('no network call was attempted', () => assert(networkCalls === 0, `${networkCalls} fetch call(s)`))

// --- report -------------------------------------------------------------------
rmSync(scratch, { recursive: true, force: true })
const failed = results.filter(([ok]) => !ok)
for (const [ok, name, why] of results) console.log(`${ok ? '\x1b[32mpass\x1b[0m' : '\x1b[31mFAIL\x1b[0m'}  ${name}${why ? `\n        ${why}` : ''}`)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
process.exit(failed.length ? 1 : 0)
