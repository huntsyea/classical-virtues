// audio:master: turn a narration (TTS render or human recording, any format
// ffmpeg reads) into the delivery MP3 described in lib/spec.mjs.
//
//   pnpm audio:master --story <slug>
//       input  content/drafts/<slug>/audio/narration.wav   (from audio:narrate)
//       cover  content/drafts/<slug>/image/<slug>.jpg      (from story:image)
//       title  from the draft frontmatter
//   pnpm audio:master <input> --slug <slug> [--title "..."] [--cover file|url]
//       [--out-dir dir] [--year YYYY] [--cover-focus 0..1] [--keep-work] [--accept-heavy-dynamics]
//       (title and cover default to the published story in backups/basehub/latest.json)
//
// Chain, in order:
//   1. decode to 32-bit float mono 44.1 kHz (soxr resampler)
//   2. pre-gain to -20 LUFS so every later stage sees the same level whatever
//      the source (TTS renders arrive near -22, home recordings near -30)
//   3. high-pass 75 Hz (rumble, plosive thumps; a voice has nothing useful
//      below it); light 2:1 compression only when the source's LRA is over
//      6 LU, with its gain reduction measured
//   4. de-ess only when sibilance is clearly excessive (lib/deesser.mjs)
//   5. trim edge silence by measurement, then pad to exactly 0.4 s head and
//      1.0 s tail with short fades over room tone only
//   6. peak control + two-pass linear loudnorm + encode, as a search from the
//      lightest limiting up: each candidate is encoded to 64 kbps CBR and the
//      decoded MP3 measured; the first that lands comfortably inside the spec
//      (within ±0.25 LU of -19 LUFS, at or under -1.6 dBTP) wins, else the
//      lightest that is merely in spec (±0.5 LU, -1.5 dBTP). loudnorm pass 2 is linear (one constant gain);
//      a dynamic-mode fallback is refused
//   7. dynamics budget, compressor + de-esser + limiter together, as the share
//      of 10 ms speech windows losing more than 3 dB: up to 2% passes; 2-10%
//      needs --accept-heavy-dynamics (recorded, flagged at approval, A/B it);
//      over 10% always fails
//   8. a hand-built ID3v2.3 tag + 600x600 JPEG cover (20 KB budget)
//   9. audio:analyze on the result, plus a JSON sidecar next to the MP3 with
//      every measurement and decision (de-esser, limiter, gain reduction)

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { assertFfmpeg, ffmpeg, ffmpegVersion, measureR128, loudnormMeasure, parseLoudnormJson, silenceEdges, durationOf, round } from './lib/ffmpeg.mjs'
import { buildId3v23 } from './lib/mp3meta.mjs'
import { SPEC } from './lib/spec.mjs'
import { deess, DEESSER } from './lib/deesser.mjs'
import { gainReduction, sibilanceProfile, deesserEffect } from './lib/metrics.mjs'
import { analyzeFile, localize, printReport } from './analyze.mjs'
import { main, isEntry, log, UsageError, GateError, assertSlug, REPO_ROOT } from '../story/lib/cli.mjs'
import { draftPaths, loadDraft, sha256, rel, SITE_URL } from '../story/lib/draft.mjs'

const RESAMPLE = 'aresample=44100:resampler=soxr:precision=28'
const PRE_LEVEL = -20 // LUFS fed to the compressor
// Light compression for wide-range sources only. acompressor's `knee` is a
// linear factor (2.83 is about a 9 dB knee); with the -12 dB threshold it
// starts near -16 dBFS RMS, above the -20 LUFS working level, so it touches
// only the loudest phrases. TTS renders and most narration (LRA <= 6 LU) skip
// it: they are already even, and compressing them only flattens the reading.
const COMPRESSOR = 'acompressor=threshold=-12dB:ratio=2:knee=2.83:attack=10:release=200:detection=rms:makeup=1'
const COMPRESS_ABOVE_LRA = 6

/**
 * Master `input` into `${outDir}/${slug}.mp3` and return the sidecar object.
 * opts: { slug, title, cover (path|url|null), outDir, year, coverFocus, keepWork, quiet, acceptHeavyDynamics }
 */
export async function masterNarration(input, opts) {
  assertFfmpeg()
  const { slug, title } = opts
  assertSlug(slug)
  if (!title) throw new UsageError('master needs a title.')
  if (!existsSync(input)) throw new UsageError(`Input not found: ${input}`)
  const outDir = opts.outDir ?? draftPaths(slug).audioDir
  mkdirSync(outDir, { recursive: true })
  const work = mkdtempSync(join(tmpdir(), `cv-master-${slug}-`))
  const say = opts.quiet ? () => {} : log.info
  const wav = (name) => join(work, `${name}.wav`)
  const F32 = ['-c:a', 'pcm_f32le']

  try {
    // 1. Decode.
    await ffmpeg(['-i', input, '-vn', '-ac', '1', '-af', RESAMPLE, ...F32, wav('decoded')])
    const source = await measureR128(wav('decoded'))
    if (source.integrated === null || source.integrated < -70) throw new UsageError(`${input} is silent or unreadable.`)
    say(`source: ${source.integrated} LUFS, ${source.truePeak} dBTP, LRA ${source.lra} LU`)

    // 2-3. Pre-gain and high-pass; compression only for wide-range sources.
    const preGain = round(PRE_LEVEL - source.integrated, 2)
    const pregain = `volume=${preGain}dB,highpass=f=${SPEC.highpassHz}:poles=2`
    await ffmpeg(['-i', wav('decoded'), '-af', pregain, ...F32, wav('pregain')])
    // Measured on Androcles: compressing a dense source and then limiting it
    // stacks gain reduction in the same windows (11% over 3 dB) and does more
    // than the limiter alone (8%), so only wide-range sources are compressed.
    const compress = source.lra > COMPRESS_ABOVE_LRA
    if (compress) await ffmpeg(['-i', wav('pregain'), '-af', COMPRESSOR, ...F32, wav('compressed')])
    else await ffmpeg(['-i', wav('pregain'), ...F32, wav('compressed')])
    const compressor = compress
      ? { applied: true, settings: COMPRESSOR, gainReduction: gainReduction(wav('pregain'), wav('compressed')) }
      : { applied: false, reason: `source LRA ${source.lra} LU <= ${COMPRESS_ABOVE_LRA}` }
    say(`compressor: ${compress ? `${compressor.gainReduction.over3dB}% of windows over 3 dB, median ${compressor.gainReduction.median} dB` : `skipped (${compressor.reason})`}`)

    // 4. De-ess only when sibilance is clearly excessive.
    const sib = sibilanceProfile(wav('compressed'))
    let deesser = { applied: false, prominenceDb: sib.prominenceDb, reason: `sibilants ${sib.prominenceDb} dB relative to the voice band (applies above +${DEESSER.applyAboveProminenceDb})` }
    if (sib.prominenceDb > DEESSER.applyAboveProminenceDb) {
      const stats = deess(wav('compressed'), wav('shaped'))
      deesser = { applied: true, prominenceDb: sib.prominenceDb, ...stats, effect: deesserEffect(wav('compressed'), wav('shaped')) }
      say(`de-esser: ${stats.eventsPerMinute} cuts/min over 3 dB (max ${stats.maxCutDb} dB); sibilant frames ${deesser.effect.sibilantFramesDb} dB, others ${deesser.effect.otherFramesDb} dB`)
    } else {
      await ffmpeg(['-i', wav('compressed'), ...F32, wav('shaped')])
      say(`de-esser: skipped (${deesser.reason})`)
    }

    // 5. Edge trim by measurement, then exact padding.
    const edges = await silenceEdges(wav('shaped'), { thresholdDb: SPEC.silence.detectDb })
    const { head: HEAD, tail: TAIL } = SPEC.silence
    const start = Math.max(0, edges.speechStart - HEAD)
    const end = Math.min(edges.duration, edges.speechEnd + TAIL)
    const padHead = Math.max(0, HEAD - edges.speechStart)
    const padTail = Math.max(0, edges.speechEnd + TAIL - edges.duration)
    const trimmedLen = end - start + padHead + padTail
    const trim = [
      `atrim=start=${start.toFixed(4)}:end=${end.toFixed(4)}`,
      'asetpts=PTS-STARTPTS',
      padHead > 0 ? `adelay=${Math.round(padHead * 1000)}:all=1` : null,
      padTail > 0 ? `apad=pad_dur=${padTail.toFixed(4)}` : null,
      `afade=t=in:d=${Math.min(0.15, HEAD / 2)}`,
      `afade=t=out:st=${(trimmedLen - TAIL / 2).toFixed(4)}:d=${(TAIL / 2).toFixed(4)}`,
    ].filter(Boolean).join(',')
    await ffmpeg(['-i', wav('shaped'), '-af', trim, ...F32, wav('trimmed')])
    await ffmpeg(['-i', wav('pregain'), '-af', trim, ...F32, wav('pregain-trimmed')]) // aligned reference for the dynamics budget
    say(`edges: speech ${edges.speechStart}s → ${edges.speechEnd}s of ${edges.duration}s; kept ${HEAD}s head, ${TAIL}s tail`)

    // 6-7. Peak control, two-pass linear loudnorm, encode, limiter budget.
    const render = await peakNormalizeEncode(wav('trimmed'), work, say)
    const { encoded, pass1, pass2, limiter, targetLra, aimI } = render
    const none = { windows: 0, median: 0, over1dB: 0, over3dB: 0, over6dB: 0, p99: 0, max: 0 }
    const gr = render.limitedFile ? gainReduction(wav('trimmed'), render.limitedFile) : none
    // One budget for all dynamics processing: compressor + de-esser + limiter,
    // measured from the trimmed pre-gain signal to the limiter's output.
    const total = gainReduction(wav('pregain-trimmed'), render.limitedFile ?? wav('trimmed'))
    say(`limiter: ${gr.over3dB}% of windows over 3 dB (max ${gr.max} dB); all dynamics: ${total.over3dB}% over 3 dB, median ${total.median} dB (budget ${SPEC.limiting.maxShareOver3dB}%)`)
    const { maxShareOver3dB: LIGHT, hardMaxShareOver3dB: HARD } = SPEC.limiting
    const sourcePlr = render.limiter?.sourcePlr ?? round(source.truePeak - source.integrated, 1) // after the high-pass, as in the sidecar
    let dynamics = 'light'
    if (total.over3dB > HARD) {
      throw new GateError(`Dynamics processing too heavy: ${total.over3dB}% of speech windows lost more than 3 dB (hard limit ${HARD}%). Re-render the source (lossless TTS output, or a calmer take).`)
    } else if (total.over3dB > LIGHT) {
      if (!opts.acceptHeavyDynamics) {
        throw new GateError(`Dynamics processing is heavy: ${total.over3dB}% of speech windows lost more than 3 dB (light budget ${LIGHT}%). This source has a ${sourcePlr} dB peak-to-loudness ratio after the high-pass. Prefer re-rendering it; or pass --accept-heavy-dynamics, and A/B the result against the source before approving.`)
      }
      dynamics = 'heavy (accepted with --accept-heavy-dynamics; A/B before approving)'
      log.warn(`Heavy dynamics accepted: ${total.over3dB}% of windows over 3 dB. Listen against the source before approving.`)
    }
    const coverJpeg = opts.cover ? await makeCover(opts.cover, work, opts.coverFocus ?? 0.5) : null
    const lengthMs = (await durationOf(encoded)) * 1000
    const url = `${SITE_URL}/stories/${slug}`
    const tag = buildId3v23(
      { title, artist: SPEC.id3.artist, album: SPEC.id3.album, genre: SPEC.id3.genre, year: opts.year ?? new Date().getFullYear(), comment: url, lengthMs },
      coverJpeg,
    )
    const out = join(outDir, `${slug}.mp3`)
    const mp3 = Buffer.concat([tag, readFileSync(encoded)])
    writeFileSync(out, mp3)

    // 8. Analyze and write the sidecar.
    const report = await analyzeFile(out)
    const sidecar = {
      slug,
      title,
      file: rel(out),
      bytes: report.bytes,
      sha256: report.sha256,
      duration: report.duration,
      durationISO: report.durationISO,
      bitrateKbps: report.bitrateKbps,
      cbr: report.cbr,
      sampleRate: report.sampleRate,
      channels: report.channels,
      loudness: report.loudness,
      silence: report.silence,
      loudnessAsHeard: report.loudnessDualMono,
      verdict: report.verdict,
      failedChecks: report.checks.filter((x) => !x.pass).map((x) => `${x.id}: ${x.actual}`),
      canonicalUrl: url,
      coverBytes: coverJpeg?.length ?? 0,
      coverFocus: coverJpeg ? Number(opts.coverFocus ?? 0.5) : null,
      masteredAt: new Date().toISOString(),
      input: {
        file: input,
        sha256: sha256(readFileSync(input)),
        loudness: source,
      },
      process: {
        ffmpeg: ffmpegVersion(),
        preGainDb: preGain,
        chain: [pregain, compress ? COMPRESSOR : null].filter(Boolean).join(','),
        compressor,
        deesser,
        dynamics,
        gainReduction: { limiter: gr, allDynamics: total },
        lraDropLu: round(source.lra - report.loudness.lra, 1),
        trim: { speechStart: edges.speechStart, speechEnd: edges.speechEnd, sourceDuration: edges.duration, padHead: round(padHead, 3), padTail: round(padTail, 3) },
        limiter,
        loudnormPass1: pass1,
        loudnormPass2: { normalization_type: pass2.normalization_type, output_i: pass2.output_i, output_tp: pass2.output_tp, output_lra: pass2.output_lra, target_lra: targetLra, aimed_i: aimI },
        encoder: `libmp3lame CBR ${SPEC.bitrateKbps} kbps mono ${SPEC.sampleRate} Hz, Xing/Info + LAME header, ID3v2.3`,
      },
    }
    writeFileSync(join(outDir, `${slug}.json`), JSON.stringify(sidecar, null, 2) + '\n')
    return { out, sidecar, report }
  } finally {
    if (!opts.keepWork) rmSync(work, { recursive: true, force: true })
    else log.info(`work files kept in ${work}`)
  }
}

// Peak-limiter ceilings to try, as peak-to-loudness ratios (dB above the
// trimmed signal's integrated loudness), lightest first. At -19 LUFS under
// -1.5 dBTP the deliverable may carry a 17.5 dB ratio, so most speech needs
// only its few sharpest plosives shaved. Below 14 dB the limiter would be
// reshaping syllables; the gain-reduction budget would refuse that anyway.
const LIMIT_CEILINGS = [17, 16.5, 16, 15.5, 15, 14.5, 14]
const LIMITER = 'alimiter=attack=1:release=50:level=0:latency=1'
// LAME at 64 kbps loses about 0.35 LU (its lowpass); aim that much hot first.
const LAME_LOSS_LU = 0.35

/**
 * Pick the lightest peak limiting whose encoded MP3 meets the loudness spec.
 * Each candidate limits the untouched source (4x oversampled so it sees true
 * peaks), runs loudnorm pass 1 (measure) and pass 2 (linear), encodes, and
 * measures the decoded MP3. LAME's lowpass costs ~0.3-0.4 LU at 64 kbps, so a
 * passing candidate gets one re-aimed pass 2 at the same ceiling to land closer.
 */
async function peakNormalizeEncode(source, work, say) {
  const F32 = ['-c:a', 'pcm_f32le']
  const { I: TARGET_I, TP: TARGET_TP } = SPEC.loudness
  const TOL = SPEC.tolerance.I
  // Comfortable = clear of the spec edges, so a re-encode or decoder
  // difference cannot push the file out of spec.
  const comfortable = (m) => m.truePeak <= TARGET_TP - 0.1 && Math.abs(TARGET_I - m.integrated) <= 0.25
  const shaped = await loudnormMeasure(source, '', SPEC.loudness)
  const sourcePlr = Number(shaped.input_tp) - Number(shaped.input_i)
  const ceilings = [null, ...LIMIT_CEILINGS.filter((c) => c < sourcePlr)]
  let aimI = TARGET_I + LAME_LOSS_LU
  let acceptable = null
  let extraCeilings = 2 // after the first in-spec result, look this much further for a comfortable one

  for (const ceilPlr of ceilings) {
    let current = source
    let limiter = null
    if (ceilPlr !== null) {
      const ceilingDb = Number(shaped.input_i) + ceilPlr
      current = join(work, `limited-${ceilPlr}.wav`)
      await ffmpeg([
        '-i', source,
        '-af', `aresample=176400:resampler=soxr:precision=28,${LIMITER}:limit=${Math.max(0.0625, Math.pow(10, ceilingDb / 20)).toFixed(6)},${RESAMPLE}`,
        ...F32, current,
      ])
      limiter = { ceilingPlr: ceilPlr, ceilingDbfs: round(ceilingDb, 2), sourcePlr: round(sourcePlr, 2), settings: LIMITER }
    }
    const pass1 = ceilPlr === null ? shaped : await loudnormMeasure(current, '', SPEC.loudness)
    if (limiter) limiter.resultPlr = round(Number(pass1.input_tp) - Number(pass1.input_i), 2)

    for (let reaim = 0; reaim < 3; reaim++) {
      const preEncodeTp = Number(pass1.input_tp) + (aimI - Number(pass1.input_i))
      if (preEncodeTp > TARGET_TP) break // one linear gain would exceed the ceiling: limit a little more
      const targetLra = Math.max(SPEC.loudness.LRA, Math.ceil((Number(pass1.input_lra) + 0.5) * 10) / 10)
      const ln = [
        `loudnorm=I=${round(aimI, 2)}:TP=${TARGET_TP}:LRA=${targetLra}`,
        `measured_I=${pass1.input_i}:measured_TP=${pass1.input_tp}`,
        `measured_LRA=${pass1.input_lra}:measured_thresh=${pass1.input_thresh}`,
        `offset=${pass1.target_offset}:linear=true:print_format=json`,
      ].join(':')
      const normalized = join(work, 'normalized.wav')
      const { stderr } = await ffmpeg(['-i', current, '-af', `${ln},${RESAMPLE}`, ...F32, normalized])
      const pass2 = parseLoudnormJson(stderr)
      if (pass2.normalization_type !== 'linear') break
      const encoded = join(work, `encoded-${ceilPlr ?? 'none'}-${reaim}.mp3`)
      await ffmpeg([
        '-i', normalized,
        '-map', '0:a', '-map_metadata', '-1',
        '-ac', '1', '-ar', String(SPEC.sampleRate),
        '-c:a', 'libmp3lame', '-b:a', `${SPEC.bitrateKbps}k`,
        '-id3v2_version', '0', '-write_id3v1', '0', '-write_xing', '1',
        '-fflags', '+bitexact', '-flags:a', '+bitexact',
        encoded,
      ])
      const m = await measureR128(encoded)
      say(`limiter ${ceilPlr === null ? 'off' : `${ceilPlr} dB PLR ceiling`}, aimed ${round(aimI, 2)} LUFS → MP3 ${m.integrated} LUFS, ${m.truePeak} dBTP`)
      const candidate = { encoded, pass1, pass2, limiter, limitedFile: ceilPlr === null ? null : current, targetLra, aimI: round(aimI, 2), encodedI: m.integrated, encodedTP: m.truePeak }
      if (comfortable(m)) return candidate
      const inSpec = m.truePeak <= TARGET_TP && Math.abs(TARGET_I - m.integrated) <= TOL
      if (inSpec && !acceptable) acceptable = candidate
      if (Math.abs(TARGET_I - m.integrated) <= 0.25) break // loudness right; peaks need the next ceiling
      aimI += TARGET_I - m.integrated
    }
    if (acceptable && --extraCeilings < 0) break
  }
  if (acceptable) {
    say('accepting a candidate at the edge of the spec: nothing lighter landed comfortably inside it')
    return acceptable
  }
  throw new Error('No limiter setting within the gain-reduction range met the loudness spec; inspect the source with --keep-work.')
}

/**
 * Crop to square (horizontal focus 0..1), scale to 600x600, and step JPEG
 * quality down until it fits SPEC.cover.maxBytes (the cover sits in front of
 * the first audio frame). Warns if even the lowest quality is over budget.
 */
async function makeCover(source, work, focus) {
  const file = await localize(source)
  const out = join(work, 'cover.jpg')
  const size = SPEC.cover.size
  const fx = Math.min(1, Math.max(0, Number(focus)))
  let jpeg
  for (let q = 6; q <= 24; q += 2) {
    await ffmpeg([
      '-i', file,
      '-vf', `scale=${size}:${size}:force_original_aspect_ratio=increase:flags=lanczos,crop=${size}:${size}:(iw-${size})*${fx}:(ih-${size})/2`,
      '-frames:v', '1', '-q:v', String(q), '-pix_fmt', 'yuvj420p',
      '-map_metadata', '-1', '-fflags', '+bitexact', '-flags', '+bitexact',
      out,
    ])
    jpeg = readFileSync(out)
    if (jpeg.length <= SPEC.cover.maxBytes) return jpeg
  }
  log.warn(`Cover is ${(jpeg.length / 1024).toFixed(1)} KB even at the lowest quality step (budget ${SPEC.cover.maxBytes / 1024} KB).`)
  return jpeg
}

/** Look up a published story's title and image in the latest Basehub backup. */
function fromBackup(slug) {
  const file = join(REPO_ROOT, 'backups', 'basehub', 'latest.json')
  if (!existsSync(file)) return null
  const story = JSON.parse(readFileSync(file, 'utf8')).stories.find((s) => s._slug === slug)
  return story ? { title: story._title, cover: story.image?.url ?? null, year: Number(String(story._sys?.createdAt ?? '').slice(0, 4)) || null } : null
}

async function cli({ _, flags }) {
  let input = _[0]
  let slug = flags.slug
  let title = flags.title
  let cover = flags.cover
  let outDir = flags['out-dir']
  let year = flags.year ? Number(flags.year) : undefined

  if (flags.story) {
    slug = assertSlug(flags.story)
    const draft = loadDraft(slug)
    const paths = draftPaths(slug)
    input = input ?? join(paths.audioDir, 'narration.wav')
    title = title ?? draft.fields.title
    const image = join(paths.imageDir, `${slug}.jpg`)
    cover = cover ?? (existsSync(image) ? image : null)
    outDir = outDir ?? paths.audioDir
  } else if (slug) {
    assertSlug(slug)
    const published = fromBackup(slug)
    title = title ?? published?.title
    cover = cover ?? published?.cover
    year = year ?? published?.year ?? undefined // first-publish year, not the remaster date
  }
  if (!input) throw new UsageError('Pass an input file, or --story <slug>. See --help.')
  if (!slug) throw new UsageError('Pass --slug <slug> (or --story <slug>).')
  if (!title) throw new UsageError(`No title for "${slug}". Pass --title.`)
  if (!cover) log.warn('No cover image found; the MP3 will ship without embedded art (analyze will flag it).')

  log.step(`Mastering ${input} → ${slug}.mp3`)
  const { out, sidecar, report } = await masterNarration(input, {
    slug,
    title,
    cover,
    outDir,
    year,
    coverFocus: flags['cover-focus'],
    keepWork: Boolean(flags['keep-work']),
    acceptHeavyDynamics: Boolean(flags['accept-heavy-dynamics']),
  })
  printReport(report)
  log.ok(`${rel(out)} (${(sidecar.bytes / 1024).toFixed(0)} KB, ${sidecar.durationISO}, ${sidecar.loudness.integrated} LUFS mono = ${sidecar.loudnessAsHeard?.integrated} as heard / ${sidecar.loudness.truePeak} dBTP / LRA ${sidecar.loudness.lra})`)
  return report.verdict === 'pass' ? 0 : 1
}

if (isEntry(import.meta.url)) {
  main(cli, {
    meta: import.meta.url,
    args: [0, 1],
    flags: { story: 'string', slug: 'string', title: 'string', cover: 'string', 'out-dir': 'string', year: 'string', 'cover-focus': 'string', 'keep-work': 'boolean', 'accept-heavy-dynamics': 'boolean' },
  })
}
