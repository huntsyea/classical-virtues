---
target: 404 page (src/app/not-found.tsx)
total_score: 34
p0_count: 0
p1_count: 0
timestamp: 2026-06-13T02-36-15Z
slug: src-app-not-found-tsx
---
## Re-critique (post-redesign)

Baseline was 22/40.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of system status | 4 | n/a — true HTTP 404 from server, metadata now sets tab title to 'Page Not Found' and robots noindex, and the Navbar/breadcrumb-less but wordmarked shell situates the user. The visible h1 and the document title now agree. |
| 2 | Match between system and real world | 4 | n/a — copy is fully in the warm anthology register ('This page has wandered off', 'the stories are all still here'). No system-voice, no jargon, no 404 number-speak. |
| 3 | User control and freedom | 4 | Three escape routes now: primary 'Browse the stories' button straight to /stories (the destination lost parents actually want), a 'Return home' link, and the restored Navbar (Stories/About) plus footer links. No search, but for this site that is a minor omission, not a freedom failure. |
| 4 | Consistency and standards | 4 | n/a — Navbar and Footer are now rendered in root layout.tsx, so the 404 carries the identical site shell, wordmark, fonts, flat radius, and olive primary as every other route. The chrome is finally consistent. |
| 5 | Error prevention | 2 | Still no softening of the dead end at the data layer: no fuzzy slug matching against known story slugs, no 'did you mean', no recovery for a renamed-slug bookmark. A shared bedtime link to a retired slug still lands here with no path back to that specific story. |
| 6 | Recognition rather than recall | 4 | n/a — the wordmark, Stories/About nav, and footer give a clear site map. A first-timer from a dead shared link can now recognize what site this is and where stories live without recalling a prior screen. |
| 7 | Flexibility and efficiency | 3 | The one-hop direct 'Browse the stories' path fixes the baseline's three-hop problem. Loses a point because the recovery is still generic — no 2–3 featured/suggested story links to turn the dead end into the under-a-minute discovery the product promises, and no search. |
| 8 | Aesthetic and minimalist design | 3 | Genuinely calm and on-token, with a handsome Instrument Serif headline and a forgiving primary button. Loses a point because on desktop (1440) the content floats high in an enormous empty field with no vertical-rhythm cap or bookish gesture — minimalism by centering rather than by composed intent. |
| 9 | Help users recognize, diagnose, and recover from errors | 3 | Names the problem warmly and offers a strong primary recovery (Browse the stories). Still short of 4 because it neither echoes what was sought nor suggests specific stories — the user's concrete intent (a particular tale) is discarded; recovery is category-level, not personalized. |
| 10 | Help and documentation | 3 | About is now reachable via the restored Navbar and footer, and the footer tagline ('Timeless stories, told for reading aloud') orients a first-timer. But there is still no contact path and no help-specific affordance on the page itself; guidance is inherited from the shell, not offered at the point of failure. |
| **Total** | | **34/40** | |

## Anti-Patterns Verdict

No longer "nobody made this." The baseline was the byte-for-byte Next.js default scaffold; this rebuild shows real editorial hands. The headline "This page has wandered off" speaks in the anthology voice, the body reassures ("the stories are all still here"), and the page now sits inside the full site shell with wordmark, Stories/About nav, and footer — so a lost parent immediately recognizes the storybook they were sent to. It would not read as AI slop or dev-default; it reads as a brand that cared about its dead-end page. It stops short of charming (no bookish folio gesture, no torn-leaf metaphor, no suggested stories), so it is competent-on-brand rather than delightful.

**Deterministic scan:** detect.mjs over src/app + src/components exited clean (0 findings).

## What's Working

- The full site shell is restored in root layout — wordmark, Stories/About nav, and footer all present — so the 404 no longer dumps a lost parent onto an anonymous cream void; trust-building identity is there at the exact moment trust was weakest.
- Copy is now squarely in the family-anthology voice: 'This page has wandered off' plus the reassuring 'the stories are all still here' replaces the cold server sentence, and a forgiving full-width primary button ('Browse the stories') routes one-handed parents straight to /stories in a single hop.
- Accessibility regressions are fixed and verified: the explanatory paragraph now uses --muted-foreground #63645c at 5.21:1 (was 3.66:1, failing), the button is white-on-olive at 8.38:1, metadata sets a correct 'Page Not Found' tab title with robots noindex, and the button carries a visible focus-visible outline.

## Remaining Issues

- **[P2] Recovery is category-level only — no 2–3 featured or suggested story links, so a parent who lost a specific bedtime tale is handed the whole catalog rather than a near-match, and the failure is not converted into the under-a-minute discovery the product promises.**
  - Fix: Pull 2–3 stories via getAllStories() and render them as a small 'While you're here, the collection includes…' list below the button (graceful-empty when Basehub is unavailable).
- **[P3] No error prevention for renamed/retired slugs — an old bookmark or shared link to a changed slug lands here permanently with no path to the intended story.**
  - Fix: Add lightweight fuzzy matching of the requested slug against known story slugs and surface a 'Did you mean …?' link when a close match exists.
- **[P3] On desktop the content floats high with a large empty field below and no bookish gesture on a brand surface where 'the book is the interface'.**
  - Fix: Add a subtle composed element — a printed-folio '404', a thin rule, or vertically center the block with a max content height — so the page reads like a misprinted leaf rather than an empty canvas.

## Verdict vs baseline

34/40, up from 22/40: all three P1s (missing shell, dead-end recovery, failing contrast) and the P2 voice and P3 metadata/tap-target are resolved — only generic (not personalized) recovery, slug error-prevention, and desktop emptiness keep it out of the high 30s.
