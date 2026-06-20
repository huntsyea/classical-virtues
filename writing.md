# Classical Virtues Writing Guide

This guide governs story prose and content structure. Read it with
`@PRODUCT.md` before writing, editing, publishing, or changing code that affects
story rendering.

## Voice

Classical Virtues should read like a trusted family anthology at bedtime: warm,
clear, literary, and restrained. The parent is often reading aloud from a phone
with a child beside them, so the prose should carry without explanation, clutter,
or visible optimization.

Write scenes before lessons. Let the virtue appear in a choice, a consequence,
or an act of character before it is named. Avoid abstract openings, sermon
paragraphs, and modern motivational phrasing.

Good Classical Virtues prose is:

- concrete enough to picture;
- simple enough to read aloud without stumbling;
- dignified without sounding stiff;
- moral without scolding;
- calm, exact, and unhurried.

## Story Shape

Story pages use a consistent anthology structure:

1. Plain story title.
2. Short summary.
3. Story body.
4. Moral or virtue reflection.
5. Related-story navigation supplied by the site.

The story body is narrative only. Do not include reader-facing SEO sections,
related-reading paragraphs, or duplicate moral cards inside the body.

Use `virtueDescription` for the moral/reflection that appears in the rendered
moral card. If the body already contains a moral heading, the page will feel
duplicated and should be revised before publication.

## Field Contract

Every publish-ready story must provide:

- `title`: plain anthology title, not an SEO subtitle;
- `slug`: stable, lowercase, hyphenated URL slug;
- `summary`: short reader-facing summary suitable for cards and metadata;
- `content`: the story narrative only;
- `virtueDescription`: the final moral/reflection;
- `virtue`: the canonical virtue or a mapped display value approved by Margaret;
- `canonicalVirtue`: one of the seven Classical Virtues canon entries when the
  storage model supports it;
- `source`: public-domain or classical source note where applicable;
- `imageAlt`: concrete alt text for the story image;
- `audioUrl`: optional, only when narration exists.

If the current CMS schema does not expose one of these fields yet, preserve the
intent in the brief or publish notes and route schema/rendering work to
engineering.

## Canon And Sub-Virtues

The product canon is the seven classical virtues named in `@PRODUCT.md`.
Sub-virtues such as kindness, mercy, honesty, patience, or self-control may be
used as story angles, but they must map back to the canon before publication.

Do not create orphan virtue labels that make canonical virtue pages look empty.
If a story uses a sub-virtue, the brief must name the canonical virtue it
supports and the reason for that mapping.

## SEO Boundary

SEO serves discoverability. It does not control the reading experience.

Allowed SEO surfaces:

- slug;
- metadata title and description;
- summary;
- structured data;
- internal-link recommendations outside the story body;
- brief notes for the editor and writer.

Not allowed in story bodies:

- headings like `What is the moral of...`;
- forced phrases such as `story for kids`;
- keyword-stuffed first paragraphs;
- related-reading blocks;
- FAQ/snippet copy that interrupts the tale;
- title subtitles added only for search.

Quinn may recommend terms, metadata, and search intent. Margaret decides how
that guidance enters the published content, and Quill must keep the story voice
intact.

## Approval Checklist

Before a story is published, Margaret should confirm:

- the story opens on a scene or character action, not an explanation;
- the virtue is demonstrated before it is explained;
- the title is anthology-clean;
- the story body contains no SEO scaffolding or related-reading block;
- the moral/reflection appears once, through `virtueDescription`;
- the story maps to the seven-virtue canon;
- source/provenance is accurate or uncertainty is cut;
- image alt text is meaningful;
- the draft has been compared against approved live examples for tone.

Approved comparison examples should include at least two live stories whose
structure and voice still match the target anthology standard.
