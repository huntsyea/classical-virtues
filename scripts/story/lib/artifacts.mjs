// What is actually on disk for a story, measured from the files themselves.
//
// state.json is a cache. Every gate here recomputes what it can from the
// bytes: the illustration's format and size (ffprobe), the narration's full
// spec analysis, its ID3 title and story URL, its real duration and pace. The
// few things that cannot be recomputed from a file (which prompt made the
// image, which voice rendered the MP3, the transcript check) come from the
// stage records, are only accepted when they name the same sha256 as the file
// on disk, and are shown to the operator rather than taken as proof. A person
// with write access can still forge files and records together; the Basehub
// commit, made by a person, is the gate that matters.

import { join } from 'node:path'
import { readState, fileSha256, audioExpectation, SITE_URL } from './draft.mjs'
import { imageInputHash } from '../image.mjs'
import { scriptHashFor } from '../../audio/narrate.mjs'
import { paragraphs } from '../../audio/lib/readaloud.mjs'
import { analyzeFile, localize } from '../../audio/analyze.mjs'
import { allowedAssetHost } from './basehub-publish.mjs'
import { probe } from '../../audio/lib/ffmpeg.mjs'

/** Spoken words in the read-aloud script (title, body, moral). */
export function spokenWords(draft) {
  const text = [draft.fields.title, ...paragraphs(draft.body), draft.fields.virtueDescription].join(' ')
  return (text.match(/[\p{L}\p{N}'’]+/gu) ?? []).length
}

/** The read-aloud text (display spelling) the transcript is compared with. */
export function scriptText(draft) {
  return [draft.fields.title, ...paragraphs(draft.body), draft.fields.virtueDescription].join('\n')
}

/**
 * Narration pace in words per second of speech (pauses removed). Real
 * narration of these stories runs ~2.2-2.8; a truncated take or a recording of
 * a much longer or shorter text falls outside 1.7-3.4.
 */
export function pace(draft, durationSeconds) {
  const paras = paragraphs(draft.body).length
  const pauses = 1.2 + Math.max(0, paras - 1) * 0.75 + 1.5 + 1.4 // title, paragraph breaks, before moral, edges
  const words = spokenWords(draft)
  const wps = words / Math.max(1, durationSeconds - pauses)
  return { words, wps: Number(wps.toFixed(2)), plausible: wps >= 1.7 && wps <= 3.4 }
}

export async function imageArtifact(draft) {
  const record = readState(draft.slug).stages.image
  const file = join(draft.paths.imageDir, `${draft.slug}.jpg`)
  const sha256 = fileSha256(file)
  const problems = []
  if (!sha256) {
    problems.push(`No illustration master at ${file}. Run \`pnpm story:image ${draft.slug}\`.`)
    return { file, sha256, record, problems }
  }
  const v = (await probe(file)).streams.find((s) => s.codec_type === 'video')
  const ratio = v ? v.width / v.height : 0
  if (!v || v.codec_name !== 'mjpeg') problems.push('The illustration master is not a JPEG.')
  else if (v.width < 1536) problems.push(`The illustration is ${v.width}px wide; the master must be at least 1536px.`)
  else if (Math.abs(ratio - 1.5) / 1.5 > 0.01) problems.push(`The illustration is ${v.width}x${v.height}, not 3:2.`)
  if (!record) problems.push(`story:image has not run for this file. Run \`pnpm story:image ${draft.slug}\`.`)
  else if (record.sha256 !== sha256) problems.push('The illustration file on disk is not the one story:image produced; rerun story:image.')
  else if (record.inputHash !== imageInputHash(draft)) problems.push('imagePrompt changed since story:image ran; rerun it.')
  return { file, sha256, record, width: v?.width, height: v?.height, provenance: record?.provenance ?? null, problems }
}

const analysisMemo = new Map()
async function analyzeOnce(file, sha256) {
  if (!analysisMemo.has(sha256)) analysisMemo.set(sha256, await analyzeFile(file))
  return analysisMemo.get(sha256)
}

export async function audioArtifact(draft) {
  const expectation = audioExpectation(draft.fields)
  const record = readState(draft.slug).stages.audio
  const cmd = `pnpm story:audio ${draft.slug}`
  const problems = []
  const warnings = []
  if (expectation === 'none') {
    if (record?.status !== 'skipped') problems.push(`Draft says audio: "none"; run \`${cmd}\` to record the skip.`)
    return { expectation, file: null, sha256: null, record, problems, warnings }
  }
  let file
  if (expectation === 'url') {
    // Hosted narration is measured like a local master: download it (allowed
    // hosts only) and run every check on the bytes.
    const url = draft.fields.audio
    if (!allowedAssetHost(url)) {
      problems.push(`Hosted narration ${url} is not on this project's Blob store or assets.basehub.com.`)
      return { expectation, file: null, url, sha256: null, record, problems, warnings }
    }
    try {
      file = await localize(url)
    } catch (err) {
      problems.push(`Could not download hosted narration ${url}: ${err.message}`)
      return { expectation, file: null, url, sha256: null, record, problems, warnings }
    }
  } else {
    file = join(draft.paths.audioDir, `${draft.slug}.mp3`)
  }
  const sha256 = fileSha256(file)
  if (!sha256) {
    problems.push(`No mastered narration at ${file}. Run \`${cmd}\`.`)
    return { expectation, file, sha256, record, problems, warnings }
  }

  // Measured from the file.
  const report = await analyzeOnce(file, sha256)
  const failed = report.checks.filter((x) => !x.pass && x.severity === 'fail')
  if (failed.length) problems.push(`The MP3 fails the narration spec: ${failed.map((x) => `${x.label} (${x.actual})`).join('; ')}.`)
  if (report.id3.tags?.title !== draft.fields.title) problems.push(`The MP3 is tagged "${report.id3.tags?.title ?? '(no title)'}", not "${draft.fields.title}".`)
  if (report.id3.tags?.comment !== `${SITE_URL}/stories/${draft.slug}`) problems.push(`The MP3's story URL is "${report.id3.tags?.comment ?? '(none)'}", not ${SITE_URL}/stories/${draft.slug}.`)
  const p = pace(draft, report.duration)
  if (!p.plausible) problems.push(`Narration pace is ${p.wps} words/s for ${p.words} words; a reading of this text runs 1.7-3.4. Wrong or truncated recording?`)

  // From the stage record, accepted only for these exact bytes.
  if (!record) problems.push(`story:audio has not run for this file. Run \`${cmd}\`.`)
  else if (record.sha256 !== sha256) problems.push('The MP3 on disk is not the one story:audio mastered; rerun story:audio.')
  else {
    if (record.scriptHash !== scriptHashFor(draft)) problems.push('The spoken text changed since narration; rerun story:audio.')
    if (record.provider === 'rehearsal') problems.push('The narration is a rehearsal render (wrong words by design). Narrate with a real voice.')
  }
  if (record?.sha256 === sha256 && String(record.dynamics ?? '').startsWith('heavy')) {
    warnings.push('Heavy dynamics processing was accepted for this master: A/B it against the source before approving.')
  }
  const transcript = record?.transcript?.audioSha256 === sha256 ? record.transcript : { status: 'unverified', reason: 'no transcript check for this file' }
  if (transcript.status === 'fail') problems.push(`The transcript does not match the script (WER ${transcript.wer}); this is not a reading of this story.`)
  if (transcript.status !== 'pass') {
    if (record?.inputOverride) problems.push('A recording supplied with --override-audio-expectation must pass the transcript check; add OPENAI_API_KEY or ELEVENLABS_API_KEY and rerun story:audio.')
    else warnings.push('Transcript not verified (no transcription key): listen to the whole file before approving.')
  }
  return { expectation, file, url: expectation === 'url' ? draft.fields.audio : undefined, sha256, record, report, pace: p, transcript, problems, warnings }
}

/**
 * The approval record (from state.json) must name the current draft, both
 * notes, and both files. It is advisory: it shows that someone ran
 * story:approve on these bytes, not who they were.
 */
export function approvalProblems(draft, check, image, audio) {
  const approval = readState(draft.slug).stages.approval
  if (!approval || approval.status !== 'pass') return { approval, problems: [`No operator approval yet. A person runs \`pnpm story:approve ${draft.slug} --by "<their name>"\` after reviewing.`] }
  const mismatched = [
    ['draft', approval.draftHash, draft.hash],
    ['gate note', approval.gateHash, check.gate.hash],
    ['SEO note', approval.seoHash, check.seo.hash],
    ['illustration', approval.imageSha256, image.sha256],
    ['narration', approval.audioSha256 ?? null, audio.sha256 ?? null],
  ].filter(([, a, b]) => a !== b).map(([name]) => name)
  return {
    approval,
    problems: mismatched.length ? [`Approval is stale: the ${mismatched.join(', ')} changed after it was approved. Run \`pnpm story:approve ${draft.slug} --by "<their name>"\` again.`] : [],
  }
}
