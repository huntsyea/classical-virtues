// The narration delivery spec. `master` targets these numbers; `analyze` grades
// any MP3 against them. Change a target here and both sides move together.
//
// Why these values:
// - -19 LUFS integrated, measured on the mono file, is -16 LUFS as heard: every
//   phone, browser and podcast app plays a mono MP3 through both speakers, and
//   BS.1770 sums the two channels (+3.01 LU). -16 as heard is the common
//   spoken-word streaming reference; targeting -16 on the mono file would play
//   at -13 and need heavy limiting to fit under the peak ceiling. ±0.5 LU.
//   `analyze` reports both numbers.
// - -1.5 dBTP on the decoded MP3: headroom for decoder and resampler overshoot.
// - LRA: a narrator's natural range is 4-8 LU. Above 11 a parent rides the
//   volume; below 3.5 the voice has been squeezed flat (warned, not failed).
// - Mono 44.1 kHz: one voice, no stereo image to preserve; 44.1 kHz is the MP3
//   rate every browser and car head unit decodes natively.
// - CBR 64 kbps libmp3lame: see BITRATE_RATIONALE below.

export const SPEC = {
  loudness: { I: -19, TP: -1.5, LRA: 7 },
  tolerance: { I: 0.5, TP: 0.05, LRA_MAX: 11, LRA_MIN: 3.5 },
  // Dynamics budget: share of 10 ms speech windows losing more than 3 dB to
  // compressor + de-esser + limiter together. Light up to 2%; 2-10% only with
  // an explicit, recorded acceptance; beyond that the source must be re-rendered.
  limiting: { maxShareOver3dB: 2, hardMaxShareOver3dB: 10 },
  sampleRate: 44100,
  channels: 1,
  bitrateKbps: 64,
  silence: {
    head: 0.4, // seconds kept before the first word
    tail: 1.0, // seconds kept after the last word
    headRange: [0.2, 0.8],
    tailRange: [0.6, 1.6],
    detectDb: -50,
  },
  highpassHz: 75,
  // 600x600 for downloaded files, car head units, and file players (browsers
  // and podcast apps use the page / feed artwork instead). Capped at 20 KB:
  // it sits in front of the first audio frame.
  cover: { size: 600, maxBytes: 20 * 1024 },
  id3: {
    artist: 'Classical Virtues',
    album: 'Classical Virtues: Stories Read Aloud',
    genre: 'Spoken Word',
  },
}

export const BITRATE_RATIONALE = `CBR 64 kbps mono instead of VBR: a browser seeks a CBR MP3 by straight
byte arithmetic (time x bitrate), so the 15-second skip buttons and the saved
resume position land where they should with one range request. A VBR file is
seeked by interpolating the Xing table of contents (100 points, about 1.8 s
apart on a 3-minute story) or an average bitrate, so skips drift by a word or
more. For one voice, LAME VBR at speech-appropriate quality averages roughly
the same 56-80 kbps, so VBR would save almost nothing. 64 kbps mono costs
480 KB per minute (about 1.4 MB for a 3-minute story) and keeps the full
voice band.`

/**
 * Grade a measured report against the spec.
 * Returns [{ id, label, pass, actual, expected, severity }] where severity is
 * 'fail' (blocks publish) or 'warn' (worth a human ear).
 */
export function evaluate(report) {
  const checks = []
  const add = (id, label, pass, actual, expected, severity = 'fail') =>
    checks.push({ id, label, pass: Boolean(pass), actual, expected, severity })
  const { loudness: L, tolerance: T } = SPEC

  add('codec', 'Codec is MP3', report.codec === 'mp3', report.codec, 'mp3')
  add('sampleRate', 'Sample rate', report.sampleRate === SPEC.sampleRate, report.sampleRate, SPEC.sampleRate)
  add('channels', 'Channels (mono)', report.channels === SPEC.channels, report.channels, SPEC.channels)
  add(
    'bitrate',
    'Bitrate (CBR)',
    report.bitrateKbps === SPEC.bitrateKbps && report.cbr === true,
    `${report.bitrateKbps} kbps ${report.cbr ? 'CBR' : report.cbr === false ? 'VBR' : '?'}`,
    `${SPEC.bitrateKbps} kbps CBR`,
  )
  add(
    'integrated',
    'Integrated loudness',
    report.loudness.integrated !== null && Math.abs(report.loudness.integrated - L.I) <= T.I,
    `${report.loudness.integrated} LUFS`,
    `${L.I} ±${T.I} LUFS mono (${L.I + 3} as heard on two speakers)`,
  )
  add(
    'truePeak',
    'True peak',
    report.loudness.truePeak !== null && report.loudness.truePeak <= L.TP + T.TP,
    `${report.loudness.truePeak} dBTP`,
    `≤ ${L.TP} dBTP`,
  )
  add(
    'lra',
    'Loudness range',
    report.loudness.lra !== null && report.loudness.lra <= T.LRA_MAX,
    `${report.loudness.lra} LU`,
    `~${L.LRA} LU (≤ ${T.LRA_MAX})`,
  )
  add(
    'lraFloor',
    'Loudness range not squeezed flat',
    report.loudness.lra === null || report.loudness.lra >= T.LRA_MIN,
    `${report.loudness.lra} LU`,
    `≥ ${T.LRA_MIN} LU`,
    'warn',
  )
  const [hMin, hMax] = SPEC.silence.headRange
  const [tMin, tMax] = SPEC.silence.tailRange
  add('head', 'Head silence', report.silence.head >= hMin && report.silence.head <= hMax, `${report.silence.head} s`, `${SPEC.silence.head} s (${hMin}-${hMax})`)
  add('tail', 'Tail silence', report.silence.tail >= tMin && report.silence.tail <= tMax, `${report.silence.tail} s`, `${SPEC.silence.tail} s (${tMin}-${tMax})`)
  add(
    'clipping',
    'No clipping',
    !report.clipping.clipped,
    `sample peak ${report.clipping.peakDb} dBFS, flat factor ${report.clipping.flatFactor}`,
    'sample peak < -0.1 dBFS, flat factor 0',
  )
  add('xing', 'Xing/Info + LAME header (accurate duration and seek)', report.header.xing && report.header.lame, describeHeader(report.header), 'Info (CBR) frame with LAME tag')
  add('id3', 'ID3v2.3 tag', report.id3.version === '2.3', report.id3.version ? `ID3v${report.id3.version}` : 'none', 'ID3v2.3')
  const tags = report.id3.tags ?? {}
  add('title', 'Tag: title', Boolean(tags.title), tags.title ?? '(missing)', 'story title')
  add('artist', 'Tag: artist', tags.artist === SPEC.id3.artist, tags.artist ?? '(missing)', SPEC.id3.artist)
  add('album', 'Tag: album', tags.album === SPEC.id3.album, tags.album ?? '(missing)', SPEC.id3.album)
  add('genre', 'Tag: genre', tags.genre === SPEC.id3.genre, tags.genre ?? '(missing)', SPEC.id3.genre)
  add('year', 'Tag: year', /^\d{4}$/.test(tags.year ?? ''), tags.year ?? '(missing)', 'YYYY')
  add('comment', 'Tag: comment (canonical URL)', /^https?:\/\//.test(tags.comment ?? ''), tags.comment ?? '(missing)', 'story URL')
  add(
    'cover',
    'Embedded cover (600x600 JPEG, ≤ 20 KB)',
    report.id3.cover?.mime === 'image/jpeg' && report.id3.cover?.width === SPEC.cover.size && report.id3.cover?.height === SPEC.cover.size && report.id3.cover?.bytes <= SPEC.cover.maxBytes,
    report.id3.cover ? `${report.id3.cover.mime} ${report.id3.cover.width}x${report.id3.cover.height}, ${(report.id3.cover.bytes / 1024).toFixed(1)} KB` : '(none)',
    `image/jpeg ${SPEC.cover.size}x${SPEC.cover.size}, ≤ ${SPEC.cover.maxBytes / 1024} KB`,
  )
  add(
    'fastStart',
    'Audio starts within the first 32 KB (tag + cover)',
    (report.id3.size ?? 0) <= 32 * 1024,
    `first frame at byte ${report.id3.size ?? 0}`,
    '≤ 32768',
    'warn',
  )
  add(
    'extraMetadata',
    'No stray metadata (encoder tags, TXXX, ID3v1)',
    report.id3.extraFrames.length === 0 && !report.id3v1,
    [...report.id3.extraFrames, ...(report.id3v1 ? ['ID3v1'] : [])].join(', ') || 'none',
    'none',
    'warn',
  )
  return checks
}

function describeHeader(h) {
  if (!h.xing) return 'no Xing/Info frame'
  return `${h.xing}${h.lame ? ` + ${h.lame}` : ' without LAME tag'}`
}

export const verdict = (checks) => (checks.some((c) => !c.pass && c.severity === 'fail') ? 'fail' : 'pass')
