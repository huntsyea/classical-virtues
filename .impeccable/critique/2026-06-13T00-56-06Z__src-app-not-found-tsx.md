---
target: 404 page (src/app/not-found.tsx)
total_score: 22
p0_count: 0
p1_count: 3
timestamp: 2026-06-13T00-56-06Z
slug: src-app-not-found-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of system status | 3 | The page clearly states the error and the server returns a true HTTP 404, but the document <title> stays at the homepage default ('Classical Virtues | Timeless Stories of Character'), so the browser tab and screen readers misreport where you are; no nav/breadcrumb situates you in the site. |
| 2 | Match between system and real world | 3 | Plain language, no jargon — but 'The page you are looking for does not exist' is cold system-voice, not the warm anthology register PRODUCT.md mandates; a book never talks to its reader like a server. |
| 3 | User control and freedom | 2 | Exactly one escape route ('Return Home'). No link to /stories — the destination 100% of lost parents actually want — no search, no navbar. Browser back is the only other exit. |
| 4 | Consistency and standards | 2 | Navbar is rendered per-page (not in layout.tsx), and not-found.tsx omits it — so the 404 is the only page with no site shell, no wordmark, no Stories/About links. Tokens and fonts are consistent; the chrome is not. |
| 5 | Error prevention | 2 | Nothing softens the dead end: no fuzzy slug matching against known story slugs, no 'did you mean', no suggested stories. A renamed story slug strands every old bookmark and shared bedtime link here permanently. |
| 6 | Recognition rather than recall | 2 | With no navbar, no wordmark, and no story links, the user must recall what site this is and where stories live; the page gives zero recognizable map of the site. |
| 7 | Flexibility and efficiency | 1 | One rigid path: home, then navigate again to Stories, then to a story — three hops for a one-handed parent. No direct stories link, no search, no suggestions. |
| 8 | Aesthetic and minimalist design | 3 | Genuinely uncluttered — one message, one action — and the Instrument Serif headline at 5xl is handsome. Loses a point because the minimalism is omission, not intent: no wordmark, no imagery, no brand gesture on a brand surface. |
| 9 | Help users recognize, diagnose, and recover from errors | 3 | Names the problem in plain words and offers a next step, but the recovery is the weakest legal version: it neither echoes what was sought nor suggests stories, so the user's intent (find a story) is discarded. |
| 10 | Help and documentation | 1 | No help affordance at all — the site's About page exists but isn't linked, there's no contact path, and no hint of what the site offers for a first-timer landing on a dead shared link. |
| **Total** | | **22/40** | |

## Anti-Patterns Verdict

**LLM assessment**: No banned patterns trip (no gradient text, glassmorphism, hero metrics, side-stripes), and the sage palette plus Instrument Serif headline keep it on-token. But the verdict is worse than "AI made this" — it's "nobody made this." The page is byte-for-byte the default scaffold 404 of every Next.js tutorial: centered flex column, title-case "Page Not Found" h1, one gray system sentence, an underlined "Return Home" link. On a brand register where the design IS the product and the voice is "a trusted family anthology," this is the dev-default tell: zero editorial care on the one page guaranteed to greet a frustrated visitor. The typography is the only fingerprint of the brand; the copy, structure, and recovery path are pure template.

**Deterministic scan (CLI)**: detect.mjs over src/app and src/components exited clean (0 findings).

**Browser overlay**: 1 finding: low-contrast (3.7:1) on the explanatory sentence (p.text-muted-foreground).

## Cognitive Load

Rating: low
- Working memory: the page provides no site context (no wordmark, no nav, no story links), so the user must remember from a previous screen what site this is and where stories live to recover their goal

## Emotional Journey

The scene: a parent taps a bookmarked or shared story link at bedtime, child on the other arm, and lands on a cold system sentence in gray on cream. There is no valley-then-recovery arc — the whole page IS the valley: no reassurance ('the stories are still here'), no warm voice, no story one tap away. The peak-end rule works against the brand here: the last impression of a broken bedtime link is bureaucratic indifference from a product whose entire promise is 'trusted family anthology.' The on-brand serif headline offers a flicker of familiarity, but the moment of highest frustration gets the least warmth on the whole site.

## What's Working

- It returns a real HTTP 404 with server-rendered HTML and zero JS dependency — error recovery works instantly even on flaky bedtime Wi-Fi, and search engines won't index ghost URLs.
- It stays on-token: cream #eff0e6 background, Instrument Serif headline at text-5xl, olive primary link — you are visibly still inside Classical Virtues' visual world, not dumped onto a hosting-provider error page.
- Genuine restraint: one message, one underlined action, no competing elements — the calm pacing matches 'earn trust through restraint' even if the warmth is missing.

## Priority Issues

- **[P1] Explanatory sentence fails WCAG AA contrast: text-muted-foreground #7b7c78 on background #eff0e6 measures 3.66:1, below the 4.5:1 minimum PRODUCT.md explicitly mandates for normal-size text (src/app/not-found.tsx line 7).**
  - Why: This is the only sentence explaining what happened, read by tired parents in dim bedrooms — exactly the low-vision, low-light scenario AA contrast exists for, and the product's own accessibility bar names 4.5:1.
  - Fix: Swap to text-secondary-foreground (#4b4d44) or darken --muted-foreground to ~#6a6b64; verify ≥4.5:1 against #eff0e6.
  - Suggested command: `/impeccable harden`
- **[P1] The only recovery path is 'Return Home' — no link to /stories, no suggested stories, no search.**
  - Why: The primary user goal is 'find a story in under a minute,' and most 404 arrivals are broken story links; sending them to the homepage adds two more one-handed navigations and discards their intent entirely.
  - Fix: Add a primary 'Browse the stories' link to /stories and, ideally, 2–3 featured story links pulled via getAllStories() — turning the dead end into a discovery moment.
  - Suggested command: `/impeccable harden`
- **[P1] No site shell: Navbar (and any footer) is omitted because it's rendered per-page rather than in layout, so the 404 shows no wordmark, no navigation, no brand identity at all.**
  - Why: A first-timer arriving from a dead shared link sees an anonymous cream page with no clue what 'Home' even refers to — the trust-building wordmark is absent at the exact moment trust is weakest.
  - Fix: Render <Navbar /> in not-found.tsx (or move it into the root layout so no route can lose it).
  - Suggested command: `/impeccable layout`
- **[P2] System-voice copy off-register: 'Page Not Found' / 'The page you are looking for does not exist.'**
  - Why: The brand voice is a warm family anthology; this reads as a server log. The 404 is a free chance to express voice ('This page seems to have wandered from the collection — the stories are all still here.') and reassure rather than dismiss.
  - Fix: Rewrite headline and body in the anthology voice with a reassuring next step; keep it to two short lines.
  - Suggested command: `/impeccable clarify`
- **[P3] not-found.tsx exports no metadata, so the tab title stays 'Classical Virtues | Timeless Stories of Character' on an error page; the 'Return Home' link is also a small ~20px-tall text target with no enlarged tap area.**
  - Why: Misleading tab title confuses screen-reader and multi-tab users; the small target is hostile to one-handed thumbs.
  - Fix: Export metadata { title: 'Page Not Found' } and give the link a py-3 px-6 block tap target (≥44px) styled as the site's standard link/button.
  - Suggested command: `/impeccable polish`

## Persona Red Flags

**Jordan (confused first-timer parent)**
- Arrives from a friend's dead story link and sees no wordmark, logo, or site name anywhere on the page — cannot confirm this is the storybook site that was recommended
- 'Return Home' is the most literal label possible yet refers to a home Jordan has never seen; no hint of what the site contains or that stories exist
- No help, about, or contact link anywhere — Jordan's instinct to look for guidance finds literally nothing

**Casey (distracted one-handed mobile parent)**
- The single 'Return Home' link sits mid-screen as a ~20px-tall underlined text string — well under the 44px tap-target minimum and outside the natural thumb zone
- Recovery requires three hops one-handed (404 → home → stories → story) when one direct 'Browse stories' link would do it in one
- Nothing on the page is reachable without precise aim; there is no large forgiving button despite 'controls must be reachable and forgiving' being design principle #2

**Sam (screen-reader/keyboard user, WCAG 2.1 AA)**
- Page content is a bare <div> — no <main> landmark, no <nav>, so landmark navigation announces nothing and Sam must arrow through the raw document
- Document title still announces 'Classical Virtues | Timeless Stories of Character', contradicting the visible 'Page Not Found' heading when the tab loads
- The explanatory paragraph at 3.66:1 contrast fails AA for Sam's low-vision counterpart; the lone link relies on default browser focus styling rather than the site's visible focus state commitment

## Minor Observations

- The h1 says 'Page Not Found' but a 404 number appears nowhere — fine for the audience, though a small printed-folio '404' could be an on-brand bookish gesture
- min-h-screen centering works, but on the 1440x3200 capture the content floats in an enormous empty field — a vertical-rhythm cap (max-h or content grouping) would feel more like a book page and less like a void
- Link uses text-primary #415417 (7.3:1, passes AA) — the one color choice on the page that clears the bar comfortably
- Tokens define --radius: 0rem and flat shadows site-wide; the 404 honors them trivially since it has no surfaces at all
- The site's ErrorBoundary wraps children in layout.tsx, so runtime errors get a separate fallback — this page only handles true 404s, which is correct separation

## Questions to Consider

- If 'the book is the interface,' what does a missing page look like in a well-bound book — a torn leaf, a misprinted folio, an errata note? Could this be the most charming page on the site instead of the least?
- Why does the page guaranteed to receive the site's most frustrated visitors carry the least editorial care of any route?
- A dead story link is a parent mid-task at bedtime — should the 404 serve three stories directly ('While you're here, the collection includes…') and convert the failure into the under-a-minute success the product promises?

## Inspection Notes

Captured desktop (1440x900), full-height (1440x3200), and mobile (390x844) headless-Chrome screenshots of the live production URL and read all three. The mobile capture shows text apparently truncated at the right edge; this is a headless-Chrome artifact (old headless enforces a ~500px minimum layout viewport without device emulation — content is centered at x≈250, i.e., center of 500), not a real overflow: the page is a centered flex column with p-8 and would wrap normally at a true 390px viewport with the declared width=device-width meta. Verified via curl: live URL returns HTTP 404, DOM contains no nav/footer elements, and <title> remains the homepage default. Contrast computed numerically: #7b7c78 on #eff0e6 = 3.66:1 (fails AA 4.5:1); #415417 on #eff0e6 = 7.30:1 (passes); #35372a on #eff0e6 = 10.56:1 (passes).
