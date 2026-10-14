// audio:analyze: QA report for one MP3 (local path or http(s) URL), graded
// against the narration spec in lib/spec.mjs.
//
//   pnpm audio:analyze <file.mp3|url> [more files] [--json out.json] [--quiet]
//
// Measures what a listener actually receives (the decoded MP3): EBU R128
// integrated loudness, true peak and LRA; duration; bitrate and CBR/VBR from
// the frame headers; sample rate and channels; ID3 version, tags and cover;
// Xing/Info + LAME header; head/tail silence; sample peak and clipping.
// Exit code 0 = pass, 1 = fail (so it can gate story:audio).

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, basename } from 'node:path'
import { tmpdir } from 'node:os'
import { assertFfmpeg, probe, measureR128, silenceEdges, sampleStats, isoDuration, round } from './lib/ffmpeg.mjs'
import { inspectMp3 } from './lib/mp3meta.mjs'
import { SPEC, evaluate, verdict } from './lib/spec.mjs'
import { main, isEntry, log, c, UsageError } from '../story/lib/cli.mjs'
import { sha256 } from '../story/lib/draft.mjs'

/** Fetch a URL to a temp file (cached by URL hash) and return the local path. */
export async function localize(source) {
  if (!/^https?:\/\//.test(source)) return source
  const dir = join(tmpdir(), 'cv-audio-analyze')
  mkdirSync(dir, { recursive: true })
  const file = join(dir, `${sha256(source).slice(0, 12)}-${basename(new URL(source).pathname) || 'audio.mp3'}`)
  const res = await fetch(source)
  if (!res.ok) throw new UsageError(`GET ${source} returned HTTP ${res.status}.`)
  writeFileSync(file, Buffer.from(await res.arrayBuffer()))
  return file
}

export async function analyzeFile(source) {
  assertFfmpeg()
  const file = await localize(source)
  const buf = readFileSync(file)
  const info = await probe(file)
  const stream = info.streams.find((s) => s.codec_type === 'audio')
  if (!stream) throw new UsageError(`${source} has no audio stream.`)
  const duration = Number(info.format.duration)
  const mp3 = stream.codec_name === 'mp3' ? inspectMp3(buf) : null
  const [loudness, asHeard, silence, stats] = await Promise.all([
    measureR128(file),
    measureR128(file, '', { dualmono: stream.channels === 1 }),
    silenceEdges(file, { thresholdDb: SPEC.silence.detectDb, duration }),
    sampleStats(file),
  ])
  const report = {
    source,
    file,
    bytes: buf.length,
    sha256: sha256(buf),
    duration: round(duration, 3),
    durationISO: isoDuration(duration),
    codec: stream.codec_name,
    sampleRate: Number(stream.sample_rate),
    channels: stream.channels,
    bitrateKbps: mp3?.bitrateKbps ?? Math.round(Number(info.format.bit_rate) / 1000),
    cbr: mp3 ? mp3.cbr : null,
    bitrateHistogram: mp3?.bitrates ?? null,
    loudness: {
      integrated: loudness.integrated,
      truePeak: loudness.truePeak,
      lra: loudness.lra,
      threshold: loudness.threshold,
    },
    // Mono files play through both speakers; this is the number a listener's
    // ears (and Apple's -16 LUFS reference) see.
    loudnessDualMono: { integrated: asHeard.integrated, truePeak: asHeard.truePeak },
    silence: { head: silence.head, tail: silence.tail, thresholdDb: SPEC.silence.detectDb },
    clipping: {
      peakDb: round(stats.peakDb, 2),
      flatFactor: round(stats.flatFactor, 2),
      peakCount: stats.peakCount,
      clipped: stats.peakDb >= -0.1 && (stats.flatFactor > 0 || stats.peakCount > 2),
    },
    header: mp3?.header ?? { xing: null, lame: null },
    id3: mp3
      ? { version: mp3.id3.version, size: mp3.id3.size, tags: mp3.id3.tags, frames: mp3.id3.frames, extraFrames: mp3.id3.extraFrames, cover: mp3.id3.cover }
      : { version: null, size: 0, tags: {}, frames: [], extraFrames: [], cover: null },
    id3v1: mp3?.id3v1 ?? false,
    container: info.format.format_name,
  }
  report.checks = evaluate(report)
  report.verdict = verdict(report.checks)
  return report
}

export function printReport(report) {
  console.log(c.bold(`\n${report.source}`))
  console.log(
    c.dim(
      `  ${report.durationISO} (${report.duration}s) · ${(report.bytes / 1024).toFixed(0)} KB · ${report.codec} ${report.bitrateKbps} kbps · ${report.sampleRate} Hz · ${report.channels} ch · ${report.loudness.integrated} LUFS (${report.loudnessDualMono.integrated} as heard) · sha256 ${report.sha256.slice(0, 12)}`,
    ),
  )
  const width = Math.max(...report.checks.map((x) => x.label.length))
  for (const check of report.checks) {
    const mark = check.pass ? c.green('pass') : check.severity === 'warn' ? c.yellow('warn') : c.red('FAIL')
    console.log(`  ${mark}  ${check.label.padEnd(width)}  ${check.actual}${check.pass ? '' : c.dim(`  (want ${check.expected})`)}`)
  }
  const v = report.verdict === 'pass' ? c.green('PASS') : c.red('FAIL')
  console.log(`  ${c.bold('verdict')} ${v}\n`)
}

async function cli({ _, flags }) {
  const reports = []
  for (const source of _) {
    const report = await analyzeFile(source)
    reports.push(report)
    if (!flags.quiet) printReport(report)
  }
  if (flags.json) {
    writeFileSync(flags.json, JSON.stringify(reports.length === 1 ? reports[0] : reports, null, 2) + '\n')
    log.ok(`Report written to ${flags.json}`)
  }
  return reports.every((r) => r.verdict === 'pass') ? 0 : 1
}

if (isEntry(import.meta.url)) main(cli, { meta: import.meta.url, args: [1, Infinity], flags: { json: 'string', quiet: 'boolean' } })
