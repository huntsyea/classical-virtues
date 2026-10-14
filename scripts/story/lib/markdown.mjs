// Read a story body the way the site renders it.
//
// The story page renders `content` with react-markdown + remark-gfm
// (src/app/stories/[slug]/page.tsx), so the gates parse it with the same
// unified + remark-parse + remark-gfm stack instead of guessing with regexes:
// a setext heading, a reference-style link, a `www.` autolink or a footnote
// is exactly what the renderer says it is. Character references are decoded
// the same way, so `&#x02014;` is an em dash here because it is one on the page.

import { createRequire } from 'node:module'
import { realpathSync } from 'node:fs'
import { join } from 'node:path'
import { REPO_ROOT } from './cli.mjs'

let stack
async function loadStack() {
  if (stack) return stack
  const fromReactMarkdown = createRequire(join(realpathSync(join(REPO_ROOT, 'node_modules', 'react-markdown')), 'package.json'))
  const [{ unified }, { default: remarkParse }, { default: remarkGfm }] = await Promise.all([
    import(fromReactMarkdown.resolve('unified')),
    import(fromReactMarkdown.resolve('remark-parse')),
    import(createRequire(join(REPO_ROOT, 'package.json')).resolve('remark-gfm')),
  ])
  stack = unified().use(remarkParse).use(remarkGfm)
  return stack
}

/** Node types a narrative body may contain: paragraphs of text with emphasis. */
const ALLOWED = new Set(['root', 'paragraph', 'text', 'emphasis', 'strong', 'break'])
const LABEL = {
  heading: 'heading',
  thematicBreak: 'separator',
  list: 'list',
  listItem: 'list',
  blockquote: 'block quote',
  html: 'HTML',
  link: 'link',
  linkReference: 'link',
  definition: 'link definition',
  image: 'image',
  imageReference: 'image',
  footnoteReference: 'footnote',
  footnoteDefinition: 'footnote',
  code: 'code',
  inlineCode: 'code',
  table: 'table',
  delete: 'strikethrough',
}

/**
 * Parse a markdown body. Returns { disallowed: [{ type, label, line }],
 * paragraphs: [plain text...], text } where text is what a reader sees.
 */
export async function parseBody(markdown) {
  const tree = (await loadStack()).parse(markdown)
  const disallowed = []
  const walk = (node) => {
    if (!ALLOWED.has(node.type)) disallowed.push({ type: node.type, label: LABEL[node.type] ?? node.type, line: node.position?.start.line ?? null })
    for (const child of node.children ?? []) walk(child)
  }
  walk(tree)
  const textOf = (node) => (node.type === 'text' ? node.value : node.type === 'break' ? ' ' : (node.children ?? []).map(textOf).join(''))
  const paragraphs = tree.children.filter((n) => n.type === 'paragraph').map((n) => textOf(n).replace(/\s+/g, ' ').trim())
  return { disallowed, paragraphs, text: paragraphs.join('\n\n') }
}

/** Decode HTML character references, including leading zeros, as markdown does. */
export function decodeReferences(text) {
  const named = { mdash: '—', ndash: '–', horbar: '―', minus: '−', amp: '&', nbsp: ' ', hyphen: '‐', dash: '‐' }
  return String(text ?? '')
    .replace(/&#x0*([0-9a-f]+);/gi, (m, h) => safeCodePoint(parseInt(h, 16), m))
    .replace(/&#0*(\d+);/g, (m, d) => safeCodePoint(Number(d), m))
    .replace(/&([a-z]+);/gi, (m, n) => named[n.toLowerCase()] ?? m)
}

function safeCodePoint(cp, fallback) {
  try {
    return String.fromCodePoint(cp)
  } catch {
    return fallback
  }
}
