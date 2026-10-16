// story:image: ladder step 6, the illustration in the locked house style.
//
//   pnpm story:image <slug>                    generate with OpenAI (OPENAI_API_KEY)
//   pnpm story:image <slug> --input <file>     use a supplied painting instead
//   pnpm story:image <slug> [--model gpt-image-2] [--force]
//
// Gate: story:check must pass for the draft on disk (re-run here). The draft
// must carry a concrete `imageAlt` and an `imagePrompt`.
//
// Writes content/drafts/<slug>/image/:
//   source.<ext>     the untouched generation or supplied file
//   <slug>.jpg       the master: 3:2 (center-cropped only if the source is off by
//                    more than 1%), at most 2400 px wide (never upscaled),
//                    high-quality 4:4:4 JPEG with all metadata stripped
//   prompt.txt       the exact prompt sent (scene + locked house style)
//   image.json       dimensions, bytes, sha256, provenance, alt text
//
// Generation env: OPENAI_API_KEY, optional OPENAI_IMAGE_MODEL (default
// gpt-image-2) and OPENAI_IMAGE_QUALITY (default high). The newest catalog
// images are 1536x1024 renders; that is the size requested.

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { main, isEntry, log, UsageError } from './lib/cli.mjs'
import { readState, writeStage, sha256, rel } from './lib/draft.mjs'
import { requireCheck } from './check.mjs'
import { composeImagePrompt, HOUSE_STYLE_VERSION } from './lib/house-style.mjs'
import { assertFfmpeg, ffmpeg, probe } from '../audio/lib/ffmpeg.mjs'

const MAX_WIDTH = 2400
const ASPECT = 3 / 2

export function imageInputHash(draft) {
  return sha256(JSON.stringify([draft.fields.imagePrompt, HOUSE_STYLE_VERSION]))
}

async function generate(prompt, { model }) {
  const key = process.env.OPENAI_API_KEY
  if (!key) {
    throw new UsageError(
      'OPENAI_API_KEY is not set, so no illustration can be generated. Add it to .env.local (optionally OPENAI_IMAGE_MODEL), or supply a painting with --input <file>.',
    )
  }
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      size: '1536x1024',
      quality: process.env.OPENAI_IMAGE_QUALITY || 'high',
      output_format: 'png',
      n: 1,
    }),
  })
  if (!res.ok) throw new Error(`OpenAI images HTTP ${res.status}: ${(await res.text()).slice(0, 500)}`)
  const json = await res.json()
  const b64 = json.data?.[0]?.b64_json
  if (!b64) throw new Error('OpenAI images returned no image data.')
  return Buffer.from(b64, 'base64')
}

/** Crop to 3:2 if needed, cap width, encode a clean high-quality JPEG master. */
async function makeMaster(source, out) {
  const info = await probe(source)
  const v = info.streams.find((s) => s.codec_type === 'video')
  if (!v) throw new UsageError(`${source} is not an image ffmpeg can read.`)
  const w = v.width
  const h = v.height
  const filters = []
  let cropped = null
  const aspect = w / h
  if (Math.abs(aspect - ASPECT) / ASPECT > 0.01) {
    const cw = aspect > ASPECT ? Math.round((h * ASPECT) / 2) * 2 : w
    const ch = aspect > ASPECT ? h : Math.round(w / ASPECT / 2) * 2
    filters.push(`crop=${cw}:${ch}`)
    cropped = { from: `${w}x${h}`, to: `${cw}x${ch}` }
  }
  filters.push(`scale='min(${MAX_WIDTH},iw)':-2:flags=lanczos`)
  await ffmpeg([
    '-i', source,
    '-vf', filters.join(','),
    '-frames:v', '1',
    '-q:v', '2', '-pix_fmt', 'yuvj444p',
    '-map_metadata', '-1', '-fflags', '+bitexact', '-flags', '+bitexact',
    out,
  ])
  const outInfo = (await probe(out)).streams[0]
  return { width: outInfo.width, height: outInfo.height, sourceWidth: w, sourceHeight: h, cropped }
}

export async function runImage(slug, { input, model, force = false } = {}) {
  assertFfmpeg()
  const { draft } = await requireCheck(slug) // includes the imageAlt / imagePrompt contract

  const dir = draft.paths.imageDir
  mkdirSync(dir, { recursive: true })
  const master = join(dir, `${slug}.jpg`)
  const inputHash = imageInputHash(draft)
  const previous = readState(slug).stages.image
  if (!force && !input && previous?.status === 'pass' && previous.inputHash === inputHash && existsSync(master) && sha256(readFileSync(master)) === previous.sha256) {
    log.ok(`Illustration is current: ${rel(master)} (use --force to regenerate).`)
    return previous
  }

  const prompt = composeImagePrompt(draft.fields.imagePrompt)
  writeFileSync(join(dir, 'prompt.txt'), prompt + '\n')
  let source
  let provenance
  if (input) {
    if (!existsSync(input)) throw new UsageError(`No such file: ${input}`)
    source = join(dir, `source${extname(input).toLowerCase() || '.png'}`)
    if (input !== source) copyFileSync(input, source)
    provenance = { kind: 'supplied', file: input }
  } else {
    const usedModel = model || process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2'
    log.step(`Generating with ${usedModel} (1536x1024)…`)
    source = join(dir, 'source.png')
    writeFileSync(source, await generate(prompt, { model: usedModel }))
    provenance = { kind: 'generated', provider: 'openai', model: usedModel }
  }

  const dims = await makeMaster(source, master)
  if (dims.sourceWidth < 1536) log.warn(`Source is only ${dims.sourceWidth}px wide; the hero renders up to ~1400 CSS px on retina. Consider a larger original.`)
  if (dims.cropped) log.warn(`Center-cropped ${dims.cropped.from} → ${dims.cropped.to} to reach 3:2. Check the subject survived.`)
  const bytes = readFileSync(master)
  const meta = {
    slug,
    file: rel(master),
    width: dims.width,
    height: dims.height,
    bytes: bytes.length,
    sha256: sha256(bytes),
    alt: draft.fields.imageAlt,
    sourceSha256: sha256(readFileSync(source)),
    provenance,
    houseStyleVersion: HOUSE_STYLE_VERSION,
    createdAt: new Date().toISOString(),
  }
  writeFileSync(join(dir, 'image.json'), JSON.stringify(meta, null, 2) + '\n')
  const record = writeStage(slug, 'image', { status: 'pass', inputHash, file: meta.file, sha256: meta.sha256, width: meta.width, height: meta.height, provenance })
  log.ok(`Master: ${meta.file} (${meta.width}x${meta.height}, ${(meta.bytes / 1024).toFixed(0)} KB)`)
  log.info(`Alt: ${meta.alt}`)
  log.info('Look at it before moving on: wrong era, extra fingers, or text in the frame are reasons to regenerate.')
  return record
}

async function cli({ _, flags }) {
  await runImage(_[0], { input: flags.input, model: flags.model, force: Boolean(flags.force) })
  log.info(`Next (ladder step 7): pnpm story:audio ${_[0]}`)
}

if (isEntry(import.meta.url)) main(cli, { meta: import.meta.url, args: [1, 1], flags: { input: 'string', model: 'string', force: 'boolean' } })
