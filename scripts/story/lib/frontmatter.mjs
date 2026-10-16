// A deliberately small YAML-frontmatter reader (no gray-matter dependency).
//
// Supports the subset a story draft needs:
//   key: plain value            key: "double \"quoted\""      key: 'single ''quoted'''
//   key: |  (literal block)     key: >  (folded block)         with -/+ chomping
//   key: [a, b]                 key:\n  - a\n  - b             (lists of scalars)
//   key:\n  sub: value          (one level of nested map)
//   # comments, blank lines
// Scalars stay strings except true/false/null and plain integers/decimals.
// Anything outside the subset throws with a line number rather than guessing.

const FENCE = '---'

/** Split a markdown file into `{ data, body, hasFrontmatter }`. */
export function parseFrontmatter(raw) {
  const text = raw.replace(/^﻿/, '').replace(/\r\n?/g, '\n')
  if (!text.startsWith(FENCE + '\n')) {
    return { data: {}, body: text, hasFrontmatter: false }
  }
  const end = text.indexOf('\n' + FENCE, FENCE.length)
  if (end === -1) throw new Error('Frontmatter opened with --- but never closed.')
  const yaml = text.slice(FENCE.length + 1, end + 1)
  const afterFence = text.indexOf('\n', end + 1)
  const body = afterFence === -1 ? '' : text.slice(afterFence + 1)
  return { data: parseYamlSubset(yaml), body: body.replace(/^\n+/, ''), hasFrontmatter: true }
}

function parseYamlSubset(yaml) {
  const lines = yaml.split('\n')
  const out = {}
  let i = 0

  const indentOf = (line) => line.match(/^ */)[0].length
  const isSkippable = (line) => line.trim() === '' || line.trim().startsWith('#')

  while (i < lines.length) {
    const line = lines[i]
    if (isSkippable(line)) {
      i++
      continue
    }
    if (indentOf(line) !== 0) throw new Error(`Frontmatter line ${i + 1}: unexpected indentation.`)
    const m = line.match(/^([A-Za-z_][\w-]*)\s*:(?:\s+(.*))?$/)
    if (!m) throw new Error(`Frontmatter line ${i + 1}: expected "key: value", got "${line}".`)
    const key = m[1]
    const rest = (m[2] ?? '').trim()
    if (Object.hasOwn(out, key)) throw new Error(`Frontmatter line ${i + 1}: duplicate key "${key}".`)
    i++

    // Block scalar.
    const block = rest.match(/^([|>])([+-]?)\s*(#.*)?$/)
    if (block) {
      const collected = []
      let blockIndent = null
      while (i < lines.length) {
        const l = lines[i]
        if (l.trim() === '') {
          collected.push('')
          i++
          continue
        }
        const ind = indentOf(l)
        if (blockIndent === null) blockIndent = ind
        if (ind < blockIndent || ind === 0) break
        collected.push(l.slice(blockIndent))
        i++
      }
      out[key] = foldBlock(collected, block[1], block[2])
      continue
    }

    if (rest === '' || rest.startsWith('#')) {
      // Nested list or map (or an empty value).
      const children = []
      while (i < lines.length && (isSkippable(lines[i]) || indentOf(lines[i]) > 0)) {
        if (!isSkippable(lines[i])) children.push({ text: lines[i].trim(), n: i + 1 })
        i++
      }
      if (children.length === 0) {
        out[key] = ''
      } else if (children.every((c) => c.text.startsWith('- ') || c.text === '-')) {
        out[key] = children.map((c) => parseScalar(c.text.replace(/^-\s*/, ''), c.n))
      } else {
        const map = {}
        for (const child of children) {
          const cm = child.text.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/)
          if (!cm) throw new Error(`Frontmatter line ${child.n}: expected "sub: value" under "${key}".`)
          map[cm[1]] = parseScalar(cm[2].trim(), child.n)
        }
        out[key] = map
      }
      continue
    }

    out[key] = parseScalar(rest, i)
  }
  return out
}

function foldBlock(lines, style, chomp) {
  while (lines.length && lines[lines.length - 1] === '' && chomp !== '+') lines.pop()
  let text
  if (style === '|') {
    text = lines.join('\n')
  } else {
    // Folded: single newlines become spaces; blank lines become paragraph breaks.
    text = lines
      .join('\n')
      .split(/\n{2,}/)
      .map((para) => para.replace(/\n/g, ' '))
      .join('\n\n')
  }
  return chomp === '-' ? text : text + (text ? '\n' : '')
}

function parseScalar(raw, lineNo) {
  const value = raw.trim()
  if (value === '') return ''
  if (value.startsWith('"')) {
    const end = findClosingDoubleQuote(value)
    if (end === -1) throw new Error(`Frontmatter line ${lineNo}: unterminated double-quoted string.`)
    return JSON.parse(value.slice(0, end + 1).replace(/\\'/g, "'"))
  }
  if (value.startsWith("'")) {
    const m = value.match(/^'((?:[^']|'')*)'/)
    if (!m) throw new Error(`Frontmatter line ${lineNo}: unterminated single-quoted string.`)
    return m[1].replace(/''/g, "'")
  }
  if (value.startsWith('[')) {
    if (!value.endsWith(']')) throw new Error(`Frontmatter line ${lineNo}: unterminated [list].`)
    const inner = value.slice(1, -1).trim()
    return inner === '' ? [] : splitInlineList(inner).map((part) => parseScalar(part, lineNo))
  }
  const plain = value.replace(/\s+#.*$/, '')
  if (plain === 'true') return true
  if (plain === 'false') return false
  if (plain === 'null' || plain === '~') return null
  if (/^-?\d+(\.\d+)?$/.test(plain)) return Number(plain)
  return plain
}

function findClosingDoubleQuote(s) {
  for (let i = 1; i < s.length; i++) {
    if (s[i] === '\\') {
      i++
      continue
    }
    if (s[i] === '"') return i
  }
  return -1
}

function splitInlineList(inner) {
  const parts = []
  let depth = 0
  let quote = null
  let start = 0
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i]
    if (quote) {
      if (ch === '\\' && quote === '"') i++
      else if (ch === quote) quote = null
    } else if (ch === '"' || ch === "'") quote = ch
    else if (ch === '[') depth++
    else if (ch === ']') depth--
    else if (ch === ',' && depth === 0) {
      parts.push(inner.slice(start, i))
      start = i + 1
    }
  }
  parts.push(inner.slice(start))
  return parts.map((p) => p.trim())
}

/** Serialize a flat object as frontmatter. Used only for scaffolding new files. */
export function stringifyFrontmatter(data) {
  const lines = [FENCE]
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      lines.push(value.length ? `${key}:` : `${key}: []`)
      for (const item of value) lines.push(`  - ${quote(item)}`)
    } else if (value && typeof value === 'object') {
      lines.push(`${key}:`)
      for (const [sub, v] of Object.entries(value)) lines.push(`  ${sub}: ${quote(v)}`)
    } else if (typeof value === 'string' && value.includes('\n')) {
      lines.push(`${key}: |`)
      for (const l of value.replace(/\n$/, '').split('\n')) lines.push(l ? `  ${l}` : '')
    } else {
      lines.push(`${key}: ${quote(value)}`)
    }
  }
  lines.push(FENCE)
  return lines.join('\n') + '\n'
}

function quote(value) {
  if (value === null || value === undefined) return '""'
  if (typeof value !== 'string') return String(value)
  if (value === '') return '""'
  if (/^[\w][\w .,'()/-]*$/.test(value) && !/^(true|false|null|~|-?\d+(\.\d+)?)$/.test(value)) {
    return value
  }
  return JSON.stringify(value)
}
