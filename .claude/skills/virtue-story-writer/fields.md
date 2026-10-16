# Fields

Exact keys, order, and encoding are in `content/story-format.md`. This file is how
to write each one well. Every reader-facing field is dash-free.

## title

The plain anthology title, usually the traditional one: "The Bell of Atri,"
"The North Wind and the Sun." No subtitle, no colon, no "A Story of." Under 50
characters.

## slug

The title, lowercase, words joined by hyphens, apostrophes dropped
(`the-woodcutters-axe`). Drop a leading "the" only when the title is long. No
keywords appended: never `-story`, `-for-kids`, `-moral`. Check it is not already
in `backups/basehub/latest.json` or `content/drafts/`.

## virtue, canonicalVirtue, subVirtue

`canonicalVirtue` is one of the seven. `subVirtue` is a lowercase angle or `""`.
`virtue` is the eyebrow label: the canon title, or the capitalized angle when the
angle resolves (the linter checks this against `SUB_VIRTUE_TO_CANON_SLUG` in `src/lib`). When in
doubt, use the canon title as `virtue` and keep the angle in `subVirtue`.

## summary

The meta description, feed, and share text: 120 to 160 characters, one or two
sentences, read by someone who has not yet arrived (a search result, a link in a
message). It does what Bennett's one-line introductions did: tells a browsing
parent who, where, and what is at stake, so they choose this story tonight. Name
the person and the pressure; hold back the closing image. Write it fresh rather
than lifting phrases from the body, which the reader is about to hear. No
"Discover," "Learn how," "timeless," "inspiring," or "story for kids." It does not
need the virtue word; the eyebrow already carries it.

> Before (in range, still wrong): Discover the timeless tale of a humble king who
> learned an important lesson about pride in this inspiring fable for all ages.
>
> After: When a rich neighbor shows off her jewels, Cornelia calls in her two sons
> and says she will show the visitor hers.

## dek (optional standfirst)

The line under the headline and on cards, 80 to 160 characters, for the reader
already standing at the story. Where the summary orients a stranger, the dek
invites someone who is here: one concrete image or turn, in the voice of an
Atlantic standfirst, that makes them want the first paragraph. It may be
shorter and more oblique than the summary, but never coy and never a label. No
"Discover the timeless tale," no virtue word, no ending given away, and no phrase
repeated from the summary or the first sentence of the body. Leave it out and
the site falls back to the summary.

> Before: A timeless tale of honesty and its rewards.
>
> After: A woodcutter's axe goes into the river, and a stranger offers him one of
> gold.

## virtueDescription (the reflection)

The one place the moral is spoken. 20 to 60 words, two or three sentences, warm and
plain, the voice of a parent closing the book. Name the virtue once. Say one true
thing about it that this story showed, and connect it to ordinary life. Do not
retell the plot, stack three abstract nouns, or write a poster ("True courage
is..."). It may end on a small practical sentence. Fact-check it like the body:
every claim it makes about the story must be true of the body and the source.

> Before: True honesty means opening our hearts and speaking truly, for those who
> are honest unlock a life of trust, peace, and abundance.
>
> After: The woodcutter could have had a gold axe for one small lie. Justice begins
> with telling what is ours and what is not, even when no one could ever check.

## source

A short attribution per `.claude/skills/virtue-story-research/provenance.md`:
"From Aesop's Fables," "Retold from Genesis 8," "From Plutarch's Life of
Aristides." No URL. If unsure, write the most general true statement and flag it.

## imageAlt

What a sighted reader sees, for a reader who cannot: who, doing what, where, and
the one detail that matters. 40 to 200 characters. Do not start with "Image of" or
"Illustration of." No virtue words, no interpretation. It must match the
`imagePrompt` scene.

> Before: Illustration for The North Wind and the Sun
>
> After: A traveler in a long brown cloak bends into a gale on a country road,
> both fists clutching the cloak at his throat.

## imagePrompt

Not reader-facing; it generates the hero image, which must match the existing
catalog: a 19th-century academic genre oil painting, warm and lamplit, one or two
figures at the moment of choice. Fill this template:

```text
Oil painting in the manner of a 19th-century academic genre painting. Warm umber,
ochre and olive palette, visible brushwork, soft directional light from <source:
candle | window | low sun>. <Who, age, clothing true to the period> <doing the
decisive action> in <place, two or three concrete objects>. Faces readable,
three-quarter view, subject slightly off center. 3:2 landscape composition. No
text, no lettering, no frame, nothing modern.
```

Paint the decisive moment, not the ending image, so the illustration does not give
the ending away.

## audio

`"planned"` when narration should be generated (the default for new stories),
`"human"` when a person will record it, `"none"` when not, or the `https://` URL
once narration exists.
