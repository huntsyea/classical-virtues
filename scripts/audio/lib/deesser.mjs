// Conservative split-band de-esser: acts only on sibilants that are loud for
// this voice, not on every /s/.
//
// Detection: per 5 ms frame, the RMS of the 5-10 kHz band. A frame is cut
// only when it exceeds that band's own 95th percentile by more than
// `aboveP95Db`, so a voice with ordinary sibilance is left alone and a harsh
// one loses only its worst peaks. The cut is (excess x (1 - 1/ratio)), at most
// `rangeDb`, applied to the 4.5 kHz+ band through a zero-phase split (frames
// that are not cut are bit-identical), with 1 ms attack and 40 ms release.
// If that still produces more than `maxEventsPerMinute` cuts over 3 dB, the
// threshold rises 1 dB at a time until it does not.
//
// `master` runs it only when the file's sibilance is clearly excessive: the
// loudest 5% of high-band frames more than 4 dB above the voice band
// (metrics.sibilanceProfile). Neither live narration qualifies (Androcles
// +2.3 dB, Cherry Tree -2.2 dB).

import { execFileSync } from 'node:child_process'
import { samples } from './metrics.mjs'

const RATE = 44100
const FRAME = Math.round(RATE * 0.005)
export const DEESSER = { applyAboveProminenceDb: 4, aboveP95Db: 3, ratio: 3, rangeDb: 6, attackMs: 1, releaseMs: 40, maxEventsPerMinute: 20 }

const db = (x) => 20 * Math.log10(Math.max(x, 1e-9))

function frameRms(x) {
  const out = new Float32Array(Math.ceil(x.length / FRAME))
  for (let f = 0; f < out.length; f++) {
    let s = 0
    const end = Math.min(x.length, (f + 1) * FRAME)
    for (let k = f * FRAME; k < end; k++) s += x[k] * x[k]
    out[f] = Math.sqrt(s / Math.max(1, end - f * FRAME))
  }
  return out
}

function render(x, high, band, thresholdDb, opts) {
  const target = new Float32Array(band.length)
  for (let f = 0; f < band.length; f++) {
    const excess = db(band[f]) - thresholdDb
    const cut = excess > 0 ? Math.min(opts.rangeDb, excess * (1 - 1 / opts.ratio)) : 0
    target[f] = Math.pow(10, -cut / 20)
  }
  const atk = Math.exp(-1 / (RATE * opts.attackMs / 1000))
  const rel = Math.exp(-1 / (RATE * opts.releaseMs / 1000))
  const out = new Float32Array(x.length)
  let g = 1
  let minG = 1
  let events = 0
  let inEvent = false
  const deep = Math.pow(10, -3 / 20)
  for (let i = 0; i < x.length; i++) {
    const t = target[Math.floor(i / FRAME)]
    g = t + (g - t) * (t < g ? atk : rel)
    if (g < minG) minG = g
    if (g < deep && !inEvent) {
      events++
      inEvent = true
    } else if (g >= deep) inEvent = false
    out[i] = x[i] - (1 - g) * high[i]
  }
  return { out, events, maxCutDb: Number((-db(minG)).toFixed(2)) }
}

/** De-ess `input` into a 32-bit float WAV at `output`. Returns stats. */
export function deess(input, output, opts = DEESSER) {
  const x = samples(input)
  const high = samples(input, 'highpass=f=4500:poles=2,areverse,highpass=f=4500:poles=2,areverse')
  const band = frameRms(samples(input, 'highpass=f=5000:poles=2,highpass=f=5000:poles=2,lowpass=f=10000:poles=2'))
  const levels = [...band].filter((v) => v > 1e-4).map(db).sort((a, b) => a - b)
  const p95 = levels[Math.floor(levels.length * 0.95)] ?? 0
  const minutes = x.length / RATE / 60
  let thresholdDb = p95 + opts.aboveP95Db
  let r = render(x, high, band, thresholdDb, opts)
  for (let i = 0; i < 6 && r.events / minutes > opts.maxEventsPerMinute; i++) {
    thresholdDb += 1
    r = render(x, high, band, thresholdDb, opts)
  }
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'f32le', '-ar', String(RATE), '-ac', '1', '-i', '-', '-c:a', 'pcm_f32le', output], {
    input: Buffer.from(r.out.buffer),
    maxBuffer: 1 << 30,
  })
  return { ...opts, bandP95Db: Number(p95.toFixed(1)), thresholdDb: Number(thresholdDb.toFixed(1)), eventsOver3dB: r.events, eventsPerMinute: Number((r.events / minutes).toFixed(1)), maxCutDb: r.maxCutDb }
}
