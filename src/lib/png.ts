import { crc32, deflateSync, inflateSync } from 'node:zlib'

/**
 * Flatten an 8-bit RGBA PNG (what `next/og` emits) onto a solid background and
 * re-encode it as RGB. Apple Podcasts asks for RGB show artwork, and `next/og`
 * cannot produce it directly. Dependency-free: zlib plus the PNG filter rules.
 */
export function flattenPngToRgb(input: Uint8Array, background: [number, number, number]): Buffer {
  const png = Buffer.from(input)
  let offset = 8 // PNG signature
  let width = 0
  let height = 0
  const idat: Buffer[] = []

  while (offset < png.length) {
    const length = png.readUInt32BE(offset)
    const type = png.toString('latin1', offset + 4, offset + 8)
    const data = png.subarray(offset + 8, offset + 8 + length)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      const bitDepth = data[8]
      const colorType = data[9]
      const interlace = data[12]
      if (bitDepth !== 8 || colorType !== 6 || interlace !== 0) {
        throw new Error(`flattenPngToRgb expects 8-bit non-interlaced RGBA (got depth ${bitDepth}, type ${colorType})`)
      }
    } else if (type === 'IDAT') {
      idat.push(data)
    } else if (type === 'IEND') {
      break
    }
    offset += 12 + length
  }

  const raw = inflateSync(Buffer.concat(idat))
  const bpp = 4
  const stride = width * bpp
  const rgba = Buffer.alloc(stride * height)

  // Undo the per-scanline filters (PNG spec section 9).
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]
    const src = y * (stride + 1) + 1
    const dst = y * stride
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? rgba[dst + x - bpp] : 0
      const b = y > 0 ? rgba[dst - stride + x] : 0
      const c = x >= bpp && y > 0 ? rgba[dst - stride + x - bpp] : 0
      let predictor = 0
      if (filter === 1) predictor = a
      else if (filter === 2) predictor = b
      else if (filter === 3) predictor = (a + b) >> 1
      else if (filter === 4) {
        const p = a + b - c
        const pa = Math.abs(p - a)
        const pb = Math.abs(p - b)
        const pc = Math.abs(p - c)
        predictor = pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      }
      rgba[dst + x] = (raw[src + x] + predictor) & 0xff
    }
  }

  // Composite onto the background and emit unfiltered RGB scanlines.
  const rgbStride = width * 3
  const out = Buffer.alloc((rgbStride + 1) * height)
  for (let y = 0; y < height; y++) {
    out[y * (rgbStride + 1)] = 0
    for (let x = 0; x < width; x++) {
      const i = y * stride + x * 4
      const alpha = rgba[i + 3] / 255
      const o = y * (rgbStride + 1) + 1 + x * 3
      for (let ch = 0; ch < 3; ch++) {
        out[o + ch] = Math.round(rgba[i + ch] * alpha + background[ch] * (1 - alpha))
      }
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // color type: truecolor RGB

  return Buffer.concat([
    png.subarray(0, 8),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(out, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function chunk(type: string, data: Buffer): Buffer {
  const head = Buffer.alloc(8)
  head.writeUInt32BE(data.length, 0)
  head.write(type, 4, 'latin1')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])) >>> 0, 0)
  return Buffer.concat([head, data, crc])
}

/** `#rrggbb` → RGB triple. */
export function hexToRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}
