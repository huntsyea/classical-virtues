# Story And Narration Pipeline

How a story gets from idea to a live, narrated page. It implements
`content/production-recipe.md`: every stage is a separate command a person
chooses to run, each refuses to run when an earlier stage does not hold, and
nothing triggers the next stage by itself. Agents follow
`.claude/skills/virtue-story-pipeline/SKILL.md`; this file is the reference
behind it.

Requires Node 22.9 or newer and `ffmpeg`/`ffprobe` built with libmp3lame and
soxr. Every command prints its usage with `--help` and does nothing else;
unknown flags are errors. `pnpm story:selftest` runs the pipeline's regression
suite offline (see the end of this file).

## The ladder

One numbering, used by every script header, `story:status`, and the skill.

| # | Stage | Command | Holds when | Recipe |
| --- | --- | --- | --- | --- |
| 1 | Brief | `pnpm story:new <slug>` + `virtue-story-research` | brief names a verified source and a canon virtue | 1 |
| 2 | Draft | `virtue-story-writer` | linter has zero errors | 2 |
| 3 | Editor gate | `virtue-story-editor` (a reviewer who did not write it), then the editor of record signs off | latest round is `publish`, records the draft's sha256, carries a person's `Sign-off:` line | 3 |
| 4 | SEO QA | `pnpm story:seo <slug> --record`, then the SEO owner signs off | `<slug>.seo.md` is `clear` for the current draft and carries the owner's `Owner sign-off:` | 4 |
| 5 | Check | `pnpm story:check <slug>` | linter, publish contract, gate note, SEO note all pass | 3-4 |
| 6 | Illustration | `pnpm story:image <slug> [--input file]` | a 3:2 JPEG master at least 1536 px wide from the current `imagePrompt` | |
| 7 | Narration | `pnpm story:audio <slug> [--input recording]` | the MP3 meets the spec, is tagged for this story, paces like this text, and (with a transcription key) its transcript matches | |
| 8 | Approval | `pnpm story:approve <slug> --by "<name>"` (a person, in their own terminal) | the approval names the current draft, notes and files | 5 |
| 9 | Publish | `pnpm story:publish <slug>` → `--assets --yes` → `--yes` (stages only); then a person commits in the Basehub dashboard | the live page verifies against the approved bytes | 5 |
| 10 | Revalidate | `pnpm story:revalidate --base-url https://www.classicalvirtues.com --yes` | the site answers `revalidated: true` | 5 |
| 11 | Verify | `pnpm story:verify <slug> --base-url https://www.classicalvirtues.com --yes` | every rendered-page check passes | 5 |

`pnpm story:status [slug]` shows where each story stands, from a bare brief
onward, and names the one next step. It is read-only.

## Threat model

The gates exist to catch honest mistakes and agent drift: a draft edited
after review, a verdict misread, a dash or link slipping into the body, the
wrong file uploaded, an agent stepping into a person's role, a stale record
trusted. They are not a defence against a person deliberately editing hashes,
notes or records on their own disk; anyone with write access to the repo and
the tokens can do that, and no local check changes it. Concretely:

- **Sign-off lines are attestations.** `- Sign-off: <name>, <YYYY-MM-DD>` in an
  editor round and `- Owner sign-off: <name>, <YYYY-MM-DD>` in the SEO note
  say that the named person read that round or note and approves it. Only that
  person writes the line. The pipeline checks that one is present, that the name
  does not read as an agent, and that the date is not in the future or before
  the review; it cannot prove who typed it. When one person plays several
  recipe roles, they sign with their own name and the role, e.g.
  `- Sign-off: huntsyea, 2026-10-13`.
- **Agents are named as agents.** Inside an agent session (detected by
  `BB_THREAD_ID`, `CLAUDECODE`/`CLAUDE_CODE_ENTRYPOINT`, or any `CODEX_*`
  variable) every record the pipeline writes names the agent, e.g.
  `Run by: agent (bb thread thr_…)`. `STORY_ACTOR` can add who the agent works
  for, never replace it, and is refused if it names an owner (anyone listed in
  `STORY_OWNERS`). `story:approve` refuses to run in an agent
  session at all.
- **Hashes bind reviews to bytes.** Any edit to the draft reopens the editor
  gate and SEO QA; any change to the image or MP3 reopens approval. That stops
  drift, not forgery: a person who rewrites the hash line on purpose is outside
  this model.
- **state.json is a cache.** It is never evidence on its own; see below.
- **Publishing is a person in the Basehub dashboard.** The pipeline stages one
  story's changes and stops. There is no commit code in it (the self-test
  checks). Whoever commits reads the Changes tab, which also shows anyone else's
  pending edits, because a commit publishes the whole working tree.

## Who did what

- **Editor gate.** The round heading names the reviewer, e.g. `## Round 3:
  publish (2026-10-13, independent critic thread thr_..., virtue-story-editor
  skill)`. The round holds `- Draft sha256: <sha256sum of the draft>` and,
  once the editor of record has read it, their `- Sign-off:` line.
- **SEO QA.** `story:seo --record` writes `- Run by:` (an agent thread, or a
  person's account), `- Owner:` (default `the user`), and a blank `- Owner
  sign-off:` for the owner. Re-recording against the same draft bytes keeps a
  sign-off; any draft edit clears it.
- **Approval.** `story:approve --by "<name>"` records that name and the OS
  account that ran it.
- The approval screen and publish plan print the reviewer, both sign-offs, who
  ran SEO QA, how the image and narration were made, and the transcript status.
- `story:status` names the actual next step: when a publish round bound to the
  current draft lacks only its sign-off, it asks the editor of record to sign,
  not for another review.

## How the gates hold

- **Hashes, not timestamps.** The draft's sha256 must appear in the editor's
  latest round and the SEO note; any edit reopens both.
- **The gate note is read the way a person reads it.** Rounds are found in any
  heading style (`#` to `######`, a bold line, a setext heading, Roman
  numerals); the highest round number is current. Anything ambiguous fails
  closed: a heading naming two verdicts, a heading and `Verdict:` line that
  disagree (markup such as backticks is stripped first), a duplicate round, a
  round without a readable verdict, or any other heading that says kill or
  revise. A gate note copied from another story fails on its `- Draft:` line
  and hash.
- **The body is read the way the site renders it.** The contract parses the
  body with the site's own markdown stack (react-markdown's unified +
  remark-parse + remark-gfm): any heading (including setext), link (inline,
  reference or autolinked), footnote, list, quote, rule, image or HTML fails.
  Character references are decoded first, so `&#x02014;` is an em dash. Other
  catalog titles and "if you enjoyed..." invitations in the body fail; ordinary
  prose such as "read the wind, and next..." does not. Slugs that collide with
  fixed routes under `src/app/stories/` fail. These rules live in the pipeline,
  so they hold whatever the editor's linter does.
- **Recomputed from the files.** `story:image`, `story:audio`,
  `story:approve` and `story:publish` re-run the full check. The illustration
  is probed (JPEG, 3:2, at least 1536 px); the MP3 is re-analyzed against the
  spec, its ID3 title and story URL must name this draft, and its pace is
  computed from its real duration. Hosted narration (`audio: "https://..."`)
  gets the same treatment: it must be on an allowed host and is downloaded and
  measured.
- **state.json is a cache.** It holds what cannot be recomputed from a file:
  which prompt or voice made an artifact, the transcript result, the approval,
  and uploaded asset URLs. Those are used only when they name the same sha256
  as the file on disk, and asset URLs only after they are fetched from an
  allowed host (this project's Blob store or `assets.basehub.com`) and their
  bytes match the approved file, in the dry run and again immediately before
  the write.
- **Approval binds five hashes:** draft, gate note, SEO note, illustration,
  narration. Change any one and publish refuses until someone approves again.
- **Wrong recordings.** `--input` is accepted only when the draft says
  `audio: "human"`, or with `--override-audio-expectation`, which also requires
  a transcription key and a passing transcript check (word error rate ≤ 15%,
  first and last sentences matched). Pace (1.7-3.4 spoken words per second)
  only catches truncated takes and much longer or shorter texts. Without a
  transcription key, a human recording is marked "not verified" in red at
  approval, and the person approving must listen to all of it.

## Remote targets

- `story:revalidate` and `story:verify` target `http://localhost:3100` unless
  given `--base-url`. Any other host must be this site (www or apex) or a
  preview host listed exactly in `STORY_PREVIEW_HOSTS` (Vercel project names are
  registrable by anyone, so no pattern is trusted), over https, with `--yes`.
  The legacy `BASEHUB_WEBHOOK_SECRET` (also Basehub's signing key) is only ever
  sent to localhost or production; previews need `REVALIDATE_TOKEN`.
- `story:publish` writes nothing without `--yes`. `audio:upload` uploads nothing
  without `--yes`, refuses `--yes` for any slug with a draft in the repo's
  `content/drafts` (whatever `STORY_DRAFTS_DIR` says), and only accepts
  `--remaster --yes` for an already published story.
- Boolean flags take no value: `--yes=false` is an error, never a yes.

## Files

```
content/drafts/<slug>.md            draft (format: content/story-format.md)
content/drafts/<slug>.gate.md       editor's gate note (rounds; highest N is current)
content/drafts/<slug>.seo.md        SEO QA note (story:seo --record, signed by the owner)
content/drafts/<slug>/
  brief.md                          step 1
  state.json                        cache: stage results, approval, uploaded asset URLs
  image/  source.*  <slug>.jpg  prompt.txt  image.json
  audio/  script.txt  chunks/  narration.wav  narration.json  <slug>.mp3  <slug>.json
```

Binaries under `content/drafts/*/image` and `*/audio` are git-ignored
(`content/drafts/.gitignore`). `STORY_DRAFTS_DIR=/some/dir` points the story
commands at a scratch copy for rehearsals.

## Environment

Present today in `.env.local`: `BASEHUB_TOKEN`, `BASEHUB_ADMIN_TOKEN`,
`BASEHUB_WEBHOOK_SECRET`, `BLOB_READ_WRITE_TOKEN`.

To add:

| Key | Needed for | Notes |
| --- | --- | --- |
| `ELEVENLABS_API_KEY` | narration (preferred), transcript check | `ELEVENLABS_VOICE_ID` (default George, `JBFqnCBsd6RMkjVDRZzb`), `ELEVENLABS_MODEL_ID` (default `eleven_multilingual_v2`), `ELEVENLABS_OUTPUT_FORMAT` (default `pcm_44100`; falls back to `pcm_24000`, then MP3), `ELEVENLABS_VOICE_SETTINGS`, `ELEVENLABS_SEED`, `ELEVENLABS_STT_MODEL` (default `scribe_v2`) |
| `OPENAI_API_KEY` | illustration; narration alternative; transcript check | `OPENAI_IMAGE_MODEL` (default `gpt-image-2`), `OPENAI_IMAGE_QUALITY`, `OPENAI_TTS_MODEL` (default `gpt-4o-mini-tts`), `OPENAI_TTS_VOICE` (default `marin`), `OPENAI_TRANSCRIBE_MODEL` (default `gpt-4o-transcribe`) |
| `REVALIDATE_TOKEN` | story:revalidate | the site's dedicated bearer (`src/lib/revalidate.ts`); until set, the legacy secret is used for localhost and production only |
| `STORY_PREVIEW_HOSTS` | optional | exact preview hostnames revalidate/verify may target |
| `ELEVENLABS_PRONUNCIATION_DICTIONARY_ID` / `_VERSION` | optional | printed by `pnpm audio:lexicon --push --yes` |
| `NARRATION_PROVIDER`, `TRANSCRIBE_PROVIDER` | optional | `elevenlabs` or `openai` |
| `STORY_OWNERS` | optional | comma-separated names that count as owners, so an agent's record can never carry one (see "Threat model") |
| `STORY_SITE_URL` | optional | host written into MP3 tags; default `https://www.classicalvirtues.com` |

## SEO QA (`story:seo`)

The SEO owner's step from the recipe, limited to discoverability surfaces: slug
(short, carries the title's words, not already a story in Basehub), title tag
(`<title> | Classical Virtues` within 60 characters), summary as meta
description (120-160 characters, no stock SEO phrasing, does not open by
repeating the title), the optional dek (80-160 characters, no stock
phrasing, not the summary again), image alt (8-30 words, describes rather than labels),
structured-data inputs (canon virtue resolves, source present), a body free of
links and SEO scaffolding, and internal-link recommendations outside the body
(the canon hub, same-virtue stories, the brief's ideas, each confirmed to
exist). Without `--record` it only reports.

## Illustration (`story:image`)

The house style was read off the published catalog: 3:2 landscape oil
paintings in a 19th-century academic manner, warm earth palette, one
directional light, dignified figures, no text. It is locked in
`scripts/story/lib/house-style.mjs` and appended to every draft's
`imagePrompt`. Generation asks OpenAI for 1536x1024. The master is
center-cropped to 3:2 only when the source is off by more than 1%, capped at
2400 px wide (never upscaled), and written as a 4:4:4 JPEG at near-maximum
quality with metadata stripped.

## Narration

### Read-aloud script

Title, 1.2 s pause, the body paragraph by paragraph (0.75 s between), 1.5 s
pause, then the moral (`virtueDescription`) read once. Markdown is stripped.
Each paragraph is one TTS request, so every pause is measured silence we
insert. ElevenLabs requests carry the neighbouring paragraphs as context, so
intonation flows across joins. Chunks are cached by voice, text and that
context: an interrupted run resumes, and editing one paragraph re-renders it
and the neighbours that carry it as context.

`pnpm audio:lexicon --check <slug>` lists the names in the script and fails on
any without a pronunciation decision in `scripts/audio/lexicon.json`
(`entries` are respelled for TTS only; `plain` names read fine).

After mastering, `story:audio` transcribes the MP3 when a transcription key is
set and compares it with the script (word error rate ≤ 15%).

`--provider rehearsal` with `REHEARSAL_VOICE_FILE=<any speech recording>`
exercises narrate, stitch, master and analyze without a TTS key. Approval and
publish refuse it.

### Delivery spec

Graded by `pnpm audio:analyze <file|url>` (`scripts/audio/lib/spec.mjs`):

| Property | Target |
| --- | --- |
| Integrated loudness | -19 LUFS ±0.5 measured on the mono file, which is -16 LUFS as heard |
| True peak | ≤ -1.5 dBTP on the decoded MP3 |
| Loudness range | ≤ 11 LU; warns below 3.5 LU |
| Dynamics processing | share of 10 ms speech windows losing more than 3 dB to compressor, de-esser and limiter together: ≤ 2% passes; 2-10% only with `--accept-heavy-dynamics` (recorded, flagged red at approval); over 10% fails |
| Format | MP3, mono, 44.1 kHz, CBR 64 kbps, Xing/Info + LAME header |
| Silence | 0.4 s before the first word, 1.0 s after the last |
| Tags | ID3v2.3: title, artist `Classical Virtues`, album `Classical Virtues: Stories Read Aloud`, genre `Spoken Word`, year of first publication, comment = story URL, 600x600 JPEG cover ≤ 20 KB; nothing else |

**Why -19 on the file.** Phones, browsers and podcast apps play a mono MP3
through both speakers, and BS.1770 sums the two channels (+3 LU). -19 LUFS on
the file is -16 LUFS as heard. `analyze` prints both.

**Why CBR 64 kbps.** A browser seeks a CBR MP3 by byte arithmetic, so 15-second
skips and saved resume positions land exactly; VBR seeks interpolate a
100-point table (about 1.8 s apart on a 3-minute story). 64 kbps mono is
480 KB per minute and keeps the voice band.

**Why keep a small cover.** Browsers and podcast apps use the page and feed
artwork; downloaded files, car head units and file players show the embedded
one. At ≤ 20 KB it costs a few tens of milliseconds.

### Mastering chain (`audio:master`)

1. Decode to 32-bit float mono 44.1 kHz (soxr).
2. Pre-gain to -20 LUFS and high-pass at 75 Hz.
3. Compression only for wide-range sources (LRA over 6 LU): 2:1 above
   -12 dB RMS with a standard knee, touching only the loudest phrases. TTS
   renders and most narration skip it. Measured on Androcles, compressing a
   dense source before limiting stacks gain reduction in the same windows and
   does more than the limiter alone. Its gain reduction is recorded.
4. De-essing only when sibilance is clearly excessive (loudest 5% of
   high-band frames more than 4 dB above the voice band). It then cuts only
   frames above the sibilant band's own 95th percentile + 3 dB, at most 6 dB,
   at most 20 cuts per minute.
5. Trim edge silence by measurement, then pad to exactly 0.4 s and 1.0 s.
6. Peak control, two-pass loudnorm, encode: no limiter first, then a
   4x-oversampled limiter (1 ms lookahead, 50 ms release) at peak-to-loudness
   ceilings from 17 dB down to 14 dB. Each candidate goes through loudnorm
   pass 1 and a linear pass 2 (aimed 0.35 LU hot for LAME's loss), is encoded,
   and the decoded MP3 is measured. The first candidate comfortably inside the
   spec (±0.25 LU, at or under -1.6 dBTP) wins; a merely in-spec one is used
   only if no comfortable one appears within two further ceilings.
7. Dynamics budget, as above, from the trimmed pre-gain signal to the limiter
   output (absolute gain reduction; nothing is median-normalized away).
8. ID3v2.3 written by hand (ffmpeg stores `comment` as TXXX and leaks encoder
   strings).
9. `audio:analyze` grades the result; the sidecar records duration, bytes,
   loudness on the file and as heard, sha256, and every decision: compressor,
   de-esser, limiter ceiling, gain-reduction distributions, dynamics verdict.

### Hosting

Narration lives on Vercel Blob at content-addressed paths
(`audio/<slug>-<sha8>.mp3`, no random suffix, overwrite disabled, one-year
max-age): the same bytes give the same URL and a new master gets a new URL.
The story points at it through `audioUrl`, and through the `audio` media field
too once the schema migration lands (the site plays `audio.url` first, so
publish always sets both to the same file). Uploads must pass `audio:analyze`;
the CDN is then checked for a 206 range response with `audio/mpeg`.

### Before and after: the two live narrations

Measured with `pnpm audio:analyze` on the published files (2026-10-13), then
mastered locally. Nothing has been uploaded, and nobody has listened yet.

| | Androcles before | Androcles after | Cherry Tree before | Cherry Tree after |
| --- | --- | --- | --- | --- |
| Integrated, file / as heard | -21.9 / -18.9 LUFS | -19.0 / -16.0 LUFS | -21.3 / -18.3 LUFS | -19.0 / -16.0 LUFS |
| True peak | -1.0 dBTP | -1.7 dBTP | -2.0 dBTP | -1.7 dBTP |
| LRA | 4.9 LU | 3.9 LU | 5.9 LU | 6.1 LU |
| Compressor / de-esser | | skipped / skipped | | skipped / skipped |
| Windows over 3 dB (all dynamics) | | 8.2%, max 7.8 dB: **heavy, accepted for review** | | 0%, max 2.5 dB |
| Bitrate / size | 128k, 2,784 KB | 64k, 1,421 KB | 128k, 1,982 KB | 64k, 1,019 KB |
| Head / tail silence | 0 / 0.28 s | 0.4 / 1.0 s | 0 / 0.35 s | 0.4 / 1.0 s |
| Spec checks failed | 14 of 22 | 0 of 22 | 12 of 22 | 0 of 22 |

The Androcles render arrives with a 20.9 dB peak-to-loudness ratio, so meeting
the spec takes more than 3 dB from 8% of its 10 ms windows. Without
`--accept-heavy-dynamics` mastering refuses it. Re-rendering it from lossless
TTS output is better than replacing it with this master; if it is replaced,
A/B it against the live file first.

## Publishing (`story:publish`)

1. **Dry run** (no flags): re-runs the check, re-measures the files, resolves
   the target (create, or update with a full line diff, which also needs
   `--update-existing`), and prints the exact transaction. It writes every
   StoriesItem field in the draft-tree schema: the seven existing ones, plus
   `canonicalVirtue` (reference to the VirtuesItem), `subVirtue`, `audio`
   (media, same file as `audioUrl`; left out when there is no narration),
   `publishedAt` (on create), `contentUpdatedAt` and `dek` (the draft's
   optional standfirst; empty means the page uses the summary) whenever
   `scripts/basehub/migrate-story-schema.mjs` has added them. Every value is
   checked against the SDK's value schemas (the SDK's own operation schema
   passes instance values through unchecked), dates must be ISO, and a live
   field left unset, a placeholder URL, a URL on another host, or an asset whose
   bytes do not match the approved file makes the payload invalid.
2. **`--assets --yes`** uploads the narration (Blob) and illustration (Basehub
   assets) and prints the final mutation.
3. **`--yes`** re-verifies every asset byte for byte, sends the transaction
   without `autoCommit`, reads the story back (every written field, including
   the migrated ones and the image URL), and prints the story's Basehub
   dashboard link with what to check.
4. **A person commits in the Basehub dashboard.** They read the Changes tab
   (a commit publishes every pending change, not just this story), set
   `publishedAt` to the commit date if it is a later day than staging, and
   commit. Then steps 10 and 11.

Step 9 counts as done when a production `story:verify` passes against these
draft bytes and the approved MP3; that is how the dashboard commit is
confirmed.

## Revalidate and verify

`story:revalidate` posts to `/api/revalidate` with a bearer token and a unique
body (the handler ignores repeated identical deliveries).

`story:verify <slug>` checks the rendered page: 200, h1 and `<title>`, meta
description equals the summary, the standfirst is the dek (or the summary
when there is none), the story body (`#story-body`) is narrative
paragraphs only and says the approved text word for word (typography aside),
the moral appears exactly once, hero alt,
narration wired into the page and the `AudioObject` JSON-LD, served as 206
`audio/mpeg`, byte-for-byte the approved MP3, declared duration within 1 s,
Article and BreadcrumbList JSON-LD, a canonical that answers without a
redirect, the canon-hub eyebrow link, a link to another story, the source note,
no SEO scaffolding, and a sitemap entry.

## Self-test (`pnpm story:selftest`)

Offline regression suite (fetch disabled, scratch directory, fixture story):

- every documented command exists and answers `--help`, and every flag in a
  printed or documented command is one the script accepts;
- no code path issues a Basehub commit, and story:publish has no commit flag;
- strict flags;
- dash spellings in every field;
- related-reading text;
- kill rounds in fourteen spellings (heading levels, bold, setext, Roman
  numerals, two verdicts in one heading, backticked Verdict lines, override
  sections) and newest-first order;
- agent-named, future-dated and pre-review sign-offs, and the sign-off-only
  next step;
- rendered dash forms (leading-zero references, two-em, minus, vertical em,
  spaced `--`) and rendered body structure (reference links, setext headings,
  autolinks, footnotes, rules);
- duplicate or ambiguous rounds;
- missing sign-offs;
- swapped or forged image and MP3;
- forged `state.json`;
- approval binding;
- placeholder and foreign asset URLs, null media, malformed dates, asset
  fetch failures;
- hosted narration measured from its bytes;
- `STORY_ACTOR` naming an owner in an agent session;
- `story:verify`'s body extraction and comparison;
- the update diff showing reorders and duplicates;
- reserved route slugs and duplicate frontmatter keys;
- migrated-field coverage;
- lookalike preview hosts;
- `audio:upload` guards;
- `story:status` surviving stray files;
- transcript matching.

Run it after any change to `scripts/story` or `scripts/audio`.
