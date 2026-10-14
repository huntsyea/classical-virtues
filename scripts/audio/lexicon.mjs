// audio:lexicon: check, show, or push the narration pronunciation lexicon.
//
//   pnpm audio:lexicon --check <slug>   list every name in the story's read-aloud script
//                                       that is in neither `entries` (respelled) nor
//                                       `plain` (reads fine) in scripts/audio/lexicon.json;
//                                       exit 1 if any is undecided
//   pnpm audio:lexicon                  print the entries and the rules that would be pushed
//   pnpm audio:lexicon --push --yes     create an ElevenLabs pronunciation dictionary from the
//                                       entries and print the two env lines to add
//                                       (ELEVENLABS_PRONUNCIATION_DICTIONARY_ID/_VERSION)
//
// Without a pushed dictionary, narrate substitutes each `alias` into the TTS
// text locally, which works with every provider and model.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadLexicon, paragraphs } from './lib/readaloud.mjs'
import { main, isEntry, log, UsageError, requireEnv, REPO_ROOT } from '../story/lib/cli.mjs'
import { loadDraft } from '../story/lib/draft.mjs'

const lexiconFile = () => JSON.parse(readFileSync(join(REPO_ROOT, 'scripts', 'audio', 'lexicon.json'), 'utf8'))

export function lexiconRules(lexicon = loadLexicon()) {
  return Object.entries(lexicon).map(([word, { alias }]) => ({ string_to_replace: word, type: 'alias', alias }))
}

/**
 * Proper names in a draft's spoken text: words capitalized somewhere other
 * than the start of a sentence in the body or moral (the title-cased title is
 * left out, so "Dove" in "Noah and the Dove" is not a name).
 */
export function namesIn(draft) {
  const text = [...paragraphs(draft.body), draft.fields.virtueDescription].join('\n')
  const names = new Map()
  for (const sentence of text.split(/(?<=[.!?:;"”])\s+|\n/)) {
    const words = sentence.match(/[\p{L}'’]+/gu) ?? []
    words.slice(1).forEach((w) => {
      if (!/^\p{Lu}\p{Ll}/u.test(w)) return
      const bare = w.replace(/['’]s$/, '')
      names.set(bare, (names.get(bare) ?? 0) + 1)
    })
  }
  return names
}

async function cli({ flags }) {
  const file = lexiconFile()
  const entries = file.entries
  if (flags.check) {
    const draft = loadDraft(flags.check)
    const plain = new Set(file.plain ?? [])
    const known = (n) => plain.has(n) || Object.keys(entries).some((k) => k.split(' ').includes(n))
    const names = [...namesIn(draft).entries()]
    const undecided = names.filter(([n]) => !known(n))
    for (const [n, count] of names) log.info(`${known(n) ? (entries[n] ? `respelled → ${entries[n].alias}` : 'plain').padEnd(28) : 'UNDECIDED'.padEnd(28)} ${n} (${count}×)`)
    if (undecided.length) {
      throw new UsageError(`${undecided.length} name(s) have no pronunciation decision: ${undecided.map(([n]) => n).join(', ')}. Add each to "plain" (reads fine) or "entries" (with an alias) in scripts/audio/lexicon.json.`)
    }
    log.ok(`Every name in "${draft.fields.title}" has a pronunciation decision.`)
    return
  }
  const rules = lexiconRules(entries)
  for (const [word, { alias, ipa }] of Object.entries(entries)) log.info(`${word.padEnd(16)} → ${alias.padEnd(18)} /${ipa}/`)
  if (!flags.push) {
    log.ok(`${rules.length} entries, ${(file.plain ?? []).length} plain names. Pass --push --yes to create an ElevenLabs dictionary from the entries.`)
    return
  }
  if (!flags.yes) throw new UsageError('Pushing creates a dictionary in your ElevenLabs account. Re-run with --push --yes.')
  const key = requireEnv('ELEVENLABS_API_KEY', 'Add it to .env.local.')
  const res = await fetch('https://api.elevenlabs.io/v1/pronunciation-dictionaries/add-from-rules', {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `classical-virtues-${new Date().toISOString().slice(0, 10)}`,
      description: 'Classical Virtues narration names (generated from scripts/audio/lexicon.json)',
      rules,
    }),
  })
  if (!res.ok) throw new Error(`ElevenLabs HTTP ${res.status}: ${(await res.text()).slice(0, 400)}`)
  const dict = await res.json()
  log.ok(`Created dictionary "${dict.name}" with ${dict.version_rules_num} rules. Add to .env.local:`)
  console.log(`ELEVENLABS_PRONUNCIATION_DICTIONARY_ID=${dict.id}\nELEVENLABS_PRONUNCIATION_DICTIONARY_VERSION=${dict.version_id}`)
}

if (isEntry(import.meta.url)) main(cli, { meta: import.meta.url, args: [0, 0], flags: { check: 'string', push: 'boolean', yes: 'boolean' } })
