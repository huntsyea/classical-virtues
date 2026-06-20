# `source` Provenance Field — CMS Setup & Backfill

Workstream for [PRO-62]. The `source` field is the last field-contract field
(see `writing.md`) that had no CMS home. The **rendering and query wiring is
done and merged** (`src/lib/basehub.ts` → `src/lib/stories.ts` → story page +
Article JSON-LD). What remains needs Basehub dashboard access and editorial
sign-off; until then nothing renders (the line is omitted when `source` is
empty, so there is no regression).

## 1. Add the Basehub field (dashboard / schema access)

In the Basehub `Stories` collection, add a field:

- **API name:** `source` (must be exactly `source` — the query selects it by
  this name).
- **Type:** **Text** (single-line string). **Not** Rich Text — the code reads
  `story.source` as a plain string (`Scalars['String']`); a rich-text field
  returns an object and will not render.
- **Required:** no. Leave optional so existing items stay valid and stories
  without a known source simply render no provenance line.
- **Label/help text (suggested):** "Public-domain or classical source note,
  e.g. `From Aesop's Fables`. Shown as a small attribution line under the story,
  outside the narrative. Leave blank if the source is uncertain."

After the field exists, regenerate the generated types so the optional cast and
the runtime fallback in `basehub.ts` become inert:

```
pnpm run basehub   # regenerates basehub-types.d.ts to include `source`
```

No code change is required after that — the query already selects `source`
first and falls back to the base selection only while the field is absent.

## 2. Backfill source notes (Margaret — editorial)

`writing.md` rule: **provenance is accurate or uncertainty is cut.** Where the
source is uncertain, leave the field blank (nothing renders). The notes below
are engineering *suggestions* drawn from the locked exemplars and the catalog;
Margaret owns the final wording.

| Story (slug) | Suggested `source` | Confidence |
| --- | --- | --- |
| `androcles-and-the-lion` | From Aesop's Fables | high (Aesopic tradition; also recorded by Aulus Gellius) |
| `the-ant-and-the-grasshopper` | From Aesop's Fables | high |
| `the-boy-and-the-filberts` | From Aesop's Fables | high |
| `the-woodcutters-axe` | From Aesop's Fables ("Mercury and the Woodman") | high |
| `david-and-mephibosheth` | Retold from 2 Samuel 9 | high (Hebrew Bible, public domain) |
| `the-cherry-tree` | A traditional tale popularized by Mason Locke Weems, *The Life of Washington* (1806) | medium — famously apocryphal; phrase so it does not assert historical fact |
| `the-three-men` | — | **unknown — leave blank** pending Margaret's source check |

Style: keep it short and plain (an attribution, not a citation). Prefer
"From Aesop's Fables" over a full bibliographic reference. The rendered line is
`Source: <value>`.

## Acceptance (PRO-62)

- [x] `source` wired end-to-end in code (query → `StoryData` → render +
      structured data), type-checked and linted.
- [ ] `source` field added in Basehub (Text, optional).
- [ ] Source notes backfilled per the table above (Margaret-approved).
- [ ] Verified on a deploy: provenance line renders under at least one story and
      is absent where `source` is blank.
