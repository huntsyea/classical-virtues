# Story Draft File Format

Version: 2 (2026-10-13; adds the optional `dek`). This is a contract. The writing skills produce it, the
linter checks it, and the publishing and audio pipelines (`scripts/story`,
`scripts/audio`) read it. Change it only by bumping the version here and telling
every consumer.

## Location

One story per file: `content/drafts/<slug>.md`. The file name must equal the
`slug` value. The pipeline keeps its sidecar folder beside it,
`content/drafts/<slug>/`, which holds the brief (`brief.md`), the governing
public-domain text as plain text (`source.txt`), the bedtime rival when the brief
names one (`rival.txt`, the best public-domain children's telling of the same
span), and stage state. The editorial
gate note is `content/drafts/<slug>.gate.md`.

Two sidecar facts are machine-read by the linter: the brief's
`- Target length: <min>-<max> ...` line sets the word range (default 350-650), and
`source.txt` lets virtue words the source itself uses ("the bell of justice")
count as attested rather than as the narrator's label. Neither is part of this
format; a consumer that globs `content/drafts/*.md` must skip names containing a
second dot.

## Shape

A UTF-8 Markdown file with a frontmatter block, then the story body:

```markdown
---
title: "Noah and the Dove"
slug: "noah-and-the-dove"
virtue: "Hope"
canonicalVirtue: "Hope"
subVirtue: ""
summary: "..."
dek: "..."
virtueDescription: "..."
source: "Retold from Genesis 8"
imageAlt: "..."
imagePrompt: "..."
audio: "planned"
---

First paragraph of the story.

Second paragraph of the story.
```

## Frontmatter rules

- The block opens on line 1 with `---` and closes with the next line that is
  exactly `---`.
- The eleven required keys below are present, plus the optional `dek` when it
  is used, in this order, one per line, each written as `key: "value"`.
- Every value is a single line, written as a YAML double-quoted string. Escape
  `"` as `\"` and `\` as `\\`. This subset is valid YAML and each value is also a
  valid JSON string, so a zero-dependency reader can split on the first `: ` and
  `JSON.parse` the rest.
- No other keys. Consumers ignore unknown keys, but producers do not add any
  without a version bump here.

| Key | Required | Meaning | Basehub target |
| --- | --- | --- | --- |
| `title` | yes | Plain anthology title. No subtitle, no colon. | `_title` |
| `slug` | yes | Lowercase, hyphenated: `^[a-z0-9]+(-[a-z0-9]+)*$`. Equals the file name. | `_slug` |
| `virtue` | yes | Display label for the story-page eyebrow. Either `canonicalVirtue` or the capitalized `subVirtue`. | `virtue` |
| `canonicalVirtue` | yes | Exactly one of `Prudence`, `Justice`, `Fortitude`, `Temperance`, `Faith`, `Hope`, `Charity`. | derived from `virtue` by the site's canon resolver; publish scripts may also write it to a CMS field |
| `subVirtue` | key required, value may be `""` | Lowercase editorial angle such as `mercy` or `honesty`. If set, it must resolve to `canonicalVirtue` through a canon `alternateName` in `src/data/virtues.json` or `SUB_VIRTUE_TO_CANON_SLUG` (declared in `src/lib`; `grep -rn SUB_VIRTUE_TO_CANON_SLUG src/lib`). | none |
| `summary` | yes | 120 to 160 characters. The meta description, feed, and share text; serves search and sharing. | `summary` |
| `dek` | no; omit the key or leave it `""` | Editorial standfirst under the headline and on cards, 80 to 160 characters, for the reader standing at the story. Falls back to `summary` when empty. | `dek` |
| `virtueDescription` | yes | The single moral reflection. Renders in the moral card. | `virtueDescription` |
| `source` | yes | Short provenance note, e.g. `From Aesop's Fables`. Plain text, no URL. Renders as `Source: <value>`. | `source` (Text field, pending in CMS) |
| `imageAlt` | yes | Concrete alt text for the illustration. | `image.alt` |
| `imagePrompt` | yes | Prompt for the house illustration style. Not reader-facing. | none (used to generate `image`) |
| `audio` | yes | `"planned"` (narrate it), `"human"` (a recording will be supplied), `"none"` (no narration), or the `https://` URL of finished narration. | `audioUrl` when it is a URL |

## Body rules

The body is everything after the closing `---`, and it maps to Basehub
`content` as Markdown.

- Narrative only: plain paragraphs separated by one blank line.
- Allowed inline Markdown: `*italics*` for a name or a word that needs stress.
- Not allowed: headings, horizontal rules (`***`, `---`, `___`), lists, block
  quotes, links, images, HTML, footnotes, source notes, a moral line, or
  related-reading copy.

## Prose rules that apply to every reader-facing value

`title`, `summary`, `dek`, `virtueDescription`, `imageAlt`, and the body contain no em
dash (`—`), en dash (`–`), or double hyphen standing in for one. The hyphen in a
compound word (`read-aloud`) is fine. Length and voice rules come from
`writing.md`.

## Checking a file

```bash
node .claude/skills/virtue-story-editor/scripts/lint-story.mjs content/drafts/<slug>.md
node .claude/skills/virtue-story-editor/scripts/lint-story.mjs --json content/drafts/<slug>.md
```

Exit code `0` means no errors (warnings may remain), `1` means at least one
error, `2` means the file could not be read or parsed. The `--json` report is
stable for pipeline use: `{ files: [{ file, ok, errors[], warnings[], stats }] }`,
each issue `{ rule, message, line? }`.
