// Thin, dependency-free wrappers around ffmpeg/ffprobe for the narration pipeline.
//
// Everything that measures audio goes through here so `master` and `analyze`
// agree on numbers: EBU R128 loudness via the `ebur128` filter (true peak with
// 4x oversampling), loudnorm's own JSON measurement for the two-pass apply,
// silence edges via `silencedetect`, and sample-peak/clipping via `astats`.

import { spawn, spawnSync } from 'node:child_process'
import { UsageError } from '../../story/lib/cli.mjs'

let checked = false

export function assertFfmpeg() {
  if (checked) return
  for (const bin of ['ffmpeg', 'ffprobe']) {
    const r = spawnSync(bin, ['-version'], { encoding: 'utf8' })
    if (r.error || r.status !== 0) {
      throw new UsageError(`${bin} is required but was not found on PATH. Install ffmpeg (with libmp3lame) and retry.`)
    }
  }
  checked = true
}

export function ffmpegVersion() {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-version'], { encoding: 'utf8' })
  return (r.stdout || '').split('\n')[0].replace(/^ffmpeg version\s+/, '').split(' ')[0]
}

/** Run a command, resolve with { stdout, stderr }, reject with stderr tail on failure. */
export function run(bin, args, { input } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ['pipe', 'pipe', 'pipe'] })
    const out = []
    const err = []
    child.stdout.on('data', (d) => out.push(d))
    child.stderr.on('data', (d) => err.push(d))
    child.on('error', reject)
    child.on('close', (code) => {
      const stdout = Buffer.concat(out).toString('utf8')
      const stderr = Buffer.concat(err).toString('utf8')
      if (code === 0) resolve({ stdout, stderr })
      else reject(new Error(`${bin} exited ${code}:\n${stderr.split('\n').slice(-25).join('\n')}`))
    })
    if (input) child.stdin.end(input)
    else child.stdin.end()
  })
}

export const ffmpeg = (args) => run('ffmpeg', ['-hide_banner', '-nostdin', '-y', ...args])

export async function probe(file) {
  const { stdout } = await run('ffprobe', [
    '-v', 'error',
    '-show_format',
    '-show_streams',
    '-of', 'json',
    file,
  ])
  return JSON.parse(stdout)
}

/**
 * Integrated loudness, LRA, threshold and true peak (EBU R128 / BS.1770).
 * `dualmono: true` measures a mono file as played through two speakers (+3 LU).
 */
export async function measureR128(file, filterPrefix = '', { dualmono = false } = {}) {
  const chain = `${filterPrefix ? filterPrefix + ',' : ''}ebur128=peak=true:framelog=quiet${dualmono ? ':dualmono=true' : ''}`
  const { stderr } = await ffmpeg(['-nostats', '-i', file, '-filter_complex', chain, '-f', 'null', '-'])
  const summary = stderr.slice(stderr.lastIndexOf('Summary:'))
  const num = (re) => {
    const m = summary.match(re)
    return m ? Number(m[1]) : null
  }
  return {
    integrated: num(/I:\s+(-?[\d.]+|-inf)\s+LUFS/),
    threshold: num(/Integrated loudness:[\s\S]*?Threshold:\s+(-?[\d.]+)\s+LUFS/),
    lra: num(/LRA:\s+(-?[\d.]+)\s+LU/),
    truePeak: num(/True peak:[\s\S]*?Peak:\s+(-?[\d.]+|-inf)\s+dBFS/),
  }
}

/** loudnorm first-pass measurement (its own JSON block) after an optional pre-chain. */
export async function loudnormMeasure(file, preChain, target) {
  const chain = [preChain, `loudnorm=I=${target.I}:TP=${target.TP}:LRA=${target.LRA}:print_format=json`]
    .filter(Boolean)
    .join(',')
  const { stderr } = await ffmpeg(['-nostats', '-i', file, '-af', chain, '-f', 'null', '-'])
  return parseLoudnormJson(stderr)
}

export function parseLoudnormJson(stderr) {
  const start = stderr.lastIndexOf('{')
  const end = stderr.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('loudnorm did not print a JSON measurement.')
  return JSON.parse(stderr.slice(start, end + 1))
}

/**
 * Leading/trailing silence in seconds, measured at `thresholdDb` with a minimum
 * gap of `minSilence`. Also returns where speech starts and ends.
 */
export async function silenceEdges(file, { thresholdDb = -50, minSilence = 0.05, duration } = {}) {
  const { stderr } = await ffmpeg([
    '-nostats', '-i', file,
    '-af', `silencedetect=noise=${thresholdDb}dB:d=${minSilence}`,
    '-f', 'null', '-',
  ])
  const total = duration ?? (await durationOf(file))
  const starts = [...stderr.matchAll(/silence_start:\s*(-?[\d.]+)/g)].map((m) => Math.max(0, Number(m[1])))
  const ends = [...stderr.matchAll(/silence_end:\s*([\d.]+)/g)].map((m) => Number(m[1]))
  const EPS = 0.02
  let head = 0
  if (starts.length && starts[0] <= EPS) head = ends[0] ?? total
  let tail = 0
  const lastStart = starts[starts.length - 1]
  if (starts.length && (ends.length < starts.length || Math.abs(ends[ends.length - 1] - total) <= EPS)) {
    tail = total - lastStart
  }
  return {
    head: round(head, 3),
    tail: round(Math.max(0, tail), 3),
    speechStart: round(head, 3),
    speechEnd: round(total - Math.max(0, tail), 3),
    duration: round(total, 3),
  }
}

/** Sample-peak level and clipping indicators from astats (overall section). */
export async function sampleStats(file) {
  const { stderr } = await ffmpeg([
    '-nostats', '-i', file,
    '-af', 'astats=measure_perchannel=none:measure_overall=Peak_level+Peak_count+Flat_factor+RMS_level+Noise_floor',
    '-f', 'null', '-',
  ])
  const overall = stderr.slice(stderr.lastIndexOf('Overall'))
  const num = (label) => {
    const m = overall.match(new RegExp(`${label}:\\s*(-?[\\d.]+|-?inf)`))
    if (!m) return null
    return m[1].endsWith('inf') ? (m[1].startsWith('-') ? -Infinity : Infinity) : Number(m[1])
  }
  return {
    peakDb: num('Peak level dB'),
    peakCount: num('Peak count'),
    flatFactor: num('Flat factor'),
    rmsDb: num('RMS level dB'),
    noiseFloorDb: num('Noise floor dB'),
  }
}

export async function durationOf(file) {
  const { stdout } = await run('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file,
  ])
  return Number(stdout.trim())
}

export const round = (n, places = 2) => (n === null || !Number.isFinite(n) ? n : Number(n.toFixed(places)))

/** ISO 8601 duration (PT#M#S) for structured data such as schema.org AudioObject. */
export function isoDuration(seconds) {
  const total = Math.round(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `PT${h ? `${h}H` : ''}${m ? `${m}M` : ''}${s || (!h && !m) ? `${s}S` : ''}`
}
