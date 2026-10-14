// Does this narration say this story? Transcribe the master and compare it
// with the read-aloud script by word error rate (WER).
//
// Pace and loudness cannot tell two similar-length stories apart; a transcript
// can. Uses OpenAI `gpt-4o-transcribe` (OPENAI_API_KEY) or ElevenLabs
// `scribe_v2` (ELEVENLABS_API_KEY), whichever is configured
// (TRANSCRIBE_PROVIDER picks). Without either key the check reports
// "unverified" and the approval screen and publish plan say so in red.

import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { sha256 } from '../../story/lib/draft.mjs'

export const MAX_WER = 0.15

/** Lowercase words with punctuation stripped; numbers kept. */
export function words(text) {
  return (String(text).toLowerCase().replace(/[’']/g, "'").match(/[\p{L}\p{N}']+/gu) ?? []).map((w) => w.replace(/^'+|'+$/g, ''))
}

/** Word error rate of `hypothesis` against `reference` (Levenshtein over words). */
export function wer(reference, hypothesis) {
  const r = words(reference)
  const h = words(hypothesis)
  if (!r.length) return h.length ? 1 : 0
  let prev = Array.from({ length: h.length + 1 }, (_, j) => j)
  for (let i = 1; i <= r.length; i++) {
    const cur = [i]
    for (let j = 1; j <= h.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (r[i - 1] === h[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return prev[h.length] / r.length
}

/** Compare a transcript with the script: overall WER plus first and last sentence. */
export function compareTranscript(scriptText, transcriptText) {
  const sentences = String(scriptText).split(/(?<=[.!?])\s+/).filter((s) => words(s).length >= 3)
  const first = sentences[0] ?? ''
  const last = sentences[sentences.length - 1] ?? ''
  const hyp = words(transcriptText)
  // Best-aligned window of the sentence's own length near the start / end.
  const windowWer = (sentence, fromEnd) => {
    const n = words(sentence).length
    let best = 1
    for (let shift = 0; shift <= 6; shift++) {
      const start = fromEnd ? hyp.length - n - shift : shift
      if (start < 0 || start + n > hyp.length) continue
      best = Math.min(best, wer(sentence, hyp.slice(start, start + n).join(' ')))
    }
    return best
  }
  const overall = wer(scriptText, transcriptText)
  const firstWer = windowWer(first, false)
  const lastWer = windowWer(last, true)
  return {
    wer: Number(overall.toFixed(3)),
    firstSentenceWer: Number(firstWer.toFixed(3)),
    lastSentenceWer: Number(lastWer.toFixed(3)),
    pass: overall <= MAX_WER && firstWer <= 0.35 && lastWer <= 0.35,
  }
}

function provider() {
  const pick = process.env.TRANSCRIBE_PROVIDER
  if ((pick === 'openai' || !pick) && process.env.OPENAI_API_KEY) return 'openai'
  if ((pick === 'elevenlabs' || !pick) && process.env.ELEVENLABS_API_KEY) return 'elevenlabs'
  return null
}

export const canTranscribe = () => Boolean(provider())

/** Transcribe an audio file. Returns { provider, model, text }. */
export async function transcribe(file) {
  const which = provider()
  if (!which) throw new Error('No transcription key (OPENAI_API_KEY or ELEVENLABS_API_KEY).')
  const form = new FormData()
  form.append('file', new Blob([readFileSync(file)], { type: 'audio/mpeg' }), basename(file))
  if (which === 'openai') {
    const model = process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-4o-transcribe'
    form.append('model', model)
    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: form,
    })
    if (!res.ok) throw new Error(`OpenAI transcription HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`)
    return { provider: 'openai', model, text: (await res.json()).text }
  }
  const model = process.env.ELEVENLABS_STT_MODEL || 'scribe_v2'
  form.append('model_id', model)
  const res = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY },
    body: form,
  })
  if (!res.ok) throw new Error(`ElevenLabs transcription HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`)
  return { provider: 'elevenlabs', model, text: (await res.json()).text }
}

/** Transcribe `file` and compare with `scriptText`. Returns a record for the audio stage. */
export async function verifyNarration(file, scriptText) {
  if (!canTranscribe()) return { status: 'unverified', reason: 'no transcription key configured' }
  const t = await transcribe(file)
  const cmp = compareTranscript(scriptText, t.text)
  return { status: cmp.pass ? 'pass' : 'fail', provider: t.provider, model: t.model, ...cmp, audioSha256: sha256(readFileSync(file)), transcriptSha256: sha256(t.text) }
}
