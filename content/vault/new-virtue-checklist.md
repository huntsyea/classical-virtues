# "New Virtue" Turnkey Checklist

Goal: once the catalog is consistent (PRO-61), adding a story is **purely
additive**. Follow this checklist and a new story drops into the right canon hub,
links correctly, and conforms to the field contract — no structural changes
required.

Read `writing.md` (field contract, voice, SEO boundary) and `PRODUCT.md` (the
seven-virtue canon) before drafting. Margaret owns editorial approval and Basehub
publishing; engineering owns schema/render/scripts.

## 1. Pick the canon virtue (editorial — Margaret)

- Every story maps to exactly one of the seven canon virtues: **Prudence,
  Justice, Fortitude, Temperance, Faith, Hope, Charity**.
- A story may lead with a sub-virtue *angle* (kindness, mercy, honesty, patience,
  courage, self-control, …). The angle is a presentation choice; the canon virtue
  is the taxonomy. Decide both in the brief.

## 2. If the angle is a NEW sub-virtue label (engineering — one line)

The CMS `virtue` field is free-text and drives both the story-page eyebrow and
the virtue-hub grouping. A label only resolves to a canon hub if it is either:

- a canon **title** (`Prudence`, `Justice`, …), or
- a canon **`alternateName`** in `src/data/virtues.json` (`Courage`→Fortitude,
  `Love`→Charity), or
- listed in **`SUB_VIRTUE_TO_CANON_SLUG`** in `src/lib/virtues.ts`.

If the new label is none of these, it will be an **orphan** (no hub, no eyebrow
link). To prevent that, add one line to `SUB_VIRTUE_TO_CANON_SLUG`:

```ts
// src/lib/virtues.ts
const SUB_VIRTUE_TO_CANON_SLUG: Record<string, string> = {
  kindness: 'charity',
  mercy: 'charity',
  honesty: 'justice',
  patience: 'temperance', // ← example: add the new angle → canon slug
}
```

Use the canon **slug** (lowercase) on the right. Confirm the mapping with
Margaret (it is a canon decision). No new label = no code change needed.

## 3. Fill the field contract (editorial)

Every publish-ready story must provide:

- `title` — plain anthology title (not an SEO subtitle)
- `slug` — stable, lowercase, hyphenated
- `summary` — short reader-facing summary (also the meta description)
- `content` — narrative only; no SEO scaffolding, separators, related-reading, or
  second moral ending in the body
- `virtueDescription` — the single moral/reflection (renders in the moral card)
- `virtue` — the canon title or an angle that resolves per step 2
- `imageAlt` — concrete alt text for the illustration (Basehub `image.alt`).
  **Do not leave empty** — empty alt falls back to a generic string and fails the
  contract.
- `audioUrl` — only if narration exists
- `source` — provenance note *(pending the additive Basehub `source` field; until
  then record it in the brief/publish notes)*

## 4. Publish (editorial — Margaret)

- Publish to Basehub. `getAllStories()` / `getStoryBySlug()` pick it up; the story
  route and virtue hub are statically generated from the catalog.
- Webhook `/revalidate-sitemap` refreshes the sitemap on content change.

## 5. Verify (anyone)

- Story page renders: `https://www.classicalvirtues.com/stories/<slug>`
- Eyebrow "A story of <angle>" **links** to `/virtues/<canon-slug>` (not plain
  text → that means orphan; revisit step 2).
- Story appears on its canon virtue hub: `/virtues/<canon-slug>`.
- Hero image alt is concrete (not "Illustration for …").
- Story is in the sitemap.

Quick local check that a label resolves to canon before publishing:

```bash
node -e 'const V=require("./src/data/virtues.json"),S={kindness:"charity",mercy:"charity",honesty:"justice"};
const n=process.argv[1].toLowerCase();
const d=V.find(v=>n===v.title.toLowerCase()||n===(v.alternateName||"").toLowerCase());
console.log(d?d.slug:(S[n]||"ORPHAN — add to SUB_VIRTUE_TO_CANON_SLUG"))' "Kindness"
```

## New canon virtue (rare)

The seven canon virtues are fixed. Only if the canon itself changes: add the
entry to `src/data/virtues.json`, run `scripts/seed-virtues.mjs` to mirror it into
Basehub, and update `PRODUCT.md`/`writing.md`. This is a product decision, not
routine story work.
