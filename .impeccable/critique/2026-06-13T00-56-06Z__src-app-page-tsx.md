---
target: homepage (src/app/page.tsx)
total_score: 21
p0_count: 0
p1_count: 3
timestamp: 2026-06-13T00-56-06Z
slug: src-app-page-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | No current-location cue (no nav exists on home, so no active state anywhere); card hover feedback relies on shadow tokens whose alpha is 0.00, so pointer feedback is invisible — the only signal a card is interactive is the cursor |
| 2 | Match System / Real World | 2 | The site's name and promise is virtues, but no card shows which virtue its story teaches — the domain's organizing concept is absent at the decision point; users must infer virtue from truncated teaser prose |
| 3 | User Control and Freedom | 3 | Browser back works and nothing traps, but the page offers zero on-page exits: no link to /about or /stories, no footer — the five cards are the only doors |
| 4 | Consistency and Standards | 2 | Navbar renders on inner pages but not on the homepage (inconsistent shell); --radius is 0rem yet the card image hardcodes rounded-t-[4px] and shadcn corners show ~4px rounding; shadow tokens are defined but fully transparent |
| 5 | Error Prevention | 3 | Read-only browse page, little to get wrong; the gap is the unhandled empty state — if Basehub is unavailable, getAllStories() returns [] and the page renders a heading over a silent void with no message |
| 6 | Recognition Rather Than Recall | 2 | All five stories visible at once (good), but virtue, audio availability, and reading length are hidden behind clicks — a parent must open stories one by one to discover what the card should have told them |
| 7 | Flexibility and Efficiency | 1 | One rigid path: click a card. No virtue filter, no search, no ordering choice, no indication the /stories index even exists; forgivable at 5 stories but the pattern won't scale |
| 8 | Aesthetic and Minimalist Design | 3 | Genuinely calm and uncluttered — one h1, one decision; the noise is the uniform 3+2 grid with an empty third slot and mid-word ellipsis truncation that undercuts the editorial voice |
| 9 | Error Recovery | 2 | Only a generic React ErrorBoundary; content-fetch failure degrades to a silently empty homepage with no explanation or retry path |
| 10 | Help and Documentation | 1 | An About page exists but is unreachable from the homepage (no nav, no footer); nothing explains that stories include narrated audio or who curates the collection |
| **Total** | | **21/40** | |

## Anti-Patterns Verdict

**LLM assessment**: Split verdict. The palette shows real intent — warm parchment (#eff0e6) with deep olive ink, zero-radius geometry, no gradients, no glassmorphism, no hero metrics, no side-stripes — so it dodges the SaaS-slop cluster. But the page's entire body is a textbook identical card grid: five structurally interchangeable image-top cards (same height, same clamp, same teaser grammar), which is the single most recognizable AI layout and an explicit absolute ban. The font pair (Instrument Serif + Inter) is two-for-two on the training-data reflex-reject list, and the five Midjourney-style classical paintings in one uniform style are themselves an "AI made this" tell to anyone who's seen generated art. Mid-word ellipsis truncation ("...in ancient Rom...") reads content-farm, not well-bound book. Net: a discerning visitor would guess AI involvement from the grid + illustrations + fonts, even though the color voice is genuinely chosen. The page is a tastefully-tinted card-grid blog index, not yet a book's table of contents.

**Deterministic scan (CLI)**: detect.mjs over src/app and src/components exited clean (0 findings).

**Browser overlay**: 7 findings: 6x low-contrast (#7b7c78 on #eff0e6 = 3.7:1, need 4.5:1) on the tagline and all five card summaries; 1x skipped-heading (h1 "Classical Virtues" followed by h3 card titles, missing h2).

## Cognitive Load

Rating: moderate
- Chunking: five stories presented as one undifferentiated group (>4 items per group) with no grouping by virtue, length, or theme
- Minimal choices: 5 visually identical options at the single decision point, with no metadata (virtue/audio/length) to differentiate them — the parent must read all five teasers to choose

## Emotional Journey

The first beat is good: the parchment palette and serif masthead land as calm and trustworthy — it feels like opening something cared-for, not a content site. The valley comes immediately at the decision point: five lookalike cards with teasers that cut off mid-word and no virtue labels force a parent under bedtime pressure to read all five summaries to find 'the one about honesty,' and nothing reassures her that narrated audio exists or how long a story runs — so clicking a card is a leap of faith at exactly the high-stakes moment (child waiting, one hand free). The end of the page is abrupt: after card five there is nothing — no orientation, no colophon, no 'about this collection' — so the peak-end impression is 'pleasant but thin,' with the burden of trust deferred entirely to the story page.

## What's Working

- The color system is genuinely chosen, not defaulted: parchment #eff0e6 with olive-ink #35372a (10.6:1), a deep moss primary, zero radius, no shadows, no gradients. It reads as editorial restraint with intent and is the strongest single carrier of the 'trusted family anthology' brand on the page.
- The illustration program is cohesive: all five stories share one painterly classical style, which makes a five-item library feel like a curated, commissioned anthology rather than a stock-photo blog — imagery is carrying brand weight that the layout isn't.
- Disciplined scope and speed: one h1, one decision, the entire library visible in a single glance, statically generated with proper ItemList JSON-LD and per-card responsive image sizes. A parent can survey everything in seconds with zero chrome in the way.

## Priority Issues

- **[P1] Cards omit the virtue, audio availability, and reading length — the product's organizing principle is invisible at the page's only decision point**
  - Why: PRODUCT.md defines success as 'a parent finding the right story in under a minute.' A parent looking for a courage story or a narrated story cannot tell from the homepage; StoryData already carries virtue, audioUrl, and wordCount, but summaryCard.tsx only renders image/title/summary. This is the gap between the site's promise and what it shows.
  - Fix: Add a small serif virtue label (e.g. 'Courage'), an audio glyph when audioUrl exists, and an approximate read-aloud time (from wordCount) to each card; consider ordering or sectioning the library by virtue so the page becomes a table of contents of virtues, not titles.
  - Suggested command: `/impeccable clarify`
- **[P1] The homepage renders no site navigation and no footer — Navbar exists and appears on inner pages but is never mounted on /**
  - Why: About and the /stories index are unreachable from the front door; a first-time parent deciding whether to trust this site's moral framing has no path to 'who made this.' It also makes the shell inconsistent: inner pages have a masthead, the homepage doesn't.
  - Fix: Render Navbar in the root layout (or on page.tsx) so the masthead is consistent site-wide, and add a quiet one-line footer/colophon linking About — bookish chrome, not a link farm.
  - Suggested command: `/impeccable layout`
- **[P1] muted-foreground #7b7c78 on #eff0e6 measures 3.66:1 — below the WCAG AA 4.5:1 floor the brand explicitly commits to — and it is used for the tagline (18px regular) and every card summary (~14px)**
  - Why: PRODUCT.md names 4.5:1 as the bar; low-vision users and any parent reading a phone in a dim bedroom or in sunlight get sub-threshold body text on the page's most informative copy (the summaries are the only differentiator between stories).
  - Fix: Darken --muted-foreground to roughly #63645c (~5:1) or reuse --secondary-foreground #4b4d44 (7.48:1) for card descriptions and the tagline; keep the lighter gray only for decorative non-text uses.
  - Suggested command: `/impeccable colorize`
- **[P2] Interactive feedback is literally invisible: the card's hover transitions between shadow-sm and shadow-md, but every shadow token in globals.css is hsl(0 0% 0% / 0.00), and the card link has no styled focus-visible state (the --ring #b0874e token is never used here)**
  - Why: The page's only interactive elements give no hover response and only a browser-default focus outline; a hesitant first-timer gets no confirmation cards are clickable, and keyboard users get an unbranded afterthought focus state on a brand surface.
  - Fix: Replace the dead shadow transition with an honest affordance — border-color deepening to foreground, a 2px translate-y lift, or title underline on hover — and add a :focus-visible ring using the existing --ring ochre on the card link.
  - Suggested command: `/impeccable polish`
- **[P2] The body of the page is an identical card grid (the absolute-ban pattern): five same-height image-top cards in a 3+2 grid with an empty third slot, summaries ellipsis-truncated mid-word ('...in ancient Rom...')**
  - Why: The brief says browsing should feel like 'leafing through a beautiful book'; uniform clamped cards with dangling ellipses read as a template blog index, the exact register the anti-references forbid — and with only five stories there is no excuse for truncating hand-written summaries.
  - Fix: Compose editorially: feature one lead story at larger scale (full image, full summary), set the remaining four in varied or list-like arrangements, and write summaries to length instead of clamping — let the 3+2 asymmetry become intentional rhythm rather than a leftover slot.
  - Suggested command: `/impeccable bolder`

## Persona Red Flags

**Jordan (confused first-timer parent)**
- No About link, no nav, no footer — the only orientation is the 9-word tagline, so 'who curates these morals and can I trust them?' is unanswerable from the front door
- Nothing on the page says stories have narrated audio or how long they take — the site's core read-aloud feature is invisible until after committing to a card
- Teasers cut off mid-word ('...friendship in ancient Rom...'), so she can't finish the sentence that's supposed to convince her; ambiguity right before the only action
- After the fifth card the page simply ends — no next step, no explanation of the collection, no sign there's a /stories index with more context

**Casey (distracted one-handed mobile parent)**
- To find a narrated story for bedtime she must pogo-stick: tap a card, hunt for the audio player, back out, repeat — the card gives no audio glyph or duration even though the data (audioUrl, wordCount) exists
- Card summaries are 14px text at 3.66:1 contrast — marginal in a dim bedroom or bright daylight, and the summaries are the only thing distinguishing the five stories
- Single-column feed of five full-bleed paintings loads image-first on cellular with no priority hint on the first card (LCP is an unprioritized image); slow first paint at the exact moment her patience is shortest
- Whole-card tap targets are generously forgiving (good), but there's no sticky masthead, so once she scrolls there is no one-thumb way to reorient or reach anything but cards

**Sam (screen reader / keyboard, WCAG 2.1 AA)**
- Card titles render as <div>s (shadcn CardTitle), so heading navigation finds only the single h1 — Sam cannot jump story-to-story by heading and must arrow through everything
- Each card is one <a> whose accessible name concatenates alt text + title + full summary, and the alt ('Androcles and the Lion illustration') duplicates the title — every link announcement is a verbose double-spoken paragraph
- Summary and tagline text at #7b7c78 on #eff0e6 is 3.66:1, failing the 4.5:1 AA minimum the product commits to
- Focus indication is the unstyled browser default on a block-level link; the design system's --ring token exists but no :focus-visible style is applied, and there's no skip link or <nav> landmark on the page at all

## Minor Observations

- Alt text is formulaic ('X illustration') and duplicates the adjacent title — brand.md treats alt as brand voice; describe the scene ('Androcles draws the thorn from the lion's paw') instead
- min-h-screen + justify-center vertically centers the library, so on tall viewports the content floats in dead space — a book opens at the top of the page, not the middle
- Token hygiene: globals.css declares Host Grotesk/Anonymous Pro while the app actually loads Instrument Serif + Inter via next/font; a full dark palette is defined but .dark is never applied; shadow tokens all alpha-0 — three layers of dead design-system weight
- viewport themeColor #e6e6d2 doesn't match --background #eff0e6, producing a subtly mismatched browser chrome tint on mobile
- JSON-LD ItemList URLs use https://classicalvirtues.com/... while the live site canonicalizes to www — minor entity-consistency wobble
- The 3+2 grid leaves a conspicuous empty third slot in row two at desktop; with a five-story library the layout should resolve the remainder deliberately
- Tagline 'Timeless virtues taught through tales from the past' is serviceable but generic — it restates the h1 and metadata rather than adding warmth or specificity (who it's for, the audio, the read-aloud ritual)

## Questions to Consider

- If virtue is the product's organizing principle, why is the front door organized by story title? What would this page look like as a table of contents of virtues — Courage, Honesty, Mercy — each opening to its stories?
- Narrated audio is the feature that makes this usable one-handed at bedtime, and the homepage never mentions it exists. What would the page look like if 'press play and dim the lights' were the promise above the fold?
- Would this layout survive being printed as the contents page of an actual bound anthology? If the honest answer is 'it's a card grid,' which single move — a featured lead story, virtue sections, or a list set in the serif — gets it closest to the book?

## Inspection Notes

Headless Chrome screenshots taken at 1440x900, 1440x3200 (full), and 390x844, all read visually, plus zoomed/contrast-enhanced crops of header and card edges. Important tooling artifact: desktop-mode headless Chrome enforces a ~500px minimum layout width, so the 390px captures showed fake right-edge text clipping; re-captured at 500px and confirmed content reflows correctly — there is NO real horizontal overflow on mobile (viewport meta is honored on real devices). Do not count the 390px clipping as a finding. Live HTML curl confirmed: no <nav> and no <footer> render on the homepage (Navbar component exists but is only used on inner pages), zero aria-labels, card titles render as divs (no h2/h3). Contrast computed numerically: muted-foreground #7b7c78 on #eff0e6 = 3.66:1 (fails AA 4.5:1; used for the tagline at 18px regular and every card summary at ~14px); foreground #35372a = 10.56:1 (passes); primary #415417 = 7.30:1. Token audit: every --shadow-* token in globals.css has alpha 0.00, so the card's shadow-sm → hover:shadow-md transition is between two invisible shadows — the hover state does literally nothing visible.
