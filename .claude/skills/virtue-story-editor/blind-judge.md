# Blind judging

Two blind reads guard the gate. Step 3a asks whether the draft beats the text it
retells; step 3b asks whether it repeats the house's formula. Both only work if the judge cannot tell which text is ours, and cannot
learn what the house is.

## Keep the judge blind

Claude Code loads `CLAUDE.md` and `AGENTS.md` from its working directory and its
parents, and this repository's files name the house, its virtues, and its
retellings. A judge started in the checkout is primed. So:

- Every judge runs in its own empty directory outside any project, for example
  `/tmp/cv-blind-judge/<slug>-<round>/`. `blind-packet.mjs` refuses a directory
  that sits under a `CLAUDE.md`, `AGENTS.md`, or `.git`.
- The judge directory holds only `packet.md` and `prompt.md`. The key goes to a
  separate directory the judge is never told about.
- The prompt names no repository path and none of these words: virtue, retelling,
  draft, house, anthology, Classical Virtues, exemplar, source.
- Start the judge with its environment set to that directory:

  ```bash
  bb thread spawn --project <project> --parent-self \
    --environment /tmp/cv-blind-judge/<slug>-<round> \
    --provider claude-code --prompt-file /tmp/cv-blind-judge/<slug>-<round>/prompt.md
  ```

- Contamination check: if the answer uses a word that can only come from the
  repository ("virtue," "house," "anthology," "Classical Virtues," "exemplar,"
  "draft"), or refers to any file other than `packet.md`, the round is void.
  Rerun it in a new directory. Words a reader can infer from the packet itself
  ("retelling," "King James," "scripture") are not contamination.
- Each new draft round gets new judges and new packets. Read the key only after
  the judge has answered.

## Step 3a: beat the source

```bash
node .claude/skills/virtue-story-editor/scripts/blind-packet.mjs \
  content/drafts/<slug>.md content/drafts/<slug>/source.txt \
  /tmp/cv-blind-judge/<slug>-r<N>-source /tmp/cv-blind-keys/<slug>-r<N>-source
```

The draft must win or tie on read-aloud, scene, and ending. If the governing text
wins any of the three, the verdict cannot be `publish`: name the line that won and
require it back.

When the brief names a bedtime rival (`content/drafts/<slug>/rival.txt`), because
the governing text is in a register no parent reads unaltered to a six-year-old,
run a second judge against the rival over the same span. The draft must win or tie
that comparison on the same three questions. Beating the KJV is easy; beating the
best children's telling is the test.

<!-- pair-prompt -->
```text
You are judging two versions of the same short story, Text 1 and Text 2, in the
file packet.md in your working directory. Read only that file; do not open,
search for, or look up anything else.

The use: a parent will read one of them aloud to a six-year-old at bedtime, and it
should also hold the attention of the adult reading it.

Answer each question with "Text 1," "Text 2," or "tie," then one or two sentences
quoting the lines that decided it:

1. Read-aloud: which is easier and more pleasing to read aloud, and which would a
   child follow and join in with more?
2. Scene: which puts the listener inside the moments that matter, rather than
   summarizing them?
3. The key moment: which handles the story's most important moment better?
4. Ending: which ending is more satisfying for a child, and does it land?
5. Faithfulness: does either leave out or change something the other has that
   matters to the story? Name it.
6. Overall: which would you choose to read aloud tonight, and why?

Then list the three strongest lines in the losing text that the winner should
have kept. Be blunt. Keep the whole answer under 500 words.
```

## Step 3b: house voice or formula?

A retold anthology has one house voice on purpose: shared editorial restraint,
the same way of compressing an old text, plain sentences with the source's best
phrases kept. That is not a defect. Formula is: the same quotable sentence frames,
ending gestures, pet constructions, invented refrains, or paragraph architecture
turning up story after story. Step 3b looks for formula only.

Run it when a draft is about to join the catalog: the draft plus the two house
stories it most resembles (the linter's `house-tic` warnings name them; otherwise
the two most recent drafts or published stories).

```bash
node .claude/skills/virtue-story-editor/scripts/blind-packet.mjs --style \
  /tmp/cv-blind-judge/<slug>-r<N>-style /tmp/cv-blind-keys/<slug>-r<N>-style \
  content/drafts/<slug>.md <other story> <other story>
```

Reading the answer, after the key:

- A **tic** is a concrete, repeatable construction the judge quotes from the
  draft *and* from another house story: the same sentence frame ("He waited yet
  another seven days." / "He waited yet another day."), the same ending gesture,
  the same pet phrase or inversion, a refrain the house invented, the same
  paragraph build. Anything the governing text itself supplies is not a tic (two
  KJV refrains, a source's own closing clause).
- The draft **fails 3b only if the judge cites at least two tics, each quoted
  from both texts and present in the draft.** Each such tic becomes a `must`; fix
  it, then rerun 3a, because the draft must still beat its source.
- A general verdict ("one hand, about 70 percent", "the same compression method",
  "restraint", "feeling shown through action") with fewer than two quotable tics
  is recorded in the gate note and does not block.

<!-- style-prompt -->
```text
The file packet.md in your working directory holds short stories labeled Text
<TEXTS>. Read only that file; do not open, search for, or look up anything else.

1. Authorship: were these written by one hand, by several, or is it mixed? Group
   the texts by hand and give your confidence for each grouping.
2. Repeated tics: list every concrete construction that appears in two or more
   of the texts and that a reader would notice as a formula: a repeated sentence
   frame, the same kind of ending, a pet phrase or word order, a refrain, the same
   way of building a paragraph. For each one, quote the exact words from every
   text where it appears. Do not list general qualities of style (plain, restrained,
   old-fashioned); list only what you can quote.
3. Which single sentence in each text is the most generic, the one any writer
   could have written?

Be blunt and specific. Keep the answer under 500 words.
```
