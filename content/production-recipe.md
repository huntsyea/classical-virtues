# Classical Virtues Production Recipe

This recipe governs normal story production from idea to Basehub publish. It is
human-triggered at every handoff. Do not build an automatic self-feeding content
loop from these steps.

## 1. Brief

Owner: Margaret, with SEO input from Quinn when search demand is part of the
assignment.

The brief must include:

- plain anthology title or working title;
- source/provenance note and any uncertainty to verify or cut;
- canonical virtue from the seven-virtue canon;
- optional sub-virtue angle and the reason it maps to the canon;
- intended reader/search fit;
- target length, defaulting to 350-650 words unless the brief explains why a
  longer treatment is needed;
- required structured fields: `slug`, `summary`, `virtueDescription`,
  `source`, `imageAlt`, and audio expectation;
- SEO guidance limited to metadata, summary, slug, structured discoverability,
  image alt text, and internal-link recommendations.

The brief is not ready for drafting if it asks for body-level SEO blocks,
unclear canon labels, invented quotations, or source claims that cannot be
verified.

## 2. Draft

Owner: Quill.

The draft must follow `writing.md`:

- paragraph one establishes actor, setting, and moral pressure;
- the story body is narrative only;
- virtue is shown before it is named;
- ornamental modifiers are cut back to concrete details;
- sentence rhythm works aloud for a parent reading at bedtime;
- the ending trusts the earned action or image, with explicit reflection reserved
  for `virtueDescription`.

Quill should return the draft with all required structured fields and any source
or canon questions called out for Margaret.

## 3. Editorial Gate Against Vault Exemplars

Owner: Margaret.

Before a draft can move toward publish, Margaret compares it against at least
two locked exemplars in `content/vault/exemplars/` and records the comparison in
the task thread or publish notes.

The comparison must name the two exemplars and check:

- opening pressure: actor, setting, and moral test appear promptly;
- virtue order: action before naming;
- rhythm: plain read-aloud sequence, not grand motivational cadence;
- diction: concrete nouns and verbs carry the prose;
- ending: no second moral ending inside `content`;
- field contract: `content` narrative only, `virtueDescription` reflection once,
  accurate source note, meaningful image alt text;
- canon: one canonical virtue, with any sub-virtue kept as an angle.

Verdict options:

- `publish`: all gates pass and SEO QA is cleared;
- `revise-with-notes`: the story can meet the bar with specific changes;
- `kill`: the premise, source, or voice cannot be made trustworthy without
  starting over.

## 4. SEO QA

Owner: Quinn.

Quinn checks discoverability surfaces only:

- slug;
- metadata title and description;
- summary/search fit;
- structured data fit;
- image alt text;
- internal-link recommendations outside the story body.

SEO QA fails if the story body contains keyword-stuffed openings, FAQ blocks,
`What is the moral of...` headings, `story for kids` phrasing, or related-story
paragraphs embedded in the narrative.

## 5. Basehub Publish

Owner: Margaret.

Publish only after:

- Margaret's editorial verdict is `publish`;
- Quinn's SEO QA is clear;
- source/provenance uncertainty is resolved or cut;
- required fields are present;
- no body-level SEO scaffolding remains.

After publishing in Basehub, verify the rendered story page:

- story URL resolves;
- title, summary, virtue, story body, moral/reflection, image alt text, and audio
  state match the approved fields;
- no duplicate moral card, separator, FAQ, or related-reading block appears in
  the body;
- there is a clear next-story or related-story path supplied by the site;
- metadata and structured discoverability use the approved summary and slug.

The final task comment must include the rendered URL, Basehub/publish evidence,
SEO QA result, vault exemplars used, and any follow-up owner.

## 6. Engineering Escalation

If approved content cannot render or publish safely, Margaret stops the publish
and routes a task to Engineering with:

- the story or field affected;
- the reader-facing impact;
- the expected behavior from `writing.md` and this recipe;
- any repro steps or rendered URL.

Do not patch code, schema, scripts, deployment, adapter config, or secrets from
the editorial workflow.
