---
name: virtue-story-writer
description: Draft or revise the prose and fields of one Classical Virtues story in content/drafts, from an approved brief or from editor notes. Use for the writing step itself, not for choosing a story or publishing one.
---

# Virtue story writer

The target is a tale a parent would rather read aloud at bedtime than the old text
it comes from, and that an adult reader at The Atlantic would also finish and
remember. Bennett's anthology sensibility supplies the material (fables,
scripture, history, legend, each gathered under a virtue); narrative craft
supplies the telling.

`writing.md` is law. Where any craft habit conflicts with it, `writing.md` wins:
no em or en dashes in reader-facing copy, 350-650 words unless the brief grants an
exception, scene before lesson, virtue shown before it is named, body is
narrative only, the moral appears once in `virtueDescription`, one canonical
virtue from the seven.

## Steps

1. **Gather.** Read the brief (no brief: run `virtue-story-research` first),
   `content/story-format.md`, `writing.md`, and the brief's **governing text**
   itself, twice: once for events, once aloud in your head for its rhythm. Read
   the bedtime rival (`rival.txt`) too, if the brief names one: it is the telling
   your draft must beat for a child. Do not
   read the vault exemplars while drafting; they are period pieces with documented
   faults, used only at the editor's gate.

2. **Map the source into beats.** Numbered list, one line per beat, in source
   order. Mark each beat `source` or `added` (sensory or implied detail), and mark
   the decisive act, the turn, every attested line, every refrain or chant, and
   the source's strongest final beat. Done when every verse or sentence of the
   passage appears as kept, compressed, or cut with a reason, nothing `added`
   changes an event, words, or motive, and you can name what your telling will do
   better than the governing text and what it must keep (craft.md §11). After
   drafting, compare each `source` beat's sentence with the source's wording once
   more: a changed number, frequency, or tense ("three times a day" becoming
   "three times that day") is a fidelity error, not a style choice.

3. **Draft.** Write the decisive act first, then the opening, then connect them.
   Use the techniques in [craft.md](craft.md) that this source calls for; they are
   tools, not a checklist. Done when paragraph one names the actor in its first two
   sentences and ends on something that could go wrong, and the last paragraph is
   the source's strongest final beat with nothing after it.

4. **Read it aloud, by proxy.** For every sentence over 20 words, check that the
   verb comes within the first eight words and the stress word comes last. Check
   each pronoun's owner is in the same or previous sentence, no word is spelled
   alike but said differently (read, lead, tear, wound, bow), and no sentence opens
   with a participle. Done when each sentence passes or has a one-line reason in
   your notes.

5. **Cut.** Remove every sentence that the next sentence makes redundant, every
   evaluative adjective, and anything after the final beat. Never cut a refrain,
   chant, or attested line for length; ask for an exception instead.

6. **Write the fields** per [fields.md](fields.md) and save to
   `content/drafts/<slug>.md` in the exact format of `content/story-format.md`.

7. **Lint.**

   ```bash
   node .claude/skills/virtue-story-editor/scripts/lint-story.mjs content/drafts/<slug>.md
   ```

   Done when it reports zero errors and you have fixed each warning or can say why
   it is a false positive for this story. Treat `house-tic` warnings as real: the
   draft is repeating a shape another story already uses (craft.md §12).

8. **Hand off** to `virtue-story-editor` as a separate pass, ideally a fresh critic
   thread; a writer does not approve their own draft. Return the file path, the
   list of every change since the last round (all of them, requested or not), and
   any source or canon questions for the editor of record.

## Revising after editor notes

Apply every `must`, or, when two reviewers conflict (an editor's must against a
blind judge's finding), apply it differently and say how in the hand-off. Apply
each `should` or give one sentence for declining it. A `publish` verdict covers
only the bytes it reviewed: do not polish after it; any edit goes back to the
editor as a new round. Re-run steps 4, 5, and 7 on the whole story. If the editor's
blind comparison found the source better on a dimension, restore the source line
that won before changing anything else. Do not touch approved catalog stories or
vault exemplars.
