---
name: virtue-story-pipeline
description: Run one Classical Virtues story from idea to live page, one human-triggered handoff at a time (brief, draft, editor gate, SEO QA, check, illustration, narration, approval, Basehub publish, revalidate, verify). Use when asked to make, produce, or publish a new story, to narrate or illustrate a draft, or to find out what a story needs next.
---

# Virtue story pipeline

A story climbs an eleven-step ladder. Each step is a **handoff**: run the step
you were asked to run, confirm its done-condition, report, and stop. The next
step starts when a person asks for it. That is the rule of
`content/production-recipe.md`; the pipeline is a ladder, never a loop.

Start every run with `pnpm story:status <slug>` (or `pnpm story:status` for
every story in progress). It recomputes each step from the files, from a bare
brief onward, and prints the one next step. Run that step.

Read `content/pipeline.md` before steps 6-11, or whenever a command refuses: it
holds the flags, environment keys, file layout, gates and the audio spec.
Every command also prints its usage with `--help`. Record yourself as yourself:
notes name the agent that ran a step, and sign-offs belong to people.

## The ladder

1. **Brief.** `pnpm story:new <slug>`, then the `virtue-story-research` skill
   fills `content/drafts/<slug>/brief.md`.
   Done when `story:status` shows the brief as filled.
2. **Draft.** The `virtue-story-writer` skill writes `content/drafts/<slug>.md`
   to `content/story-format.md`.
   Done when `story:status` shows the draft with zero errors.
3. **Editor gate.** The `virtue-story-editor` skill, run by a reviewer who did
   not write the draft (a separate thread). It writes the round into
   `content/drafts/<slug>.gate.md`, naming itself in the round heading and
   recording `Draft sha256:` from `sha256sum content/drafts/<slug>.md`.
   Revisions return to step 2, then here. On a publish verdict, ask the editor
   of record to read the round and add their own
   `- Sign-off: <name>, <YYYY-MM-DD>` line. Sign-off lines are always written
   by the person who signs, never by an agent on that person's behalf.
   Done when `story:status` shows the editor gate done.
4. **SEO QA.** `pnpm story:seo <slug>` to read the report, then
   `pnpm story:seo <slug> --record`. The note records you as the one who ran
   it and leaves `- Owner sign-off:` blank. Ask the SEO owner to read
   it and fill that line in.
   Done when `story:status` shows SEO QA done.
5. **Check.** `pnpm story:check <slug>`.
   Done when it exits 0.
6. **Illustration.** `pnpm story:image <slug>` (needs `OPENAI_API_KEY`) or
   `--input <painting>` from a person. Open the master JPEG and look at it.
   Done when it matches the house style (oil, warm earth palette, one light
   source, period-true, no text) and the alt text describes what is in the
   frame. A miss means `--force` to regenerate.
7. **Narration.** `pnpm audio:lexicon --check <slug>` first; give every name
   it lists a decision in `scripts/audio/lexicon.json`. Then
   `pnpm story:audio <slug> --dry-run` and read `script.txt`, then
   `pnpm story:audio <slug>` (needs `ELEVENLABS_API_KEY` or `OPENAI_API_KEY`;
   `--input <recording>` when the draft says `audio: "human"`).
   Done when the lexicon check and `story:audio` both exit 0. If mastering
   reports heavy dynamics, stop and tell the person: re-rendering is the first
   choice, and `--accept-heavy-dynamics` is theirs to choose.
8. **Approval: the operator's step.** Tell the person what to review: the
   draft, the master image, and the whole MP3. They run
   `pnpm story:approve <slug> --by "<their name>"` in their own terminal and
   type the slug; it refuses inside agent sessions. Your work here is the
   review list and the wait. If the narration is a human recording and the
   transcript is "not verified", say so: the person must listen to all of it.
9. **Publish.** `pnpm story:publish <slug>` (dry run) and show the person the
   plan. On their go-ahead: `--assets --yes` (uploads only), then the dry run
   again, which now shows the final mutation with real URLs. On their second
   go-ahead: `--yes`, which stages the story in Basehub's working tree and
   prints its dashboard link. Publishing is the person's act: they open the
   Changes tab, read every pending change (a commit publishes all of them),
   and commit there. The pipeline has no way to commit.
   Done when the person confirms the commit; `story:status` marks step 9 done
   once step 11 passes on production.
10. **Revalidate.** `pnpm story:revalidate --base-url https://www.classicalvirtues.com --yes`.
    Done when it reports `Revalidated`.
11. **Verify.** `pnpm story:verify <slug> --base-url https://www.classicalvirtues.com --yes`.
    Done when it exits 0. Close with the recipe's report: rendered URL, publish
    evidence, editor round, reviewer and sign-off, exemplars, SEO QA result
    with who ran it and who signed it, follow-ups.

## When a command refuses

A refusal (exit code 2, "Gate closed") names what to fix and the step that
fixes it. Go back to that step; the gates are the product. Approved prose,
titles, summaries and morals are editorial property: when a technical step
fails on approved content, report the blocker to the editor and keep the prose
as written.
