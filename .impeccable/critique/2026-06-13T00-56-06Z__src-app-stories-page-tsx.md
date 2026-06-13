---
target: stories index (src/app/stories/page.tsx)
total_score: 25
p0_count: 0
p1_count: 3
timestamp: 2026-06-13T00-56-06Z
slug: src-app-stories-page-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | No current-page indicator on the 'Stories' nav link (no aria-current, no active style); card hover feedback is literally invisible because every --shadow-* token in globals.css is hsl(0 0% 0% / 0.00), so 'hover:shadow-md transition-shadow' in summaryCard.tsx renders nothing; no story count or collection context. |
| 2 | Match Between System and Real World | 2 | The audience's mental model is virtues ('I need a story about honesty tonight'), but the page speaks only in story titles. The intro promises 'each highlighting a unique virtue' yet no card names its virtue — StoryData.virtue exists in the data model and is simply not rendered. 'The Three Men' is opaque without its virtue label. |
| 3 | User Control and Freedom | 3 | Simple browse surface; navbar and browser back provide exits. Nothing traps the user, but there's also nothing to control — no filters to clear because none exist. |
| 4 | Consistency and Standards | 2 | The homepage renders the exact same 5-card grid (src/app/page.tsx) but WITHOUT the navbar (Navbar lives only in stories/layout.tsx), so the two near-duplicate pages have different chrome. Card component hardcodes rounded-[4px] while the token system declares --radius: 0rem — the design system says square, the card disagrees. |
| 5 | Error Prevention | 3 | Whole-card link targets prevent misclicks; static SSG page has few error paths. Main gap: nothing prevents the confusing /-vs-/stories duplicate-destination situation. |
| 6 | Recognition Rather Than Recall | 3 | All options visible, no hidden menus. But choosing requires reading and holding five truncated summaries in memory because the differentiating attribute (virtue) is absent and summaries cut off mid-clause via line-clamp-3. |
| 7 | Flexibility and Efficiency of Use | 2 | No virtue filter, no search, no sort, no 'surprise me'. Tolerable at 5 stories but there is exactly one path: read everything, pick one. No accelerator of any kind for the repeat-visit bedtime parent. |
| 8 | Aesthetic and Minimalist Design | 3 | Genuinely calm and uncluttered, and the artwork carries it. But uniform fixed-height cards with ellipsis-truncated text read as template-minimal rather than book-minimal; the brand brief asks for 'leafing through a beautiful book' and this is a content grid. |
| 9 | Help Users Recognize, Diagnose, and Recover from Errors | 2 | If Basehub is unavailable, getAllStories() returns [] and the page renders heading + intro + an empty grid with no message at all — a silent failure with zero guidance (stories/page.tsx has no empty state). |
| 10 | Help and Documentation | 3 | The intro sentence provides minimal context and About exists in the nav; adequate for a browse page, but nothing explains what the virtues framework is or that stories include narrated audio. |
| **Total** | | **25/40** | |

## Anti-Patterns Verdict

**LLM assessment**: Not flagrant slop, but the layout layer would get side-eyed. The painterly classical artwork saves it — that imagery is distinctive and on-brand. Everything around the images, though, is default-template grammar: a uniform fixed-height (h-80) shadcn card grid where all five cards are structurally identical (the banned identical-card-grid pattern), line-clamp ellipses chopping summaries mid-sentence ("compassion, courage, and..."), and a generic intro line ("Discover our collection of timeless stories...") that is SEO-first copy the brand register explicitly bans. Both typefaces (Instrument Serif, Inter) sit on the reflex-reject training-data-default list — identity-preservation applies since they're shipped, but they compound the template feel. Verdict: a human would say "nice paintings, default scaffold" — the page communicates editorial care through its art and fails to through its design.

**Deterministic scan (CLI)**: detect.mjs over src/app and src/components exited clean (0 findings).

**Browser overlay**: 7 findings: 6x low-contrast (3.7:1) on the intro paragraph and all five card summaries; 1x skipped-heading (h1 "Stories" -> h3 card titles).

## Cognitive Load

Rating: moderate
- Chunking: five stories presented as one undifferentiated grid with no grouping by virtue — exceeds the ≤4-per-group guideline with no organizing categories
- Minimal choices: 5 near-identical options at the sole decision point, differentiated only by artwork and truncated prose — no metadata (virtue, length, audio) to decide on
- Working memory: to pick the right story a parent must read all five clamped summaries and hold them in memory while comparing, because the deciding attribute (which virtue) is never displayed — on mobile this comparison spans ~5 screen-heights of scrolling

## Emotional Journey

First beat is genuinely pleasant: the cream background and classical paintings land the 'family anthology' promise instantly. The valley comes at the decision point — a one-handed parent with a waiting child must scroll five full-bleed cards and parse truncated blurbs to guess which one teaches tonight's virtue, with no audio cue to reassure them the read-aloud option exists; this is exactly where the under-a-minute promise breaks. The end beat (tapping a card) is flat: no pressed/hover feedback (shadow tokens are transparent), so the tap feels unacknowledged until navigation completes. Peak = the artwork; end = neutral-to-anxious, when it should be confident ('this is the honesty one, and it can read itself aloud').

## What's Working

- The commissioned-feeling classical painting style on every card is distinctive, warm, and consistent — it does the brand's heavy lifting and is the single thing keeping this page out of template territory.
- Whole-card link targets (measured 358x320px on a 390px viewport) are extremely forgiving for the one-handed parent — no hunting for a tiny 'Read more' link.
- Solid invisible craft: SSG with ItemList JSON-LD, real canonical, next/image with proper sizes attributes, and code-level graceful degradation when the CMS token is missing — the engineering hygiene outpaces the design.

## Priority Issues

- **[P1] Virtue is invisible on the virtue index. No card shows which virtue its story teaches, even though StoryData.virtue is already in the data model and the intro explicitly promises 'each highlighting a unique virtue'.**
  - Why: The entire product is organized around virtues, and the primary user is a parent who thinks 'I need a courage story' — this page makes that query impossible without opening every story. It directly breaks the stated success metric (right story in under a minute).
  - Fix: Render story.virtue as a small label on SummaryCard (it's one prop away), and consider grouping or filtering the index by virtue as the collection grows.
  - Suggested command: `/impeccable clarify`
- **[P1] Muted-foreground #7b7c78 on background #eff0e6 measures 3.66:1 — below WCAG AA 4.5:1 — and it's used for the intro paragraph and every card summary at 14px.**
  - Why: PRODUCT.md commits to WCAG 2.1 AA explicitly, and the failing text is the only text that helps a parent choose a story; tired-eyed bedtime reading on a dim phone makes 3.66:1 worse in practice.
  - Fix: Darken --muted-foreground to roughly #63645f or darker (≥4.5:1 on #eff0e6) in globals.css; audit the dark-theme pair (#abada2 on #232422 ≈ borderline) at the same time.
  - Suggested command: `/impeccable colorize`
- **[P1] / and /stories are the same page. The homepage renders the identical 5-card grid and identical ItemList JSON-LD, but without the navbar (Navbar lives only in stories/layout.tsx), so the site's front door has no navigation at all and the 'Stories' nav link leads to a duplicate of where the user just was.**
  - Why: Two near-duplicate top-level pages confuse the IA, split SEO signals (duplicate ItemList schema on two URLs), and make first-time visitors wonder if the link did anything. This page currently adds nothing but an h1 and the navbar.
  - Fix: Either make / a true cover (featured story, virtues overview, invitation into the anthology) with /stories as the full table of contents — or redirect one to the other. Move Navbar into the root layout regardless.
  - Suggested command: `/impeccable layout`
- **[P2] All interaction affordances are broken or default: hover:shadow-md does nothing because every shadow token is 0-alpha, card focus is the UA default outline on a 320px block against cream, and the nav has no active state.**
  - Why: For Sam (keyboard) the focus ring is the only wayfinding and it's faint UA-default; for everyone else, cards give zero acknowledgment of hover or press, which reads as unresponsive — the opposite of 'forgiving' controls the principles demand.
  - Fix: Design real hover/focus-visible states (border-color deepen, title underline, slight image scale) on SummaryCard, add a 2px visible focus ring token, and aria-current=page styling in Navbar.
  - Suggested command: `/impeccable polish`
- **[P2] Uniform fixed-height cards (h-80) clamp every summary mid-sentence with ellipses; titles clamp to 2 lines at 24px leading-none; the grid is five interchangeable rectangles.**
  - Why: Identical card grids are a banned slop pattern, and chopped sentences ('compassion, courage, and...') read as careless on a brand whose whole pitch is editorial care; a 'well-bound book' has rhythm, not crop marks.
  - Fix: Drop the fixed height, write one-line virtue-led summaries at full length (no clamp), and vary the card rhythm — e.g., a featured lead story at larger scale followed by the rest, like a book's table of contents.
  - Suggested command: `/impeccable bolder`

## Persona Red Flags

**Jordan (confused first-timer parent)**
- Intro says 'each highlighting a unique virtue' but no virtue is ever named — Jordan's literal reading fails immediately and she can't tell what 'The Three Men' teaches without clicking
- No indication anywhere that stories have narrated audio — the product's signature feature is undiscoverable from the index
- Summaries truncate mid-sentence ('...and unexpected friendship in ancient Rome. Learn...') giving ambiguous, marketing-flavored half-information at the decision point
- Clicking 'Stories' in the nav from the homepage lands on what looks like the same page she just left — no confirmation anything happened

**Casey (distracted one-handed mobile parent)**
- Nav links measure 53x20 and 45x20px — half the 44pt minimum — and sit in the top-right corner, the least thumb-reachable zone on the screen
- Comparing the five options requires scrolling ~5 screen-heights of full-bleed cards while holding each truncated blurb in memory; no compact list or virtue labels to scan
- Tapping a card produces zero visual acknowledgment (transparent shadow tokens, no active state), so on a slow connection Casey taps again
- Five large painting images load on a single index page — heavy for 3G bedtime browsing, with no blur placeholders to hold the layout

**Sam (screen-reader / keyboard user, WCAG 2.1 AA)**
- Body-size muted text fails AA at 3.66:1 (#7b7c78 on #eff0e6) — the intro and all five card summaries
- Heading structure jumps H1 ('Stories') straight to H3 (card titles), breaking heading navigation
- Card focus indicator is the unstyled UA-default outline around a 320px-tall cream-on-cream block — easy to lose; no :focus-visible treatment exists anywhere on the page
- Each card link's accessible name is the full concatenation of alt text + title + summary ('Androcles and the Lion illustration Androcles and the Lion Discover the timeless tale...') — the image alt duplicates the adjacent title and should be empty/decorative inside the link
- No skip link and no aria-current on navigation, so orientation depends entirely on the page title

## Minor Observations

- Empty-CMS state renders heading + intro + nothing — add a graceful 'stories are on their way' message in stories/page.tsx (harden)
- Card component hardcodes rounded-[4px] while the token system sets --radius: 0rem — pick one; the square-corner book aesthetic was apparently the intent
- Alt text pattern '[Title] illustration' is generic; brand guidance treats alt as voice ('Androcles draws the thorn from the lion's paw' beats 'illustration') — though inside the card link the right answer is alt=""
- viewport themeColor #e6e6d2 doesn't match the actual background #eff0e6 — browser chrome tint is subtly off
- ItemList JSON-LD is emitted identically on both / and /stories — consolidate to the canonical list page
- Both shipped fonts (Instrument Serif, Inter) are reflex-reject training-data defaults; fine to keep as established identity, but worth knowing when the brand evolves
- CardTitle uses leading-none at 24px with line-clamp-2 — two-line serif titles will have colliding ascenders/descenders
- Intro copy 'Discover our collection of timeless stories' is the modal content-site sentence; the anthology voice deserves a real line

## Questions to Consider

- If every story exists to teach a virtue, why is 'virtue' never a word a visitor can click? Should virtues — not stories — be the top-level browse axis, with stories nested beneath them?
- Which page is the book's cover and which is its table of contents? Right now / and /stories are the same page with different chrome, and neither plays either role.
- Would a bedtime parent rather scan five options or be handed one? What would a 'Tonight's story' recommendation do to the under-a-minute promise — and to return visits?

## Inspection Notes

Took headless-Chrome screenshots at 1440x900, 1440x3200, and 390x844. The raw 390px shots showed right-edge text clipping, but this turned out to be Chrome's new-headless minimum-window-width artifact, NOT a site bug — verified with puppeteer-core viewport emulation (deviceScaleFactor 2, isMobile): document.scrollWidth === clientWidth === 390, no horizontal overflow. Also measured live: nav link tap targets are 53x20 and 45x20 px; card link is 358x320 px on mobile; card focus relies on UA default outline (outline: auto); all shadow tokens compute to 0-alpha so hover:shadow-md produces zero visual change; heading outline is H1 then five H3s (H2 skipped); alts are "[Title] illustration". Contrast computed numerically: muted-foreground #7b7c78 on background #eff0e6 = 3.66:1 (fails AA 4.5:1; used for the intro paragraph and all 14px card summaries). Foreground #35372a = 10.56:1 (passes). Confirmed in source that the homepage (src/app/page.tsx) renders the identical 5-card grid and identical ItemList JSON-LD, and that the root layout has no Navbar — only stories/layout.tsx adds it.
