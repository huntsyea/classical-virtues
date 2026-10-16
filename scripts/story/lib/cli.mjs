// Small CLI helpers shared by the story and audio pipelines.
//
// No dependencies: a strict flag parser, a slug guard, colored status lines,
// and a `main()` wrapper. Every CLI declares its flags; `--help` prints the
// script's header comment and exits before any side effect; unknown flags and
// `--yes=anything` are errors; thrown errors become clean exit codes
// (1 usage/failure, 2 gate closed) so every stage fails loudly.

import { readFileSync } from 'node:fs'
import { userInfo } from 'node:os'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

/**
 * Strict argv parser. `spec.flags` maps every accepted flag to 'boolean' or
 * 'string'; anything else is a usage error, so a typo or `--help` can never
 * fall through to the command's action.
 *   boolean flags: bare `--yes` only (`--yes=false` is rejected, never "yes")
 *   string flags:  `--key value` or `--key=value`
 *   `spec.args`:   [min, max] positional count
 */
export function parseArgs(argv, spec = {}) {
  const known = spec.flags ?? {}
  const out = { _: [], flags: {} }
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]
    if (!token.startsWith('-') || token === '-') {
      out._.push(token)
      continue
    }
    if (!token.startsWith('--')) throw new UsageError(`Unknown option "${token}".`)
    const eq = token.indexOf('=')
    const key = token.slice(2, eq === -1 ? undefined : eq)
    const type = known[key]
    if (!type) throw new UsageError(`Unknown option "--${key}".`)
    if (type === 'boolean') {
      if (eq !== -1) throw new UsageError(`--${key} takes no value; pass it bare to turn it on, omit it to leave it off.`)
      out.flags[key] = true
      continue
    }
    if (eq !== -1) {
      out.flags[key] = token.slice(eq + 1)
    } else {
      const next = argv[i + 1]
      if (next === undefined || next.startsWith('--')) throw new UsageError(`--${key} needs a value.`)
      out.flags[key] = next
      i++
    }
  }
  const [min = 0, max = Infinity] = spec.args ?? [0, Infinity]
  if (out._.length < min) throw new UsageError(`Expected at least ${min} argument(s), got ${out._.length}.`)
  if (out._.length > max) throw new UsageError(`Unexpected argument(s): ${out._.slice(max).join(' ')}`)
  return out
}

/** The leading `//` comment block of a script: its usage text, kept in one place. */
export function headerComment(importMetaUrl) {
  const lines = readFileSync(fileURLToPath(importMetaUrl), 'utf8').split('\n')
  const out = []
  for (const line of lines) {
    if (!line.startsWith('//')) break
    out.push(line.replace(/^\/\/ ?/, ''))
  }
  return out.join('\n').trim()
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function assertSlug(slug) {
  if (!slug) throw new UsageError('Missing <slug>.')
  if (!SLUG_RE.test(slug)) {
    throw new UsageError(`Invalid slug "${slug}". Use lowercase words joined by single hyphens.`)
  }
  return slug
}

/** An error whose message is the whole story: printed without a stack trace. */
export class UsageError extends Error {}

/** A gate refused to proceed. Exit code 2 distinguishes it from crashes. */
export class GateError extends Error {}

const useColor = process.stdout.isTTY && !process.env.NO_COLOR
const paint = (code) => (s) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : String(s))
export const c = {
  green: paint(32),
  red: paint(31),
  yellow: paint(33),
  dim: paint(2),
  bold: paint(1),
}

export const log = {
  step: (msg) => console.log(c.bold(`▸ ${msg}`)),
  ok: (msg) => console.log(`${c.green('✓')} ${msg}`),
  warn: (msg) => console.log(`${c.yellow('!')} ${msg}`),
  fail: (msg) => console.log(`${c.red('✗')} ${msg}`),
  info: (msg) => console.log(`  ${msg}`),
}

/**
 * Run a CLI entry point. With `spec` ({ meta: import.meta.url, flags, args }),
 * argv is parsed strictly before anything else happens: `--help`/`-h` prints
 * the script's header comment and exits 0 with no side effects, and a usage
 * error exits 1 before `fn` runs. `fn` receives the parsed { _, flags }.
 */
export function main(fn, spec) {
  if (!spec?.meta) throw new Error('main() needs a spec ({ meta: import.meta.url, flags, args }) so arguments are parsed strictly.')
  let parsed
  {
    const argv = process.argv.slice(2)
    if (argv.includes('--help') || argv.includes('-h')) {
      console.log(headerComment(spec.meta))
      process.exit(0)
    }
    try {
      parsed = parseArgs(argv, spec)
    } catch (err) {
      console.error(`${c.red('✗')} ${err.message}\n  Run with --help for usage.`)
      process.exit(1)
    }
  }
  Promise.resolve()
    .then(() => fn(parsed))
    .then(
    (code) => process.exit(typeof code === 'number' ? code : 0),
    (err) => {
      if (err instanceof GateError) {
        console.error(`${c.red('✗ Gate closed:')} ${err.message}`)
        process.exit(2)
      }
      if (err instanceof UsageError) {
        console.error(`${c.red('✗')} ${err.message}`)
        process.exit(1)
      }
      console.error(c.red('✗ Failed:'), err?.stack || err)
      process.exit(1)
    },
  )
}

/** True when this module is the process entry point (so libs can double as CLIs). */
export function isEntry(importMetaUrl) {
  return process.argv[1] && fileURLToPath(importMetaUrl) === process.argv[1]
}

/**
 * Names that count as an owner's, so an agent's record can never carry one.
 * There is no built-in list: set STORY_OWNERS to the comma-separated names of
 * the people who own editorial sign-offs in this repo.
 */
export function ownerNames() {
  return (process.env.STORY_OWNERS ?? '').split(',').map((n) => n.trim()).filter(Boolean)
}

/** The agent session this process runs in, if any (bb thread, Claude Code, Codex). */
export function agentSession() {
  if (process.env.BB_THREAD_ID) return `bb thread ${process.env.BB_THREAD_ID}`
  if (process.env.CLAUDECODE || process.env.CLAUDE_CODE_ENTRYPOINT) return 'Claude Code session'
  if (Object.keys(process.env).some((k) => k.startsWith('CODEX_'))) return 'Codex session'
  return null
}

/** True when this process runs inside an agent session rather than a person's own terminal. */
export const isAgentSession = () => Boolean(agentSession())

/**
 * Who is running this command, for notes and records. Inside an agent session
 * the record always names the agent; STORY_ACTOR can only add who it is
 * working for ("agent (bb thread …) for Hunter"), and may never be one of the
 * names in STORY_OWNERS, because an owner's name on a record means that person
 * did the work.
 * Outside an agent session it is the OS account, or STORY_ACTOR when a person
 * wants a fuller name on the record.
 */
export function actorIdentity() {
  const session = agentSession()
  const named = process.env.STORY_ACTOR?.trim()
  if (session) {
    if (named && ownerNames().some((o) => named.toLowerCase().includes(o.toLowerCase()))) {
      throw new UsageError(`STORY_ACTOR="${named}" names an owner, but this is an agent session (${session}). Owners sign their own lines; unset STORY_ACTOR.`)
    }
    return `agent (${session})${named ? ` for ${named}` : ''}`
  }
  if (named) return named
  try {
    return `${userInfo().username} (shell)`
  } catch {
    return 'unknown'
  }
}

/** Require an env var by name, with a human-facing hint. Never prints the value. */
export function requireEnv(name, hint) {
  const value = process.env[name]
  if (!value) {
    throw new UsageError(`${name} is not set. ${hint ?? ''}`.trim())
  }
  return value
}
