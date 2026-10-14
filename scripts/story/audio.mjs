// story:audio: ladder step 7, narrate + master + analyze for one draft.
//
//   pnpm story:audio <slug> [--provider elevenlabs|openai] [--force]
//   pnpm story:audio <slug> --input <recording.wav|mp3>    human narration
//   pnpm story:audio <slug> --dry-run                      script preview, no TTS
//   --cover-focus 0..1  where the square cover art is cut from the 3:2 painting
//                       (0 left, 0.5 center, 1 right); default center
//   --override-audio-expectation  accept --input for a draft that says
//                       audio: "planned" (a human chose to record it instead)
//   --provider rehearsal  test the pipeline without a TTS key (never publishable)
//   --accept-heavy-dynamics  accept 2-10% of windows losing >3 dB to dynamics
//                       processing (see audio:master); flagged at approval
//
// Gates: story:check passes for the draft on disk (re-run here, not read from
// state.json), and the illustration on disk is the one story:image made (it
// becomes the embedded cover art). Follows the draft's `audio` field:
// "planned" narrates with TTS, "human" requires --input, "none" records a
// deliberate skip, and an https:// URL is analyzed in place. A recording must
// pace like a reading of this text (1.7-3.4 spoken words per second), which
// catches another story's narration or a truncated take.
//
// Output: content/drafts/<slug>/audio/<slug>.mp3 + <slug>.json (see
// scripts/audio/master.mjs). The stage passes only if the master meets the
// narration spec. Nothing is uploaded here; story:publish does that.

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { main, isEntry, log, UsageError, GateError } from './lib/cli.mjs'
import { readState, writeStage, audioExpectation, rel } from './lib/draft.mjs'
import { requireCheck } from './check.mjs'
import { imageArtifact, pace, scriptText } from './lib/artifacts.mjs'
import { verifyNarration, canTranscribe, MAX_WER } from '../audio/lib/transcript.mjs'
import { narrate, scriptHashFor } from '../audio/narrate.mjs'
import { masterNarration } from '../audio/master.mjs'
import { analyzeFile, printReport } from '../audio/analyze.mjs'

export async function runAudio(slug, { providerName, input, dryRun = false, force = false, coverFocus, overrideExpectation = false, acceptHeavyDynamics = false } = {}) {
  const { draft } = await requireCheck(slug)
  const expectation = audioExpectation(draft.fields)
  if (input && expectation !== 'human' && !overrideExpectation) {
    throw new GateError(`Draft says audio: "${draft.fields.audio}", so narration comes from TTS. Use --input only for audio: "human" drafts, or pass --override-audio-expectation if a person deliberately recorded it.`)
  }
  if (input && expectation !== 'human' && !canTranscribe()) {
    throw new GateError('--override-audio-expectation needs a transcript check to prove the recording reads this story. Add OPENAI_API_KEY or ELEVENLABS_API_KEY.')
  }

  if (expectation === 'none') {
    log.ok('Draft says audio: "none". Recording a deliberate skip.')
    return writeStage(slug, 'audio', { status: 'skipped', reason: 'audio: none', scriptHash: scriptHashFor(draft) })
  }
  if (expectation === 'url') {
    // Hosted narration gets the same checks as a local master (lib/artifacts.mjs).
    log.step(`Draft points at hosted narration; downloading and measuring ${draft.fields.audio}`)
    const { localize } = await import('../audio/analyze.mjs')
    const { allowedAssetHost } = await import('./lib/basehub-publish.mjs')
    if (!allowedAssetHost(draft.fields.audio)) throw new GateError(`${draft.fields.audio} is not on this project's Blob store or assets.basehub.com.`)
    const file = await localize(draft.fields.audio)
    const report = await analyzeFile(file)
    printReport(report)
    const p = pace(draft, report.duration)
    const transcript = await verifyNarration(file, scriptText(draft))
    const ok = report.verdict === 'pass' && p.plausible && transcript.status !== 'fail'
    const record = writeStage(slug, 'audio', {
      status: ok ? 'pass' : 'fail',
      external: true,
      url: draft.fields.audio,
      provider: 'hosted',
      sha256: report.sha256,
      duration: report.duration,
      durationISO: report.durationISO,
      loudness: report.loudness,
      scriptHash: scriptHashFor(draft),
      pace: p,
      transcript,
    })
    if (!ok) throw new GateError(`Hosted narration fails: ${[report.verdict !== 'pass' ? 'spec' : null, !p.plausible ? `pace ${p.wps} words/s` : null, transcript.status === 'fail' ? `transcript WER ${transcript.wer}` : null].filter(Boolean).join(', ')}.`)
    return record
  }
  if (expectation === 'human' && !input && !dryRun) {
    throw new UsageError('Draft says audio: "human". Pass the recording with --input <file>.')
  }

  if (!dryRun) {
    const image = await imageArtifact(draft)
    if (image.problems.length) throw new GateError(image.problems.join(' '))
  }
  const scriptHash = scriptHashFor(draft)
  const mp3 = join(draft.paths.audioDir, `${slug}.mp3`)
  const previous = readState(slug).stages.audio
  if (!force && !input && !dryRun && previous?.status === 'pass' && previous.scriptHash === scriptHash && existsSync(mp3)) {
    log.ok(`Narration is current: ${rel(mp3)} (use --force to re-render).`)
    return previous
  }

  log.step(input ? `Staging human recording ${input}` : `Narrating "${draft.fields.title}"`)
  const narration = await narrate(slug, { providerName, input, dryRun })
  if (dryRun) return null

  log.step('Mastering')
  const cover = join(draft.paths.imageDir, `${slug}.jpg`)
  const { out, sidecar, report } = await masterNarration(narration.file, {
    slug,
    title: draft.fields.title,
    cover: existsSync(cover) ? cover : null,
    coverFocus: coverFocus ?? 0.5,
    outDir: draft.paths.audioDir,
    acceptHeavyDynamics,
  })
  printReport(report)
  const p = pace(draft, sidecar.duration)
  log.info(`pace: ${p.words} spoken words in ${sidecar.duration}s = ${p.wps} words/s`)
  const paceOk = p.plausible || narration.record.provider === 'rehearsal'
  const transcript = narration.record.provider === 'rehearsal'
    ? { status: 'skipped', reason: 'rehearsal render' }
    : await verifyNarration(out, scriptText(draft))
  log.info(`transcript: ${transcript.status}${transcript.wer !== undefined ? ` (WER ${transcript.wer}, limit ${MAX_WER})` : transcript.reason ? ` (${transcript.reason})` : ''}`)
  const transcriptOk = transcript.status !== 'fail' && !(input && expectation !== 'human' && transcript.status !== 'pass')
  const record = writeStage(slug, 'audio', {
    status: report.verdict === 'pass' && paceOk && transcriptOk ? 'pass' : 'fail',
    scriptHash,
    provider: narration.record.provider,
    voice: narration.record.voice ?? null,
    file: rel(out),
    sha256: sidecar.sha256,
    bytes: sidecar.bytes,
    duration: sidecar.duration,
    durationISO: sidecar.durationISO,
    loudness: sidecar.loudness,
    failedChecks: sidecar.failedChecks,
    pace: p,
    transcript,
    dynamics: sidecar.process.dynamics,
    inputOverride: Boolean(input && expectation !== 'human'),
  })
  if (!transcriptOk) throw new GateError(`The narration does not read as this story (transcript ${transcript.status}${transcript.wer !== undefined ? `, WER ${transcript.wer}` : ''}).`)
  if (report.verdict !== 'pass') throw new GateError(`Mastered narration fails the spec (${sidecar.failedChecks.join('; ')}).`)
  if (!paceOk) throw new GateError(`Narration pace ${p.wps} words/s is not a reading of this text (expected 1.7-3.4). Wrong or truncated recording?`)
  return record
}

async function cli({ _, flags }) {
  const slug = _[0]
  const record = await runAudio(slug, {
    providerName: flags.provider,
    input: flags.input,
    dryRun: Boolean(flags['dry-run']),
    force: Boolean(flags.force),
    coverFocus: flags['cover-focus'],
    overrideExpectation: Boolean(flags['override-audio-expectation']),
    acceptHeavyDynamics: Boolean(flags['accept-heavy-dynamics']),
  })
  if (record?.status === 'pass') {
    log.ok(`story:audio passed: ${record.durationISO ?? ''} ${record.loudness ? `${record.loudness.integrated} LUFS / ${record.loudness.truePeak} dBTP` : ''}`)
    if (record.provider === 'rehearsal') {
      log.warn('Rehearsal render only (wrong words by design). Re-narrate with a real voice before approval.')
    } else {
      log.info(`Next (ladder step 8): a person listens to the MP3 and looks at the illustration, then runs \`pnpm story:approve ${slug} --by "<their name>"\` in their own terminal.`)
    }
  }
}

if (isEntry(import.meta.url)) {
  main(cli, {
    meta: import.meta.url,
    args: [1, 1],
    flags: { provider: 'string', input: 'string', 'dry-run': 'boolean', force: 'boolean', 'cover-focus': 'string', 'override-audio-expectation': 'boolean', 'accept-heavy-dynamics': 'boolean' },
  })
}
