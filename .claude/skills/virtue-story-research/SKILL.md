---
name: virtue-story-research
description: Find and verify a public-domain source for a new Classical Virtues story and write its brief. Use when choosing the next story, filling a thin virtue hub, or checking whether a source is public domain, faithfully attributed, and not already in the catalog.
---

# Virtue story research

You are doing what Bennett did for *The Book of Virtues*: going to the old texts,
choosing a tale that shows one virtue under pressure, and standing behind where it
came from. The product is a **brief** that `virtue-story-writer` can draft from
without guessing. Rules come from `writing.md` and `content/production-recipe.md`
step 1; where this skill and `writing.md` disagree, `writing.md` wins.

## Steps

1. **Read the gaps.**

   ```bash
   node .claude/skills/virtue-story-research/hub-counts.mjs
   ```

   It resolves every catalog story and draft to its canon hub the way the site
   does and prints all seven hubs, zeros included. Prefer the thinnest hub. Done
   when you can name each hub's count.

2. **Choose a candidate.** Start from [candidates.md](candidates.md) or the user's
   suggestion. A strong candidate has one **decisive act** a child can see (a
   hand, a cup, a word, a door, a bell rung), something at stake for someone, and
   something an adult will still be turning over afterwards. The act may belong to
   one chooser, to an institution, or to a creature that cannot speak; name whose
   it is in the brief and do not invent hesitation the source lacks. Reject candidates whose virtue is only
   announced, whose climax needs gore or cruelty to land, or whose famous version
   is a modern copyrighted retelling.

3. **Verify the source.** Follow [provenance.md](provenance.md). Read the primary
   public-domain text itself, in a named edition, and record its location. Done
   when you can state: original author or tradition, date, the edition you read,
   its public-domain basis, and every point where the popular version departs from
   the old text.

4. **Map to the canon.** Name exactly one `canonicalVirtue` and, if useful, one
   lowercase `subVirtue` angle. Give the reason in one sentence tied to the
   decisive act, not to the story's reputation. Check the angle resolves:

   ```bash
   grep -rn "SUB_VIRTUE_TO_CANON_SLUG" -A 8 src/lib
   grep -n alternateName src/data/virtues.json
   ```

   An angle that resolves nowhere needs a one-line engineering change to
   `SUB_VIRTUE_TO_CANON_SLUG` before publish; say so in the brief, or drop the angle
   and use the canon title as `virtue`.

5. **Check the slug.** Propose a slug from the plain title and confirm it is not in
   `backups/basehub/latest.json` or `content/drafts/`.

6. **Write the brief** to `content/drafts/<slug>/brief.md`, the pipeline's
   sidecar folder, using the template below, and save the governing passage as
   plain text to `content/drafts/<slug>/source.txt` (no title, no verse numbers).
   Done when every template line is filled or explicitly marked
   `uncertain: cut from copy`.

## Brief template

```markdown
# Brief: <Plain Title>

- Working title: <plain anthology title, no subtitle>
- Slug: <slug> (not in catalog, checked <date>)
- Source: <original author/tradition, date, passage>
- Editions read: <every public-domain edition consulted and where, e.g. KJV 1611 Genesis 8:6-13; Baldwin, Fifty Famous Stories Retold (1896), Gutenberg #18442>
- Governing text: <the one edition the draft follows event for event, and the passage; this is also the text the editor's blind comparison must beat>
- Why retell it: <what this retelling will do better than the governing text for a child at bedtime, and what the governing text already does best that must be kept; or "nothing, reprint it">
- Bedtime rival: <the best public-domain telling a parent could read aloud instead, over the same span (e.g. Kent and Sherman, The Children's Bible, 1922), saved as `content/drafts/<slug>/rival.txt`; or "the governing text" when it already reads aloud to a child>
- Passage: <first and last verse or sentence of the governing passage, and why it stops there (provenance.md step 5)>
- Refrains and set pieces: <chants, repeated lines, counted repetitions, and payoff lines in the governing text that the draft must keep>
- Public-domain basis: <why it is free to retell>
- Source note for the page: <short attribution, e.g. "Retold from Genesis 8">
- Departures and uncertainty: <where popular versions differ; what to cut rather than assert>
- Canonical virtue: <one of the seven>
- Sub-virtue angle: <lowercase angle or none>; resolves via <title | alternateName | SUB_VIRTUE_TO_CANON_SLUG | needs engineering line>
- Why this mapping: <one sentence tied to the decisive act>
- Decisive act: <the act and whose it is, in one sentence>
- Telling details in the source: <the concrete details the writer must keep>
- Attested lines: <any words the source puts in a speaker's mouth, verbatim from the PD edition>
- Reader fit: <age band, bedtime suitability, anything to soften and how the source allows it>
- Target length: <digits first so the linter can read it, e.g. "350-650 words" or "350-750 words. Exception: ...". Ask for an exception when the governing text has a refrain or chant, more than two scenes, or runs past 1,000 words (name the material it protects), or when the whole source is shorter than 350 words>
- Fields: title, slug, summary angle, virtueDescription angle, source, imageAlt scene, imagePrompt scene, audio (planned | human | none)
- SEO guidance: <search terms for metadata, summary, slug, alt text, and internal links only; never body copy>
- Internal-link ideas: <catalog stories on the same hub or theme>
```

## Boundaries

Search guidance stays in the surfaces `writing.md` allows: slug, metadata,
summary, structured data, image alt text, and internal-link recommendations. A
brief that asks for body-level SEO, invented quotations, or unverifiable source
claims is not ready.
