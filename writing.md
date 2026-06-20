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

Ban these drift patterns in first drafts and final edits:

- modern motivational phrasing such as "unlock your potential," "choose your
  best self," "embrace the journey," or "live with purpose";
- civilizational or TED-talk openings such as "in a world where," "today more
  than ever," "modern seekers," or "the timeless lesson we all need";
- promotional, devotional, or inspirational cadence that sounds like a poster
  instead of a tale;
- polished moral triads used as padding, especially three abstract nouns in a
  row;
- symbolic explanations that tell the reader what the image means after the
  narrative has already shown it.

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

The first paragraph must put an actor in a concrete setting with visible moral
pressure by the end of the paragraph. Weather, landscape, and atmosphere may
serve the action, but they may not delay the problem.

Most stories should run 350-650 words. Shorter fables may be tighter; longer
retellings need a reason in the brief, such as necessary source context,
dialogue that clarifies the choice, or a second scene required by the original.

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

The `content` field may contain only the story narrative. Do not place
separators, `***`, related links, FAQ copy, source notes, metadata notes, or a
second moral ending inside it.

## Canon And Sub-Virtues

The product canon is the seven classical virtues named in `@PRODUCT.md`.
Sub-virtues such as kindness, mercy, honesty, patience, or self-control may be
used as story angles, but they must map back to the canon before publication.

Do not create orphan virtue labels that make canonical virtue pages look empty.
If a story uses a sub-virtue, the brief must name the canonical virtue it
supports and the reason for that mapping.

Name the virtue only after the action has made it visible. In the story body,
the default is one named virtue moment at or after the decisive choice. Repeated
labels such as honest, honesty, truthful, sincere, and true-hearted in the same
short scene should be cut unless each word does distinct narrative work.

Every brief and catalog record must name one canonical virtue from the seven and
may add one sub-virtue angle. The sub-virtue is an editorial angle, not the page
taxonomy.

## Sentence Rhythm And Diction

Read the draft aloud before it moves to review. Classical Virtues prose should
sound like a parent telling a well-made story, not like an introduction, sermon,
or marketing page.

Use this rhythm standard:

- keep the usual sentence plain and sequential: setup, action, fear or cost,
  consequence;
- vary sentence length, but avoid three consecutive sentences with the same
  long, balanced, polished shape;
- let short sentences carry fear, decision, and consequence;
- use concrete nouns and verbs before adjectives and adverbs;
- cut stacked modifiers unless a detail clarifies the scene.

As a practical edit, mark every adjective and adverb in a paragraph that feels
ornamental. Keep the one concrete modifier that helps the child picture the
moment; remove the rest.

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

Search guidance belongs in structured surfaces, not in the tale. If a keyword
cannot enter the title, slug, summary, metadata, source note, image alt text, or
internal-link recommendation without sounding forced, leave it out.

## Vault Comparison Gate

Before publication, compare every draft against at least two locked exemplars in
`content/vault/exemplars/`. This gate is mandatory.

The review note must name the two exemplars used and record:

- how the opening matches or departs from the exemplar pattern;
- whether the decisive virtue is shown before it is named;
- whether sentence rhythm stays read-aloud plain;
- whether the ending trusts an image or action instead of explaining the symbol;
- whether `content` contains narrative only;
- whether the canonical virtue and any sub-virtue angle are mapped cleanly.

Use `content/vault/drift-diagnosis.md` as the current list of known failure
patterns. A draft that repeats a diagnosed drift pattern must be revised before
publish.

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
- the draft has passed the two-exemplar vault comparison gate.

The two comparison examples should come from the locked vault unless Margaret
explicitly approves a newer live story as an added reference.
