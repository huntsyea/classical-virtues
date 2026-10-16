# Gate note template

`content/drafts/<slug>.gate.md`, one page at most (about 600 words). Each round
rewrites the file: the current round in full, every earlier round as one line in
History. Line edits carry the weight; scores are one line.

```markdown
# Gate: <Title> (`<slug>`)

- Draft: content/drafts/<slug>.md
- Governing text: <edition and passage>
- Exemplars: <exemplar one>, <exemplar two>
- Canon: <virtue>, angle <angle or none>
- writing.md gate: opening vs exemplar pattern <y/n>; virtue shown before named <y/n>; rhythm plain <y/n>; ending trusts image or action <y/n>; body narrative only <y/n>; no dashes <y/n>; canon mapping clean <y/n>

## Round <N>: <publish | revise-with-notes | kill> (<date>, <editor or thread>)

- Draft sha256: <64 hex characters from `sha256sum content/drafts/<slug>.md`, taken after the last edit this round reviewed>
- Lint: <PASS/FAIL>, <n> errors, <n> warnings (<ruling on each warning>); <words> words.
- Blind vs source: judge <thread>, neutral dir, draft was Text <1|2>. Read-aloud <draft|source|tie>, scene <...>, key moment <...>, ending <...>, overall <...>. <One line: the line that won, if any.>
- Blind vs bedtime rival: <same format, or "none named in the brief">
- Style read (3b): judge <thread>, with <two stories>. Hands: <grouping, confidence> (recorded, not blocking). Quotable shared tics in this draft: <each tic with the quotes from both texts, or none>. <pass: fewer than two | fail: two or more, each a must>
- Scores: Opening <n> · Detail <n> · Turn <n> · Virtue order <n> · Breath <n> · Diction <n> · Ending <n> · Depth <n> · Fidelity <n> · Freshness <n> · Fields <n> · mean <n>.
- Atlantic bar: <yes/no per question, evidence only for a no>.
- Exemplars: vs <one>: <better where, worse where>. vs <two>: <...>.

Line edits:

    must   P<n> "<quote>" -> "<replacement>"  (<reason>)
    should P<n> "<quote>" -> "<replacement>"  (<reason>)

Verdict: <two sentences at most>.

## History

- Round 1, <date>, <verdict>, mean <n>: <the one reason>.
```

The pipeline (`pnpm story:check`) parses this note: the header's `- Draft:` line
must name this slug's draft, the last `## Round N:` heading carries the current
verdict, that round's `Draft sha256:` must match the draft's current bytes, an
`Exemplars:` line must name two locked exemplars by title, and a `publish` round
needs `- Sign-off: <name>, <YYYY-MM-DD>`, which the editor of record adds after
reading the round. An agent never writes that line; its `publish` is a
recommendation until they do. Keep History lines as
plain bullets; a `## Round` heading there would become the "latest" round. Any
edit to the draft after a round, even one word, reopens the gate: the editor
reviews the new bytes in a new round.
