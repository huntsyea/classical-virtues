#!/usr/bin/env node
// Build blind judging packets in a neutral directory outside the repository.
//
//   Pair (step 3a, draft vs governing text or bedtime rival):
//     node blind-packet.mjs <draft.md> <reference.txt> <judgeDir> <keyDir> [--seed N]
//   Style (step 3b, "one hand or several?"):
//     node blind-packet.mjs --style <judgeDir> <keyDir> <story.md|.txt> <story.md|.txt> [more...]
//
// The judge directory receives packet.md and prompt.md only; the key goes to keyDir,
// which the judge never sees. Typography is normalized so no text is identifiable by
// quotes, dashes, emphasis, or line wrapping.

import fs from 'node:fs'
import path from 'node:path'
import { randomInt } from 'node:crypto'

const HERE = path.dirname(new URL(import.meta.url).pathname)
const args = process.argv.slice(2)
const usage = () => {
  console.error('usage: blind-packet.mjs <draft.md> <reference.txt> <judgeDir> <keyDir> [--seed N]\n       blind-packet.mjs --style <judgeDir> <keyDir> <story> <story> [more...]')
  process.exit(2)
}

const bodyOf = (text) => {
  const t = text.replace(/\r\n/g, '\n')
  if (!t.startsWith('---\n')) return t
  const end = t.indexOf('\n---\n', 4)
  return end === -1 ? t : t.slice(end + 5)
}
const normalize = (t) =>
  bodyOf(t)
    .replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
    .replace(/\s*[,;:]?\s*(--|—|–)\s*/g, ', ')
    .replace(/,\s*,/g, ',')
    .replace(/[*_]/g, '')
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n')
const wc = (s) => s.split(/\s+/).filter(Boolean).length
const shuffle = (xs) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = randomInt(0, i + 1); [a[i], a[j]] = [a[j], a[i]] } return a }

// The judge prompts live in blind-judge.md between the markers below, so the
// documented prompt and the one sent are the same text.
const promptFrom = (marker) => {
  const md = fs.readFileSync(path.join(HERE, '..', 'blind-judge.md'), 'utf8')
  const m = md.match(new RegExp(`<!-- ${marker} -->\\s*\`\`\`text\\n([\\s\\S]*?)\`\`\``))
  if (!m) throw new Error(`prompt ${marker} not found in blind-judge.md`)
  return m[1]
}
const guardDir = (d) => {
  let p = path.resolve(d)
  for (;;) {
    if (['CLAUDE.md', 'AGENTS.md', '.git'].some((n) => fs.existsSync(path.join(p, n)))) throw new Error(`${d} is inside a project (${p}); judges must run in a neutral directory such as /tmp/cv-blind-judge/<run>`)
    const up = path.dirname(p)
    if (up === p) return
    p = up
  }
}

try {
if (args[0] === '--style') {
  const [, judgeDir, keyDir, ...files] = args
  if (!judgeDir || !keyDir || files.length < 3) usage()
  guardDir(judgeDir)
  const order = shuffle(files)
  const labels = order.map((_, i) => String.fromCharCode(65 + i))
  fs.mkdirSync(judgeDir, { recursive: true }); fs.mkdirSync(keyDir, { recursive: true })
  fs.writeFileSync(path.join(judgeDir, 'packet.md'), order.map((f, i) => `# Text ${labels[i]}\n\n${normalize(fs.readFileSync(f, 'utf8'))}\n`).join('\n'))
  fs.writeFileSync(path.join(judgeDir, 'prompt.md'), promptFrom('style-prompt').replace('<TEXTS>', labels.join(', ')))
  fs.writeFileSync(path.join(keyDir, 'key.json'), JSON.stringify(Object.fromEntries(order.map((f, i) => [`Text ${labels[i]}`, f])), null, 2) + '\n')
} else {
  const [draftPath, refPath, judgeDir, keyDir] = args
  if (!draftPath || !refPath || !judgeDir || !keyDir) usage()
  guardDir(judgeDir)
  const s = args.indexOf('--seed')
  const seed = s >= 0 ? Number(args[s + 1]) : randomInt(1, 1_000_000)
  const draftFirst = seed % 2 === 1
  const draft = normalize(fs.readFileSync(draftPath, 'utf8'))
  const ref = normalize(fs.readFileSync(refPath, 'utf8'))
  const [one, two] = draftFirst ? [draft, ref] : [ref, draft]
  fs.mkdirSync(judgeDir, { recursive: true }); fs.mkdirSync(keyDir, { recursive: true })
  fs.writeFileSync(path.join(judgeDir, 'packet.md'), `# Text 1\n\n${one}\n\n# Text 2\n\n${two}\n`)
  fs.writeFileSync(path.join(judgeDir, 'prompt.md'), promptFrom('pair-prompt'))
  fs.writeFileSync(path.join(keyDir, 'key.json'), JSON.stringify({ draft: draftFirst ? 'Text 1' : 'Text 2', draftPath, refPath, seed, words: { 'Text 1': wc(one), 'Text 2': wc(two) } }, null, 2) + '\n')
}
} catch (e) {
  console.error(`blind-packet: ${e.message}`)
  process.exit(2)
}
console.log(`judge dir: ${path.resolve(args[0] === '--style' ? args[1] : args[2])} (packet.md, prompt.md)`)
console.log(`key:       ${path.resolve(args[0] === '--style' ? args[2] : args[3])}/key.json (read only after the judge answers)`)
