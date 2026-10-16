// Sample-level measurements that loudness meters cannot give: how hard the
// limiter worked, and whether the de-esser acted only on sibilants.
//
// Both compare two time-aligned renders of the same speech (before and after a
// stage) in 10 ms windows, the scale of a single pitch period, so they expose
// waveform-level damage that integrated loudness hides. Method after the
// round-1 critic's tools (/tmp/cv-critic/tools/gr.mjs, sib.mjs).

import { execFileSync } from 'node:child_process'

const RATE = 44100
const WINDOW = Math.round(RATE * 0.01)

/** Decode a file (optionally through a filter) to mono float32 samples. */
export function samples(file, filter) {
  const args = ['-v', 'error', '-i', file, ...(filter ? ['-af', filter] : []), '-f', 'f32le', '-ac', '1', '-ar', String(RATE), '-']
  const buf = execFileSync('ffmpeg', args, { maxBuffer: 1 << 30 })
  return new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4)
}

const db = (x) => 20 * Math.log10(Math.max(x, 1e-9))
const pct = (arr, p) => arr[Math.min(arr.length - 1, Math.floor(arr.length * p))]

/**
 * Gain reduction per 10 ms speech window between `before` and `after`
 * (window peak ratio, in absolute dB: the stages measured here apply no makeup
 * gain, so nothing needs cancelling, and a median normalization would hide
 * reduction applied to most of the file). Silent windows (< -60 dBFS) are
 * skipped.
 */
export function gainReduction(before, after) {
  const x = samples(before)
  const y = samples(after)
  const n = Math.min(x.length, y.length)
  const grs = []
  for (let i = 0; i + WINDOW < n; i += WINDOW) {
    let px = 0
    let py = 0
    for (let k = i; k < i + WINDOW; k++) {
      px = Math.max(px, Math.abs(x[k]))
      py = Math.max(py, Math.abs(y[k]))
    }
    if (px < 1e-3) continue
    grs.push(db(px) - db(py))
  }
  if (!grs.length) return { windows: 0, over1dB: 0, over3dB: 0, over6dB: 0, p99: 0, max: 0 }
  const rel = [...grs].sort((a, b) => a - b)
  const share = (t) => Number(((100 * rel.filter((g) => g > t).length) / rel.length).toFixed(2))
  return {
    windows: rel.length,
    median: Number(pct(rel, 0.5).toFixed(2)),
    over1dB: share(1),
    over3dB: share(3),
    over6dB: share(6),
    p99: Number(pct(rel, 0.99).toFixed(2)),
    max: Number(rel[rel.length - 1].toFixed(2)),
  }
}

const HF = 'highpass=f=5000:poles=2,highpass=f=5000:poles=2,lowpass=f=10000:poles=2'
const MID = 'highpass=f=300:poles=2,lowpass=f=3000:poles=2'

function windowRms(x) {
  const out = []
  for (let i = 0; i + WINDOW < x.length; i += WINDOW) {
    let s = 0
    for (let k = i; k < i + WINDOW; k++) s += x[k] * x[k]
    out.push(Math.sqrt(s / WINDOW))
  }
  return out
}

/**
 * Sibilance profile of one render: how far the 5-10 kHz band sits above the
 * 300 Hz-3 kHz voice band on its loudest 5% of frames (positive = hissy).
 */
export function sibilanceProfile(file) {
  const h = windowRms(samples(file, HF))
  const m = windowRms(samples(file, MID))
  const idx = h.map((v, i) => i).filter((i) => h[i] > 1e-4)
  const top = [...idx].sort((a, b) => h[b] - h[a]).slice(0, Math.max(1, Math.floor(idx.length * 0.05)))
  const mean = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length
  return { prominenceDb: Number(mean(top.map((i) => db(h[i]) - db(m[i]))).toFixed(2)) }
}

/**
 * De-esser effect, `before` vs `after` (same level): mean 5-10 kHz change on
 * the 5% most sibilant frames, and on the quieter 70% of frames, both relative
 * to the voice band. A true de-esser moves the first and leaves the second ~0.
 */
export function deesserEffect(before, after) {
  const [ah, bh, am, bm] = [samples(before, HF), samples(after, HF), samples(before, MID), samples(after, MID)].map(windowRms)
  const n = Math.min(ah.length, bh.length)
  const idx = [...Array(n).keys()].filter((i) => ah[i] > 1e-4)
  const sorted = [...idx].sort((p, q) => ah[q] - ah[p])
  const top = sorted.slice(0, Math.max(1, Math.floor(idx.length * 0.05)))
  const rest = sorted.slice(Math.floor(idx.length * 0.3))
  const mean = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length
  const midOffset = mean(idx.map((i) => db(bm[i]) - db(am[i])))
  return {
    sibilantFramesDb: Number((mean(top.map((i) => db(bh[i]) - db(ah[i]))) - midOffset).toFixed(2)),
    otherFramesDb: Number((mean(rest.map((i) => db(bh[i]) - db(ah[i]))) - midOffset).toFixed(2)),
  }
}

/** Percentile of the 10 ms peak level of the de-esser's own detector band (linear). */
export function detectorPercentile(file, p, detector = 'highpass=f=6000:poles=2') {
  const x = samples(file, detector)
  const peaks = []
  for (let i = 0; i + WINDOW < x.length; i += WINDOW) {
    let pk = 0
    for (let k = i; k < i + WINDOW; k++) pk = Math.max(pk, Math.abs(x[k]))
    if (pk > 1e-4) peaks.push(pk)
  }
  peaks.sort((a, b) => a - b)
  return pct(peaks, p)
}
