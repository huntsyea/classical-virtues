// audio:narrate: render the read-aloud narration for a draft.
//
//   pnpm audio:narrate <slug> [--provider elevenlabs|openai] [--dry-run]
//   pnpm audio:narrate <slug> --input <recording.wav|mp3|m4a>   (human narration; no TTS)
//
// Reads content/drafts/<slug>.md and writes content/drafts/<slug>/audio/:
//   script.txt       exactly what the voice reads, with pause markers
//   chunks/          one cached render per request (resumable, keyed by voice+text)
//   narration.wav    stitched, 44.1 kHz mono, exact pauses, ready for audio:master
//   narration.json   provider, voice, model, chunk list, request ids, script hash
//
// Stitching: each paragraph is one request. ElevenLabs gets the neighbouring
// paragraphs as previous_text/next_text (and the previous request ids from the
// same run) so intonation carries across joins. Each render's own leading and
// trailing silence is trimmed and replaced by measured pauses, so a paragraph
// break always sounds like a paragraph break.

import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { assertFfmpeg, ffmpeg, durationOf, round } from './lib/ffmpeg.mjs'
import { buildScript, renderScript, loadLexicon, paragraphs } from './lib/readaloud.mjs'
import { getProvider, planningProvider } from './lib/providers.mjs'
import { main, isEntry, log } from '../story/lib/cli.mjs'
import { loadDraft, draftPaths, sha256, rel } from '../story/lib/draft.mjs'

const SAMPLE_RATE = 44100
// Trim a render's own edge silence down to a breath, then we add exact pauses.
const EDGE_TRIM = 'silenceremove=start_periods=1:start_threshold=-55dB:start_silence=0.04,areverse,silenceremove=start_periods=1:start_threshold=-55dB:start_silence=0.08,areverse'

/** The text inputs narration depends on; their hash makes audio stale when they change. */
export function narrationInputs(draft) {
  return { title: draft.fields.title, body: draft.body, moral: draft.fields.virtueDescription }
}

/** Hash of the spoken words only (title, paragraphs, moral): a typo fix in prose re-narrates; frontmatter edits elsewhere do not. */
export function scriptHashFor(draft) {
  const { title, body, moral } = narrationInputs(draft)
  return sha256(JSON.stringify([title, paragraphs(body), paragraphs(moral ?? '')]))
}

/**
 * Narrate a draft. Returns { file, record } where record is narration.json.
 * opts: { providerName, input, dryRun, quiet }
 */
export async function narrate(slug, opts = {}) {
  assertFfmpeg()
  const draft = loadDraft(slug)
  const paths = draftPaths(slug)
  const audioDir = paths.audioDir
  const chunkDir = join(audioDir, 'chunks')
  mkdirSync(chunkDir, { recursive: true })
  const say = opts.quiet ? () => {} : log.info
  const out = join(audioDir, 'narration.wav')

  // Human narration: no TTS, just normalize the container for mastering.
  if (opts.input) {
    if (!existsSync(opts.input)) throw new UsageError(`Recording not found: ${opts.input}`)
    const kept = join(audioDir, `recording${extname(opts.input).toLowerCase() || '.wav'}`)
    if (opts.input !== kept) copyFileSync(opts.input, kept)
    await ffmpeg(['-i', kept, '-vn', '-ac', '1', '-af', `aresample=${SAMPLE_RATE}:resampler=soxr`, '-c:a', 'pcm_s24le', out])
    const record = {
      slug,
      provider: 'human',
      source: rel(kept),
      sourceSha256: sha256(readFileSync(kept)),
      scriptHash: scriptHashFor(draft),
      duration: round(await durationOf(out), 3),
      createdAt: new Date().toISOString(),
    }
    writeFileSync(join(audioDir, 'narration.json'), JSON.stringify(record, null, 2) + '\n')
    log.ok(`Human recording staged: ${rel(out)} (${record.duration}s)`)
    return { file: out, record }
  }

  const provider = opts.dryRun ? planningProvider(opts.providerName) : getProvider(opts.providerName)
  const lexicon = provider.usesRemoteLexicon ? {} : loadLexicon()
  const segments = buildScript(narrationInputs(draft), { maxChars: provider.maxChars, lexicon })
  const script = renderScript(segments)
  writeFileSync(join(audioDir, 'script.txt'), script)
  const chars = segments.reduce((n, s) => n + s.speech.length, 0)
  say(`${segments.length} requests, ${chars} characters, provider ${provider.name}`)

  if (opts.dryRun) {
    console.log('\n' + script)
    log.ok(`Dry run: script written to ${rel(join(audioDir, 'script.txt'))}; no TTS called.`)
    return { file: null, record: { dryRun: true, segments: segments.length, chars } }
  }

  const voice = provider.describe()
  const voiceKey = sha256(JSON.stringify(voice)).slice(0, 10)
  const requestIds = []
  const rendered = []
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    const previousText = segments.slice(Math.max(0, i - 2), i).map((s) => s.speech).join(' ') || undefined
    const nextText = segments[i + 1]?.speech
    const key = sha256(JSON.stringify([voiceKey, seg.speech, previousText ?? '', nextText ?? ''])).slice(0, 16)
    const wav = join(chunkDir, `${String(i).padStart(3, '0')}-${key}.wav`)
    let requestId = null
    if (existsSync(wav)) {
      say(`chunk ${i + 1}/${segments.length} cached`)
      requestIds.length = 0 // ids from an earlier run may have expired; fall back to text context
    } else {
      say(`chunk ${i + 1}/${segments.length} (${seg.role}, ${seg.speech.length} chars)…`)
      const res = await provider.synthesize({ text: seg.speech, previousText, nextText, previousRequestIds: [...requestIds] })
      requestId = res.requestId
      // Keep the provider's raw bytes under their own name, and write the
      // processed chunk to a temp file renamed into place, so an interrupted
      // run can never leave a half-written chunk that looks cached.
      const raw = join(chunkDir, `raw-${String(i).padStart(3, '0')}-${key}.${res.ext}`)
      writeFileSync(raw, res.audio)
      const inputArgs = res.ext === 'pcm' ? ['-f', 's16le', '-ar', String(rateOf(res.rawFormat)), '-ac', '1'] : []
      const partial = `${wav}.partial.wav`
      await ffmpeg([...inputArgs, '-i', raw, '-ac', '1', '-af', `aresample=${SAMPLE_RATE}:resampler=soxr,${EDGE_TRIM}`, '-c:a', 'pcm_s24le', partial])
      renameSync(partial, wav)
      if (requestId) requestIds.push(requestId)
    }
    rendered.push({ index: i, role: seg.role, chars: seg.speech.length, file: rel(wav), requestId, pauseAfter: seg.pauseAfter })
  }

  // Stitch: chunk, exact silence, chunk... via the concat demuxer (identical formats).
  const list = []
  const silences = new Map()
  for (const chunk of rendered) {
    list.push(`file '${join(chunkDir, chunk.file.split('/').pop())}'`)
    if (chunk.pauseAfter > 0) {
      const ms = Math.round(chunk.pauseAfter * 1000)
      if (!silences.has(ms)) {
        const f = join(chunkDir, `silence-${ms}ms.wav`)
        await ffmpeg(['-f', 'lavfi', '-i', `anullsrc=r=${SAMPLE_RATE}:cl=mono`, '-t', String(chunk.pauseAfter), '-c:a', 'pcm_s24le', f])
        silences.set(ms, f)
      }
      list.push(`file '${silences.get(ms)}'`)
    }
  }
  const listFile = join(chunkDir, 'concat.txt')
  writeFileSync(listFile, list.join('\n') + '\n')
  await ffmpeg(['-f', 'concat', '-safe', '0', '-i', listFile, '-c:a', 'pcm_s24le', out])

  const record = {
    slug,
    provider: provider.name,
    voice,
    scriptHash: scriptHashFor(draft),
    characters: chars,
    chunks: rendered,
    duration: round(await durationOf(out), 3),
    createdAt: new Date().toISOString(),
  }
  writeFileSync(join(audioDir, 'narration.json'), JSON.stringify(record, null, 2) + '\n')
  log.ok(`Narration stitched: ${rel(out)} (${record.duration}s, ${rendered.length} chunks)`)
  return { file: out, record }
}

function rateOf(format) {
  const m = String(format).match(/_(\d+)$/)
  return m ? Number(m[1]) : SAMPLE_RATE
}

async function cli({ _, flags }) {
  await narrate(_[0], { providerName: flags.provider, input: flags.input, dryRun: Boolean(flags['dry-run']) })
}

if (isEntry(import.meta.url)) {
  main(cli, { meta: import.meta.url, args: [1, 1], flags: { provider: 'string', input: 'string', 'dry-run': 'boolean' } })
}
