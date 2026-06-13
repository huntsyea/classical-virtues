---
target: stories index (src/app/stories/page.tsx)
total_score: 35
p0_count: 0
p1_count: 0
timestamp: 2026-06-13T02-36-15Z
slug: src-app-stories-page-tsx
---
## Re-critique (post-redesign)

Baseline was 25/40.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Nav now sets aria-current=page and an active underline on Stories; hover deepens border + underlines the title (real, non-transparent feedback). Still no story count or 'X stories' collection context, and no focus-visible ring token beyond UA default is defined for the row links. |
| 2 | Match Between System and Real World | 4 | n/a — every row now names its virtue (Kindness, Mercy, Honesty, Courage) in the user's mental-model language, plus read-aloud minutes and a Listen/headphones audio cue. 'The Three Men' is no longer opaque; it reads 'Courage'. |
| 3 | User Control and Freedom | 3 | Clean browse surface with navbar + back as exits; nothing traps. Still no filter/sort/search to control, but at 5 stories that's acceptable, not a defect. |
| 4 | Consistency and Standards | 4 | n/a — home is now a true cover (featured lead + compact 'More from the collection' list) and /stories is the full TOC, resolving the duplicate-page problem; Navbar moved to root layout so chrome is consistent. SummaryCard now respects --radius:0 (square corners), matching the token system. |
| 5 | Error Prevention | 4 | n/a — whole-row link targets prevent misclicks; SSG page has few error paths; the prior /-vs-/stories duplicate-destination confusion is gone now that the two pages play distinct cover/contents roles. |
| 6 | Recognition Rather Than Recall | 4 | n/a — the deciding attribute (virtue) is visible on every row, summaries are full and not clamped, and audio/length are shown, so a parent compares on-screen facts rather than holding truncated blurbs in working memory. |
| 7 | Flexibility and Efficiency of Use | 2 | Still exactly one path: read the list top-to-bottom, pick one. No virtue filter, no search, no 'tonight's story' accelerator for the repeat bedtime parent. Tolerable at 5 stories but unchanged from baseline and the weakest dimension. |
| 8 | Aesthetic and Minimalist Design | 4 | n/a — calm, unhurried, and genuinely book-like: numbered contents rhythm, serif virtue labels, full summaries, paintings as anchors. Reads as 'table of contents,' not 'content grid.' Rows are uniform but that uniformity now reads as editorial structure rather than template. |
| 9 | Help Users Recognize, Diagnose, and Recover from Errors | 4 | n/a — empty-CMS state is now handled: a bordered 'The stories are being prepared. Please come back soon.' message renders instead of the prior silent blank grid. |
| 10 | Help and Documentation | 3 | Intro line now explains the model honestly ('Every story names its virtue and how long it takes to read aloud, and a headphones mark shows where narrated audio is ready') — orienting and on-voice. Still no broader explanation of the virtues framework itself, but adequate for a browse page. |
| **Total** | | **35/40** | |

## Anti-Patterns Verdict

Substantially de-slopped. The banned identical-fixed-height card grid is gone, replaced by a numbered table-of-contents list that genuinely reads like a book's contents page: each row leads with its virtue in serif italic, states read-aloud minutes, flags narrated audio with a headphones mark, and shows the full untruncated summary (no mid-sentence ellipses). A human would now say "this was designed," not "default scaffold." Two reflex-reject default typefaces (Instrument Serif, Inter) remain, and the rows are still structurally uniform, so it stops short of distinctive — but the editorial care the brand sells is now legible in the layout, not just the paintings.

**Deterministic scan:** detect.mjs over src/app + src/components exited clean (0 findings).

## What's Working

- The TOC redesign nails the brand brief: virtue-led serif rows with read-aloud minutes, an audio mark, full untruncated summaries, and a numbered contents column make this feel like leafing through a bound anthology rather than scrolling a card grid — the single biggest lift from baseline.
- Accessibility was genuinely hardened, not papered over: muted-foreground went from 3.66:1 to a measured 5.21:1, all decorative card images are now alt="" (killing the duplicated accessible-name concatenation), card titles are real h2s (h1->h2, no skipped level), and the nav exposes aria-current=page.
- The information architecture problem was actually solved: home is now a distinct cover (large featured lead + compact 'More from the collection' list using the 'featured'/'contents' variants) while /stories is the full table of contents, and Navbar moved to the root layout so both pages share chrome and the duplicate ItemList confusion is resolved.

## Remaining Issues

- **[P2] The virtue label uses text-primary, which in the DARK theme is #5c706f on #232422 = 2.97:1 (computed) — below WCAG AA 4.5:1 for this 16px italic text. Light theme passes at 7.30:1; dark theme fails the AA commitment PRODUCT.md makes for both themes.**
  - Fix: Lighten dark-theme --primary (e.g. toward #8aa39f / ~4.6:1 on #232422) or give the virtue label a dedicated higher-contrast token in dark mode; verify numerically, don't eyeball.
- **[P3] Row links rely on the UA-default focus outline; no :focus-visible treatment is defined for the TOC rows, so keyboard wayfinding on a cream-on-cream block is faint (the --ring token #8a6a38 at 4.35:1 exists but isn't wired to these links).**
  - Fix: Add focus-visible:ring-2 ring-[--ring] ring-offset-2 (or an equivalent 2px visible outline) to the index/contents/featured row links in summaryCard.tsx.
- **[P3] No accelerator for the repeat bedtime parent (no virtue filter, search, or 'tonight's story'). Fine at 5 stories but will degrade as the collection grows; flagged as the lone weak heuristic.**
  - Fix: When the catalog exceeds ~8-10 stories, add a virtue filter chip row or group the TOC by virtue; consider a single 'A story for tonight' shortcut to honor the under-a-minute promise.
- **[P3] The numbered position column is hidden on mobile (sm:block only), so the 'table of contents' numbering — part of the book metaphor — disappears for the primary one-handed phone reader.**
  - Fix: Consider showing a lighter-weight number on mobile, or accept the tradeoff intentionally; minor.

## Verdict vs baseline

35/40, up 10 from the 25/40 baseline: all three P1s (invisible virtue, sub-AA contrast, /-vs-/stories duplication) plus the empty state and alt-text issues are genuinely fixed; the only real regression-class item left is the dark-theme virtue label failing AA at 2.97:1.
