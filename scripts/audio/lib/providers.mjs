// Pluggable text-to-speech providers for audio:narrate.
//
// A provider is { name, maxChars, describe(), synthesize(request) } where
// synthesize({ text, previousText, nextText, previousRequestIds }) resolves to
// { audio: Buffer, ext, requestId }. `describe()` returns everything that
// changes the sound (voice, model, settings) and feeds the chunk cache key, so
// changing a voice re-renders and an interrupted run resumes for free.
//
// Keys come from the environment only and are never printed.

import { UsageError } from '../../story/lib/cli.mjs'

// --------------------------------------------------------------- ElevenLabs
// Docs: POST /v1/text-to-speech/{voice_id}; request stitching via
// previous_text / next_text / previous_request_ids (max 3; not supported by
// eleven_v3); pronunciation_dictionary_locators (max 3).

const ELEVEN_LIMITS = {
  eleven_v4: 10000,
  eleven_multilingual_v2: 10000,
  eleven_flash_v2_5: 40000,
  eleven_flash_v2: 30000,
  eleven_v3: 5000,
}

function elevenlabs() {
  const key = process.env.ELEVENLABS_API_KEY
  if (!key) {
    throw new UsageError(
      'ELEVENLABS_API_KEY is not set. Add it to .env.local (and optionally ELEVENLABS_VOICE_ID, ELEVENLABS_MODEL_ID), or use --provider openai, or narrate a human recording with --input <file>.',
    )
  }
  const voiceId = process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb' // "George": warm, measured storyteller
  const modelId = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2'
  let outputFormat = process.env.ELEVENLABS_OUTPUT_FORMAT || 'pcm_44100'
  const voiceSettings = {
    stability: 0.55,
    similarity_boost: 0.75,
    style: 0,
    use_speaker_boost: true,
    speed: 0.95, // a touch under default: bedtime pace
    ...(process.env.ELEVENLABS_VOICE_SETTINGS ? JSON.parse(process.env.ELEVENLABS_VOICE_SETTINGS) : {}),
  }
  const dictionary = process.env.ELEVENLABS_PRONUNCIATION_DICTIONARY_ID
    ? [{
        pronunciation_dictionary_id: process.env.ELEVENLABS_PRONUNCIATION_DICTIONARY_ID,
        ...(process.env.ELEVENLABS_PRONUNCIATION_DICTIONARY_VERSION
          ? { version_id: process.env.ELEVENLABS_PRONUNCIATION_DICTIONARY_VERSION }
          : {}),
      }]
    : null
  const stitching = modelId !== 'eleven_v3'
  const seed = process.env.ELEVENLABS_SEED ? Number(process.env.ELEVENLABS_SEED) : 1789

  return {
    name: 'elevenlabs',
    // Paragraph-sized requests keep prosody steady; the model limit is a backstop.
    maxChars: Math.min(ELEVEN_LIMITS[modelId] ?? 5000, 2500),
    // When a dictionary is attached, it owns pronunciation and local aliases are skipped.
    usesRemoteLexicon: Boolean(dictionary),
    describe: () => ({ provider: 'elevenlabs', voiceId, modelId, outputFormat, voiceSettings, dictionary, seed }),
    async synthesize({ text, previousText, nextText, previousRequestIds }) {
      const body = {
        text,
        model_id: modelId,
        voice_settings: voiceSettings,
        seed,
        apply_text_normalization: 'auto',
        ...(dictionary ? { pronunciation_dictionary_locators: dictionary } : {}),
      }
      if (stitching) {
        // Request ids (same run) carry real prosody; text is the fallback across runs.
        if (previousRequestIds?.length) body.previous_request_ids = previousRequestIds.slice(-3)
        else if (previousText) body.previous_text = previousText
        if (nextText) body.next_text = nextText
      }
      const call = (format) =>
        fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=${format}`, {
          method: 'POST',
          headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/*' },
          body: JSON.stringify(body),
        })
      // Prefer lossless PCM. Plans without 44.1 kHz PCM usually allow 24 kHz PCM,
      // which still carries the voice band to 12 kHz without stacking two lossy
      // codecs; MP3 is the last resort.
      let res = await call(outputFormat)
      for (const fallback of ['pcm_24000', 'mp3_44100_192', 'mp3_44100_128']) {
        if (res.ok || ![401, 403, 422].includes(res.status) || fallback === outputFormat) break
        const detail = await res.text()
        if (!/output_format|tier|subscription|pcm|plan/i.test(detail)) throw new Error(`ElevenLabs HTTP ${res.status}: ${detail.slice(0, 500)}`)
        console.warn(`  ElevenLabs refused ${outputFormat} on this plan; trying ${fallback} (set ELEVENLABS_OUTPUT_FORMAT to pin one).`)
        outputFormat = fallback
        res = await call(outputFormat)
      }
      if (!res.ok) throw new Error(`ElevenLabs HTTP ${res.status}: ${(await res.text()).slice(0, 500)}`)
      const audio = Buffer.from(await res.arrayBuffer())
      const ext = outputFormat.startsWith('pcm') ? 'pcm' : outputFormat.split('_')[0]
      return { audio, ext, requestId: res.headers.get('request-id'), rawFormat: outputFormat }
    },
  }
}

// ------------------------------------------------------------------ OpenAI
// Docs: POST /v1/audio/speech { model, voice, input (max 4096 chars),
// instructions (not for tts-1 / tts-1-hd), response_format }.

function openai() {
  const key = process.env.OPENAI_API_KEY
  if (!key) {
    throw new UsageError(
      'OPENAI_API_KEY is not set. Add it to .env.local (and optionally OPENAI_TTS_MODEL, OPENAI_TTS_VOICE), or use --provider elevenlabs, or narrate a human recording with --input <file>.',
    )
  }
  const model = process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts'
  const voice = process.env.OPENAI_TTS_VOICE || 'marin'
  const instructions =
    process.env.OPENAI_TTS_INSTRUCTIONS ||
    'Read aloud as a warm, unhurried narrator of a classic story for a child at bedtime. Clear diction, gentle even pace, natural pauses at commas and full stops. No character voices, no dramatic swings, no smile in the voice on sad moments.'
  const supportsInstructions = !/^tts-1/.test(model)
  return {
    name: 'openai',
    maxChars: 3800,
    usesRemoteLexicon: false,
    describe: () => ({ provider: 'openai', model, voice, instructions: supportsInstructions ? instructions : null }),
    async synthesize({ text }) {
      const res = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          voice,
          input: text,
          response_format: 'wav',
          ...(supportsInstructions ? { instructions } : {}),
        }),
      })
      if (!res.ok) throw new Error(`OpenAI TTS HTTP ${res.status}: ${(await res.text()).slice(0, 500)}`)
      return { audio: Buffer.from(await res.arrayBuffer()), ext: 'wav', requestId: res.headers.get('x-request-id'), rawFormat: 'wav' }
    },
  }
}

// --------------------------------------------------------------- rehearsal
// Never auto-selected. `--provider rehearsal` with REHEARSAL_VOICE_FILE=<any
// speech recording> "speaks" each request as a slice of that recording, sized
// to the text at ~15 characters per second. It exercises chunk caching,
// stitching, pauses, mastering and analysis end to end with real speech
// dynamics, without spending TTS credits. The words are wrong by design: never
// approve or publish a rehearsal render.

function rehearsal() {
  const file = process.env.REHEARSAL_VOICE_FILE
  if (!file) throw new UsageError('The rehearsal provider needs REHEARSAL_VOICE_FILE=<speech recording> (it only exists to test the pipeline).')
  let cursor = 0
  return {
    name: 'rehearsal',
    maxChars: 2500,
    usesRemoteLexicon: false,
    describe: () => ({ provider: 'rehearsal', file }),
    async synthesize({ text }) {
      const { ffmpeg: run, durationOf } = await import('./ffmpeg.mjs')
      const { tmpdir } = await import('node:os')
      const { join } = await import('node:path')
      const { readFileSync } = await import('node:fs')
      const total = await durationOf(file)
      const seconds = Math.max(1, text.length / 15)
      if (cursor + seconds > total) cursor = 0
      const out = join(tmpdir(), `cv-rehearsal-${process.pid}-${cursor.toFixed(2)}.wav`)
      await run(['-ss', cursor.toFixed(3), '-t', seconds.toFixed(3), '-i', file, '-ac', '1', '-c:a', 'pcm_s16le', out])
      cursor += seconds
      return { audio: readFileSync(out), ext: 'wav', requestId: null, rawFormat: 'wav' }
    },
  }
}

const PROVIDERS = { elevenlabs, openai, rehearsal }

/** Resolve a provider by name, or pick the first one with a key configured. */
export function getProvider(name) {
  if (name) {
    const factory = PROVIDERS[name]
    if (!factory) throw new UsageError(`Unknown TTS provider "${name}". Use one of: ${Object.keys(PROVIDERS).join(', ')}.`)
    return factory()
  }
  if (process.env.NARRATION_PROVIDER) return getProvider(process.env.NARRATION_PROVIDER)
  if (process.env.ELEVENLABS_API_KEY) return elevenlabs()
  if (process.env.OPENAI_API_KEY) return openai()
  throw new UsageError(
    'No TTS key configured. Add ELEVENLABS_API_KEY (preferred) or OPENAI_API_KEY to .env.local, or narrate a human recording with --input <recording.wav|mp3>. Use --dry-run to preview the script without a key.',
  )
}

/** Planning-only stand-in so --dry-run works without any key. */
export function planningProvider(name = process.env.NARRATION_PROVIDER || 'elevenlabs') {
  const maxChars = name === 'openai' ? 3800 : 2500
  return { name: `${name} (dry run)`, maxChars, usesRemoteLexicon: false, describe: () => ({ provider: name, dryRun: true }) }
}
