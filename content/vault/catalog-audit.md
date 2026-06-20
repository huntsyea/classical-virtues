# Catalog Consistency Audit

Workstream C1 ([PRO-61]). Audited on 2026-06-20 against the field contract in
`writing.md` and the seven-virtue canon in `PRODUCT.md`.

Catalog source: live production (`https://www.classicalvirtues.com/sitemap.xml`)
plus the locked Basehub exports in `exemplars/`. Seven stories are published.

## Field Contract Conformance

Contract fields (per `writing.md`): `title`, `slug`, `summary`, `content`,
`virtueDescription`, `virtue`, `canonicalVirtue`, `source`, `imageAlt`,
`audioUrl` (optional).

| Story (slug) | Stored `virtue` | Canon virtue | summary | imageAlt | source | audio |
| --- | --- | --- | --- | --- | --- | --- |
| `androcles-and-the-lion` | Kindness | **Charity** | ✓ | ✗ empty | — n/a field | ✓ |
| `david-and-mephibosheth` | Mercy | **Charity** | ✓ | ✗ empty | — n/a field | ✗ |
| `the-cherry-tree` | Honesty | **Justice** | ✓ | ✗ empty | — n/a field | ✓ |
| `the-woodcutters-axe` | Honesty | **Justice** | ✓ | ✗ empty | — n/a field | n/a |
| `the-three-men` | Courage | **Fortitude** | ✓ | ✗ empty | — n/a field | n/a |
| `the-ant-and-the-grasshopper` | Prudence | **Prudence** | ✓ | ✓ concrete | — n/a field | n/a |
| `the-boy-and-the-filberts` | Temperance | **Temperance** | ✓ | ✓ concrete | — n/a field | n/a |

Legend: ✓ present/conforming · ✗ missing · n/a field = the CMS has no such field
yet (see Schema Gaps).

## Canon Mapping — RESOLVED (engineering)

Before C1, four stories carried orphan sub-virtue labels (`Kindness`, `Mercy`,
`Honesty`×2) that matched no canon virtue, so they never appeared on a virtue
hub and their story-page eyebrow did not link. `Courage` already resolved to
`Fortitude` via the canon alternate name.

C1 adds a sub-virtue → canon bridge in `src/lib/virtues.ts`
(`SUB_VIRTUE_TO_CANON_SLUG`), sourced from the Writing Vault canon reference
(PRO-57):

- `kindness` → **Charity** (compassion freely given)
- `mercy` → **Charity** (covenant love shown where judgment is expected)
- `honesty` → **Justice** (giving others the truth they are owed)

Result: **all 7 stories now map to a canon virtue (0 orphans)**, verified by
smoke test. The stored `virtue` field stays free-text so the eyebrow can still
display the sub-virtue angle ("A story of kindness") while linking up to the
correct canon hub. No story prose, title, summary, or reflection was edited.

This bridge is the engineering equivalent of a `canonicalVirtue` field: the
canon never changes, so it lives in-repo (the same graceful-degradation
principle as the seven virtues and the story fallback in `stories.ts`) rather
than in the CMS.

## Schema / Render Consistency

End-to-end wiring confirmed in `basehub.ts` → `stories.ts` → render/metadata:

| Field | In Basehub schema | Queried | Rendered | Status |
| --- | --- | --- | --- | --- |
| `title` (`_title`) | ✓ | ✓ | ✓ h1 + metadata | OK |
| `slug` (`_slug`) | ✓ | ✓ | ✓ route | OK |
| `summary` | ✓ | ✓ | ✓ meta description + cards | OK |
| `content` | ✓ | ✓ | ✓ body | OK |
| `virtueDescription` | ✓ | ✓ | ✓ moral card | OK |
| `virtue` | ✓ | ✓ | ✓ eyebrow + canon bridge | OK |
| `imageAlt` (`image.alt`) | ✓ | ✓ | ✓ hero `alt` | wired; content gap (see below) |
| `canonicalVirtue` | ✗ (derived in-repo) | n/a | ✓ via bridge | OK (by design) |
| `source` | ✗ | ✗ | ✗ | **GAP** |

### Gaps (delegated, do not block C1 engineering)

1. **`imageAlt` content gap** — the field is wired end-to-end, but 5 of 7
   stories have empty `image.alt` in Basehub, so the page falls back to the
   generic `Illustration for <title>`. This is a content backfill, not a code
   bug. Owner: Margaret / illustration. → child issue.
2. **`source` schema gap** — the contract lists a `source` provenance note, but
   Basehub's `StoriesItem` has no `source` field and nothing renders it. This is
   the one true unmet contract field. Needs an additive Basehub schema field
   plus wiring through `basehub.ts` → `stories.ts` → render. → child issue.

## Acceptance

- Every story maps to a canon virtue: **met** (0 orphans, verified).
- Turnkey "new virtue" checklist documented in-repo: **met**
  (`content/vault/new-virtue-checklist.md`).
- Full field-contract conformance: **met except** the two delegated gaps above,
  which are content/CMS-schema work, not engineering blockers.
