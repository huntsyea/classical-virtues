// Build the read-aloud script for a story and split it into TTS requests.
//
// Script shape (what a parent hears): the title, a pause, the narrative body
// paragraph by paragraph, a longer pause, then the moral (virtueDescription)
// read once. Nothing else: no "a story about honesty", no site name, no URL.
//
// Every paragraph is its own request so the pauses between paragraphs are
// exact silence we insert, not whatever the voice model felt like. A paragraph
// longer than the provider limit is split on sentence boundaries.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { REPO_ROOT } from '../../story/lib/cli.mjs'

export const PAUSES = {
  afterTitle: 1.2,
  betweenParagraphs: 0.75,
  withinParagraph: 0.3, // only when one paragraph had to be split
  beforeMoral: 1.5,
}

/** Markdown to plain read-aloud text. Keeps sentence punctuation; drops markup. */
export function stripMarkdown(md) {
  return md
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\[\^[^\]]+\]/g, '')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+[.)]\s+/gm, '')
    .replace(/^\s*(?:\*\s*){3,}$|^\s*(?:-\s*){3,}$|^\s*(?:_\s*){3,}$/gm, '')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(\*|_)(.+?)\1/g, '$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s*[—–]\s*/g, ', ') // banned in prose anyway; never let a dash become a TTS stumble
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
}

/** Split body markdown into read-aloud paragraphs. */
export function paragraphs(md) {
  return stripMarkdown(md)
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, ' ').replace(/\s{2,}/g, ' ').trim())
    .filter(Boolean)
}

export function loadLexicon() {
  return JSON.parse(readFileSync(join(REPO_ROOT, 'scripts', 'audio', 'lexicon.json'), 'utf8')).entries
}

/** Apply alias respellings to TTS text (whole word, case-sensitive). */
export function applyLexicon(text, lexicon = loadLexicon()) {
  let out = text
  for (const [word, { alias }] of Object.entries(lexicon)) {
    if (!alias) continue
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    out = out.replace(new RegExp(`(?<![\\p{L}])${escaped}(?![\\p{L}])`, 'gu'), alias)
  }
  return out
}

function ensureTerminalPunctuation(s) {
  return /[.!?"'”’)]$/.test(s) ? s : `${s}.`
}

/** Sentence-aware split of one paragraph into pieces under `maxChars`. */
export function splitLong(text, maxChars) {
  if (text.length <= maxChars) return [text]
  const sentences = text.match(/[^.!?]+[.!?]+["'”’)]*\s*|[^.!?]+$/g) ?? [text]
  const pieces = []
  let current = ''
  for (const sentence of sentences) {
    if ((current + sentence).length > maxChars && current) {
      pieces.push(current.trim())
      current = ''
    }
    if (sentence.length > maxChars) {
      // A single enormous sentence: fall back to clause boundaries.
      for (const part of sentence.split(/(?<=[,;:])\s+/)) {
        if ((current + part).length > maxChars && current) {
          pieces.push(current.trim())
          current = ''
        }
        current += part + ' '
      }
    } else {
      current += sentence
    }
  }
  if (current.trim()) pieces.push(current.trim())
  return pieces
}

/**
 * Build the ordered list of spoken segments for a draft.
 * Each segment: { role: 'title'|'body'|'moral', text (display), speech (TTS), pauseAfter }
 */
export function buildScript({ title, body, moral }, { maxChars = 4000, lexicon } = {}) {
  if (!title) throw new Error('Narration needs a title.')
  const paras = paragraphs(body)
  if (!paras.length) throw new Error('Narration needs a story body.')
  if (!moral) throw new Error('Narration needs the moral (virtueDescription).')
  const lex = lexicon ?? loadLexicon()
  const segments = []
  const push = (role, text, pauseAfter) =>
    segments.push({ role, text, speech: applyLexicon(text, lex), pauseAfter })

  push('title', ensureTerminalPunctuation(stripMarkdown(title).trim()), PAUSES.afterTitle)
  paras.forEach((para, i) => {
    const pieces = splitLong(para, maxChars)
    pieces.forEach((piece, j) => {
      const lastPiece = j === pieces.length - 1
      const lastPara = i === paras.length - 1
      push('body', piece, !lastPiece ? PAUSES.withinParagraph : lastPara ? PAUSES.beforeMoral : PAUSES.betweenParagraphs)
    })
  })
  for (const piece of splitLong(paragraphs(moral).join(' '), maxChars)) push('moral', piece, 0)
  segments[segments.length - 1].pauseAfter = 0
  return segments
}

/** Human-readable script with pause markers (written next to the narration). */
export function renderScript(segments) {
  return segments
    .map((s) => `${s.speech}${s.pauseAfter ? `\n[pause ${s.pauseAfter}s]` : ''}`)
    .join('\n\n') + '\n'
}
