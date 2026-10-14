// ID3v2.3 writing plus MP3 structure inspection, with no dependencies.
//
// Why hand-rolled: ffmpeg's ID3 writer stores `comment` as a TXXX frame instead
// of COMM and leaks encoder strings, and the spec wants exactly the tags we
// choose. So `master` lets ffmpeg write only audio frames (with the Xing/Info +
// LAME header that gives browsers an exact duration) and prepends the tag built
// here. `inspectMp3` reads any MP3 back: ID3 version and frames, cover size,
// Xing/Info/LAME header, per-frame bitrates (CBR vs VBR), and a trailing ID3v1.

// ------------------------------------------------------------------ writing

function encodeText(str) {
  // ISO-8859-1 when it round-trips, else UTF-16 with BOM (both valid in v2.3).
  const latin1 = /^[\x00-\xff]*$/.test(str)
  if (latin1) return { enc: 0, bytes: Buffer.from(str, 'latin1'), term: Buffer.from([0]) }
  const body = Buffer.from(str, 'utf16le')
  return { enc: 1, bytes: Buffer.concat([Buffer.from([0xff, 0xfe]), body]), term: Buffer.from([0, 0]) }
}

function frame(id, payload) {
  const header = Buffer.alloc(10)
  header.write(id, 0, 'latin1')
  header.writeUInt32BE(payload.length, 4) // v2.3 frame sizes are plain 32-bit, not syncsafe
  return Buffer.concat([header, payload])
}

function textFrame(id, value) {
  const { enc, bytes } = encodeText(String(value))
  return frame(id, Buffer.concat([Buffer.from([enc]), bytes]))
}

function commentFrame(text, lang = 'eng') {
  const { enc, bytes, term } = encodeText(text)
  const desc = enc === 1 ? Buffer.from([0xff, 0xfe]) : Buffer.alloc(0) // empty description
  return frame('COMM', Buffer.concat([Buffer.from([enc]), Buffer.from(lang, 'latin1'), desc, term, bytes]))
}

function pictureFrame(jpeg) {
  return frame(
    'APIC',
    Buffer.concat([
      Buffer.from([0]), // ISO-8859-1
      Buffer.from('image/jpeg\0', 'latin1'),
      Buffer.from([0x03]), // picture type: front cover
      Buffer.from('Cover\0', 'latin1'),
      jpeg,
    ]),
  )
}

function syncsafe(n) {
  return Buffer.from([(n >> 21) & 0x7f, (n >> 14) & 0x7f, (n >> 7) & 0x7f, n & 0x7f])
}

/**
 * Build an ID3v2.3 tag. `tags`: { title, artist, album, genre, year, comment, lengthMs },
 * `cover`: JPEG buffer or null.
 */
export function buildId3v23(tags, cover) {
  const frames = []
  if (tags.title) frames.push(textFrame('TIT2', tags.title))
  if (tags.artist) frames.push(textFrame('TPE1', tags.artist))
  if (tags.album) frames.push(textFrame('TALB', tags.album))
  if (tags.genre) frames.push(textFrame('TCON', tags.genre))
  if (tags.year) frames.push(textFrame('TYER', String(tags.year)))
  if (tags.lengthMs) frames.push(textFrame('TLEN', String(Math.round(tags.lengthMs))))
  if (tags.comment) frames.push(commentFrame(tags.comment))
  if (cover) frames.push(pictureFrame(cover))
  const body = Buffer.concat(frames)
  const header = Buffer.concat([Buffer.from('ID3', 'latin1'), Buffer.from([3, 0, 0]), syncsafe(body.length)])
  return Buffer.concat([header, body])
}

// ------------------------------------------------------------------ reading

const unsyncsafe = (b, o) => (b[o] << 21) | (b[o + 1] << 14) | (b[o + 2] << 7) | b[o + 3]

function decodeText(buf) {
  if (!buf.length) return ''
  const enc = buf[0]
  const data = buf.subarray(1)
  let s
  if (enc === 0) s = data.toString('latin1')
  else if (enc === 3) s = data.toString('utf8')
  else if (enc === 1 || enc === 2) {
    let d = data
    let le = enc === 1
    if (d[0] === 0xff && d[1] === 0xfe) {
      le = true
      d = d.subarray(2)
    } else if (d[0] === 0xfe && d[1] === 0xff) {
      le = false
      d = d.subarray(2)
    }
    if (!le) d = swap16(d)
    s = d.toString('utf16le')
  } else s = data.toString('latin1')
  return s.replace(/\0+$/, '')
}

function swap16(buf) {
  const out = Buffer.from(buf.subarray(0, buf.length - (buf.length % 2)))
  return out.swap16()
}

const FRAME_TO_TAG = {
  TIT2: 'title', TPE1: 'artist', TALB: 'album', TCON: 'genre', TYER: 'year', TDRC: 'year', TLEN: 'lengthMs',
}
const EXPECTED_FRAMES = new Set(['TIT2', 'TPE1', 'TALB', 'TCON', 'TYER', 'TLEN', 'COMM', 'APIC'])

function readId3v2(buf) {
  if (buf.length < 10 || buf.toString('latin1', 0, 3) !== 'ID3') return { version: null, size: 0, tags: {}, frames: [], extraFrames: [], cover: null }
  const major = buf[3]
  const flags = buf[5]
  const size = unsyncsafe(buf, 6)
  const end = 10 + size + (flags & 0x10 ? 10 : 0)
  const tags = {}
  const frames = []
  const extraFrames = []
  let cover = null
  let o = 10
  if (flags & 0x40) o += major === 4 ? unsyncsafe(buf, o) : buf.readUInt32BE(o) + 4 // extended header
  while (o + 10 <= 10 + size) {
    const id = buf.toString('latin1', o, o + 4)
    if (!/^[A-Z0-9]{4}$/.test(id)) break
    const fsize = major === 4 ? unsyncsafe(buf, o + 4) : buf.readUInt32BE(o + 4)
    const data = buf.subarray(o + 10, o + 10 + fsize)
    frames.push(id)
    if (!EXPECTED_FRAMES.has(id)) extraFrames.push(id === 'TXXX' ? `TXXX:${decodeText(data).split('\0')[0]}` : id)
    if (FRAME_TO_TAG[id]) tags[FRAME_TO_TAG[id]] = decodeText(data)
    if (id === 'COMM') {
      const enc = data[0]
      const rest = data.subarray(4)
      const termLen = enc === 1 || enc === 2 ? 2 : 1
      let i = 0
      while (i < rest.length && !(rest[i] === 0 && (termLen === 1 || rest[i + 1] === 0))) i += termLen
      tags.comment = decodeText(Buffer.concat([Buffer.from([enc]), rest.subarray(i + termLen)]))
    }
    if (id === 'APIC') cover = readApic(data)
    o += 10 + fsize
  }
  return { version: `2.${major}`, size: end, tags, frames, extraFrames, cover }
}

function readApic(data) {
  const enc = data[0]
  const mimeEnd = data.indexOf(0, 1)
  const mime = data.toString('latin1', 1, mimeEnd)
  const type = data[mimeEnd + 1]
  let i = mimeEnd + 2
  if (enc === 1 || enc === 2) {
    while (i < data.length && !(data[i] === 0 && data[i + 1] === 0)) i += 2
    i += 2
  } else {
    while (i < data.length && data[i] !== 0) i++
    i += 1
  }
  const img = data.subarray(i)
  return { mime, pictureType: type, bytes: img.length, ...jpegSize(img) }
}

function jpegSize(img) {
  if (img[0] !== 0xff || img[1] !== 0xd8) return { width: null, height: null }
  let o = 2
  while (o < img.length) {
    if (img[o] !== 0xff) return { width: null, height: null }
    const marker = img[o + 1]
    const len = img.readUInt16BE(o + 2)
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: img.readUInt16BE(o + 5), width: img.readUInt16BE(o + 7) }
    }
    o += 2 + len
  }
  return { width: null, height: null }
}

const BITRATES = {
  // [version][layer3] kbps by index
  1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
}
const SAMPLE_RATES = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] }

function parseFrameHeader(buf, o) {
  if (o + 4 > buf.length || buf[o] !== 0xff || (buf[o + 1] & 0xe0) !== 0xe0) return null
  const versionBits = (buf[o + 1] >> 3) & 3 // 3=MPEG1, 2=MPEG2, 0=MPEG2.5
  const layerBits = (buf[o + 1] >> 1) & 3 // 1 = Layer III
  if (versionBits === 1 || layerBits !== 1) return null
  const brIdx = buf[o + 2] >> 4
  const srIdx = (buf[o + 2] >> 2) & 3
  if (brIdx === 0 || brIdx === 15 || srIdx === 3) return null
  const padding = (buf[o + 2] >> 1) & 1
  const channelMode = buf[o + 3] >> 6
  const mpeg1 = versionBits === 3
  const bitrate = BITRATES[mpeg1 ? 1 : 2][brIdx]
  const sampleRate = SAMPLE_RATES[versionBits][srIdx]
  const length = Math.floor(((mpeg1 ? 144 : 72) * bitrate * 1000) / sampleRate) + padding
  return { mpeg1, bitrate, sampleRate, mono: channelMode === 3, length }
}

function readXing(buf, o, h) {
  const sideInfo = h.mpeg1 ? (h.mono ? 17 : 32) : h.mono ? 9 : 17
  const x = o + 4 + sideInfo
  const tag = buf.toString('latin1', x, x + 4)
  if (tag !== 'Xing' && tag !== 'Info') {
    if (buf.toString('latin1', o + 36, o + 40) === 'VBRI') return { xing: 'VBRI', lame: null }
    return { xing: null, lame: null }
  }
  const flags = buf.readUInt32BE(x + 4)
  let p = x + 8
  const frames = flags & 1 ? buf.readUInt32BE(p) : null
  if (flags & 1) p += 4
  if (flags & 2) p += 4
  if (flags & 4) p += 100
  if (flags & 8) p += 4
  const encoder = buf.toString('latin1', p, p + 9).replace(/\0/g, '').trim()
  let lame = null
  if (/^[\x20-\x7e]{4,}$/.test(encoder)) {
    const d = p + 21
    const delay = (buf[d] << 4) | (buf[d + 1] >> 4)
    const padding = ((buf[d + 1] & 0x0f) << 8) | buf[d + 2]
    lame = `LAME tag "${encoder}" (delay ${delay}, padding ${padding})`
  }
  return { xing: tag, frames, lame }
}

/** Inspect raw MP3 bytes. */
export function inspectMp3(buf) {
  const id3 = readId3v2(buf)
  let o = id3.size
  // Skip any zero padding and resync to the first frame header.
  while (o < buf.length - 4 && !parseFrameHeader(buf, o)) o++
  const first = parseFrameHeader(buf, o)
  const header = first ? readXing(buf, o, first) : { xing: null, lame: null }
  const bitrates = new Map()
  let frames = 0
  let p = o
  if (header.xing === 'Xing' || header.xing === 'Info') p += first.length // the header frame is silent metadata
  const audioEnd = buf.length - (buf.toString('latin1', buf.length - 128, buf.length - 125) === 'TAG' ? 128 : 0)
  while (p < audioEnd - 4) {
    const h = parseFrameHeader(buf, p)
    if (!h) break
    bitrates.set(h.bitrate, (bitrates.get(h.bitrate) ?? 0) + 1)
    frames++
    p += h.length
  }
  const id3v1 = audioEnd !== buf.length
  const dominant = [...bitrates.entries()].sort((a, b) => b[1] - a[1])[0]
  return {
    id3,
    id3v1,
    header,
    frames,
    cbr: bitrates.size === 1,
    bitrateKbps: dominant ? dominant[0] : null,
    bitrates: Object.fromEntries(bitrates),
    sampleRate: first?.sampleRate ?? null,
    mono: first?.mono ?? null,
  }
}
