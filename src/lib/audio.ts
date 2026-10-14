import { cache } from 'react'
import { unstable_cache } from 'next/cache'

/**
 * Narration metadata for structured data (`AudioObject.duration`) and feed
 * enclosures (`<enclosure length>`, `<itunes:duration>`).
 *
 * Narration lives on Vercel Blob as a bare `audioUrl` string, so Basehub cannot
 * tell us its duration. Rather than download the whole file, we read the first
 * 64 KB with a Range request, skip the ID3v2 tag, and parse the first MPEG
 * frame: a Xing/Info or VBRI header gives an exact frame count; otherwise the
 * stream is treated as constant bitrate.
 *
 * Caching: the blob host answers Range requests with 206, which Next's fetch
 * cache never stores, so the probe RESULT is cached instead (`unstable_cache`,
 * one day, tag `audio-probe`). Errors are not cached. Committing the story
 * migration makes Basehub report duration and size, and the probe is skipped.
 */
export interface AudioDetails {
  url: string
  mimeType: string
  /** Total file size in bytes (from Content-Range / Content-Length). */
  byteLength: number | null
  /** Playback length in whole seconds, when it could be determined. */
  durationSeconds: number | null
}

const PROBE_BYTES = 64 * 1024
const PROBE_REVALIDATE_SECONDS = 60 * 60 * 24

const BITRATES_V1_L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320]
const BITRATES_V2_L3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160]
const SAMPLE_RATES: Record<number, number[]> = {
  3: [44100, 48000, 32000], // MPEG-1
  2: [22050, 24000, 16000], // MPEG-2
  0: [11025, 12000, 8000], // MPEG-2.5
}

/** HTTP failure from the audio host; 4xx means the file itself is unusable. */
class AudioProbeError extends Error {
  constructor(readonly status: number) {
    super(`audio probe HTTP ${status}`)
  }
}

async function fetchRange(url: string, start: number, end: number) {
  const res = await fetch(url, {
    headers: { Range: `bytes=${start}-${end}` },
    // 206 responses are not stored by the fetch cache; see `getAudioDetails`.
    cache: 'no-store',
  })
  if (!res.ok) throw new AudioProbeError(res.status)
  const total =
    Number(res.headers.get('content-range')?.split('/')[1]) ||
    (res.status === 200 ? Number(res.headers.get('content-length')) : NaN)
  const bytes = new Uint8Array(await res.arrayBuffer())
  return {
    bytes,
    total: Number.isFinite(total) && total > 0 ? total : null,
    mimeType: res.headers.get('content-type')?.split(';')[0] || null,
  }
}

function id3v2Length(b: Uint8Array): number {
  if (b.length < 10 || b[0] !== 0x49 || b[1] !== 0x44 || b[2] !== 0x33) return 0
  const size = ((b[6] & 0x7f) << 21) | ((b[7] & 0x7f) << 14) | ((b[8] & 0x7f) << 7) | (b[9] & 0x7f)
  const hasFooter = (b[5] & 0x10) !== 0
  return 10 + size + (hasFooter ? 10 : 0)
}

function readUint32(b: Uint8Array, i: number): number {
  return ((b[i] << 24) >>> 0) + (b[i + 1] << 16) + (b[i + 2] << 8) + b[i + 3]
}

function ascii(b: Uint8Array, i: number, len: number): string {
  return String.fromCharCode(...b.subarray(i, i + len))
}

/** Duration in seconds from an MPEG Layer III stream, or null. */
function mp3Duration(b: Uint8Array, audioStart: number, totalBytes: number | null): number | null {
  // Find the first frame sync within the probe window.
  let i = 0
  while (i + 4 < b.length && !(b[i] === 0xff && (b[i + 1] & 0xe0) === 0xe0)) i++
  if (i + 4 >= b.length) return null

  const version = (b[i + 1] >> 3) & 0x03
  const layer = (b[i + 1] >> 1) & 0x03
  if (version === 1 || layer !== 1) return null // reserved version, or not Layer III
  const bitrateKbps = (version === 3 ? BITRATES_V1_L3 : BITRATES_V2_L3)[(b[i + 2] >> 4) & 0x0f]
  const sampleRate = SAMPLE_RATES[version]?.[(b[i + 2] >> 2) & 0x03]
  if (!bitrateKbps || !sampleRate) return null
  const mono = ((b[i + 3] >> 6) & 0x03) === 3
  const samplesPerFrame = version === 3 ? 1152 : 576

  // Xing / Info header (VBR or LAME-encoded CBR) sits after the side info.
  const sideInfo = version === 3 ? (mono ? 17 : 32) : mono ? 9 : 17
  const xing = i + 4 + sideInfo
  const tag = ascii(b, xing, 4)
  if ((tag === 'Xing' || tag === 'Info') && readUint32(b, xing + 4) & 0x01) {
    const frames = readUint32(b, xing + 8)
    if (frames > 0) return (frames * samplesPerFrame) / sampleRate
  }

  // Fraunhofer VBRI header sits 32 bytes after the frame header.
  const vbri = i + 4 + 32
  if (ascii(b, vbri, 4) === 'VBRI') {
    const frames = readUint32(b, vbri + 14)
    if (frames > 0) return (frames * samplesPerFrame) / sampleRate
  }

  // Constant bitrate: audio payload size over the bitrate.
  if (!totalBytes) return null
  const payload = totalBytes - audioStart - i
  return payload > 0 ? (payload * 8) / (bitrateKbps * 1000) : null
}

async function probe(url: string): Promise<AudioDetails> {
  const fallbackMime = /\.m4a($|\?)/i.test(url) ? 'audio/mp4' : 'audio/mpeg'
  try {
    const head = await fetchRange(url, 0, PROBE_BYTES - 1)
    const mimeType = head.mimeType?.startsWith('audio/') ? head.mimeType : fallbackMime
    if (mimeType !== 'audio/mpeg') {
      return { url, mimeType, byteLength: head.total, durationSeconds: null }
    }

    // Large ID3 tags (embedded cover art) push the first frame past the probe.
    const audioStart = id3v2Length(head.bytes)
    const frameWindow =
      audioStart + 2048 < head.bytes.length
        ? head.bytes.subarray(audioStart)
        : (await fetchRange(url, audioStart, audioStart + 16 * 1024 - 1)).bytes

    const seconds = mp3Duration(frameWindow, audioStart, head.total)
    return {
      url,
      mimeType,
      byteLength: head.total,
      durationSeconds: seconds && Number.isFinite(seconds) ? Math.round(seconds) : null,
    }
  } catch (error) {
    console.warn(`[audio] Could not probe ${url}:`, error instanceof Error ? error.message : error)
    // A 4xx is permanent (bad URL): publish without duration rather than fail
    // forever. A network error or 5xx is an outage: rethrow so ISR keeps the
    // last good page instead of caching narration without its length (which
    // would also drop the episode from the podcast feed).
    // Builds fail too (Vercel keeps the last healthy deployment).
    const permanent = error instanceof AudioProbeError && error.status >= 400 && error.status < 500
    if (!permanent) throw error
    return { url, mimeType: fallbackMime, byteLength: null, durationSeconds: null }
  }
}

const cachedProbe = unstable_cache(probe, ['audio-probe'], {
  revalidate: PROBE_REVALIDATE_SECONDS,
  tags: ['audio-probe'],
})

/** Cached across requests for a day (see above) and memoized per request. */
export const getAudioDetails = cache((url: string) =>
  process.env.NODE_ENV === 'development' ? probe(url) : cachedProbe(url),
)

/** ISO 8601 duration (`PT3M25S`) for schema.org. */
export function isoDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `PT${h ? `${h}H` : ''}${m ? `${m}M` : ''}${sec || (!h && !m) ? `${sec}S` : ''}`
}

/** `HH:MM:SS` for `<itunes:duration>`. */
export function clockDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
}
