# Gate: The Bell of Atri (`the-bell-of-atri`)

- Draft: content/drafts/the-bell-of-atri.md
- Governing text: James Baldwin, Fifty Famous Stories Retold (1896), "The Bell of Atri" (Gutenberg #18442; `the-bell-of-atri/source.txt`)
- Exemplars: David and Mephibosheth, Androcles and the Lion
- Canon: Justice, angle none
- writing.md gate: opening vs exemplar pattern y; virtue shown before named y; rhythm plain y; ending trusts image or action y; body narrative only y; no dashes y; canon mapping clean y

## Round 6: publish (2026-10-13, editor thr_zcztyu6b2z; blind judge thr_pu6vt65ytt)

- Draft sha256: 80029b31e27bcd3a98a2932e29eadba0258ad1f5388db26418fdbc8183b2522a
- Lint: PASS, 0 errors, 2 warnings; 995 words. `length-exception` (350-1000) confirmed: the brief records that blind judges penalized cuts of performable lines. `virtue-attested`: all four "justice" are attested speech.
- Blind vs source (re-run in a neutral directory outside the repo, judge thr_cbtv6r2xpp, uncontaminated, draft was Text 2): read-aloud draft, scene draft (narrowly), key moment draft, ending tie, overall draft. Earlier in-repo judge thr_pu6vt65ytt (same bytes, same result) was not blind as documented: it ran where AGENTS.md loads.
- Bedtime rival: the governing text (Baldwin wrote for children).
- Style read (3b): five judges, in neutral directories, with Noah and the Dove and Daniel in the Lions' Den: this story read as a separate hand every time (65 to 85 percent). 3b passes.
- In-repo judge thr_pu6vt65ytt (superseded): Read-aloud draft, scene draft (narrowly), key moment draft, ending tie, overall draft. Source lines the judge would have kept: "What if some great wrong should be done before it came?", "many ill-doers were punished", the holiday.
- Scores: Opening 4 · Detail 5 · Turn 5 · Virtue order 5 · Breath 4 · Diction 4 · Ending 5 · Depth 5 · Fidelity 5 · Freshness 5 · Fields 4 · mean 4.64.
- Atlantic bar: all yes. Weakest sentence "The gates stood wide open..." defended: it sets up "came through the gate".
- Exemplars: vs David and Mephibosheth: better, the verdict is spoken by the judges, never narrated; worse, no pressure in P1 at twice David's length. vs Androcles and the Lion: better, the turn is an event and the ending a dinner, not "a testament"; worse, the horse first appears in P10.
- Fidelity: a light edit of Baldwin. "dumb brute," "bade," and "to death" softened; "This is the bell of justice" moved within the king's own speech.

Line edits (optional; applying any reopens the gate):

    should P18 "He has come to call for justice, for his master, as everybody knows, has treated him shamefully." -> "He has come to call for justice. His master, as everybody knows, has treated him shamefully."  (garden path aloud)
    should P13 "he wandered the dusty roads" -> "he went slowly along the dusty roads"  (three "wander"s)
    should Fields virtueDescription -> "The judges of Atri kept the rope low enough for the smallest child, and when a starving horse pulled it, they listened. Justice should not depend on having the words."  (avoids the catalog's "<Virtue> is" opener)
    should Fields summary "a man ties up a grapevine" -> "a man climbs up and ties on a grapevine"

Verdict: publish on these bytes. Every rubric threshold is met and the draft beats its governing text blind on read-aloud, scene, and the key moment, tying on the ending.

## Round 8: publish (2026-10-13, editor thr_6hpvca2xcg; dek-only round)

- Draft sha256: 43889ee67f31eef84641cb758a1b7739b5c953cbd512cad83acb5c3ce883b83e
- Scope: dek added after summary; body unchanged since Round 7 (verified by removing the single `dek:` line, which gives back Round 6's sha256 80029b31e27b… exactly; the file has one `dek:` line and it sits directly after `summary:`).
- Lint: PASS, 0 errors, 2 warnings (length-exception and virtue-attested, both ruled in Round 6); no dek rule fired; 995 words.
- Dek: "In Atri, anyone who has been wronged may ring the great bell. When the heat has emptied the square, the vine that serves as its rope begins to twitch." (150 characters). Length passes. It suits a reader already at the story: the first sentence states the rule at stake, the second gives an image (the twitching vine), and it holds back who is pulling. It doesn't use "Discover the timeless tale" or any virtue word ("wronged" is the king's own word, and "justice" is absent). The horse and the judgment are kept back, so the ending is safe. No phrase repeats the summary or "The king of Atri hung a new bell…". It does cover the same beat as the summary's "One hot afternoon", but from a different angle. No dashes. It is true to the body: P4 has the king's rule, P15 the emptied market place and the "great bell", and P16 the pull.
- Carried forward from Round 7: blind 3a and 3b results, scores (Fields 4, not moved by the dek; Round 6's virtueDescription and summary shoulds still stand), Atlantic bar.

Line edits:

    none

Verdict: publish, since the dek passes every fields.md test and the bytes are otherwise the ones Round 6 approved.

## History

- Round 7, 2026-10-13, dek-only, revise-with-notes (thr_hmzze8dxpc): the first dek used the canon virtue word "justice" and repeated the summary twice; its must text was applied.
- Critic draft, 2026-10-13: lost a disciplined (not blind) comparison to Baldwin: cut the chant and the dinner, "one leaf gone" kicker.
- Blind round 1: void, a packet normalization bug made Baldwin look misprinted (fixed in blind-packet.mjs); draft lost scene narrowly.
- Blind round 2: draft won overall; restore the friendship, "no one to pity him", the miser before the court.
- Blind round 3: lost to Baldwin on every dimension: trims had cut the performable lines (the king's address, "Ha!", "Day after day", the miser's speech). Rebuilt as a light edit of Baldwin.
- Blind round 4: won overall, lost scene narrowly ("Not a man nor child was there" had been cut).
- Editor round (thr_687d5uvqs9): revise-with-notes, mean 4.27: chant meter, P1 shape.
- Blind round 5: won read-aloud, scene, key moment; ending tie.
