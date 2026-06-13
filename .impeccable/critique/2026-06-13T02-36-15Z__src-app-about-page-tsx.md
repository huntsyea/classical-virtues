---
target: about page (src/app/about/page.tsx)
total_score: 31
p0_count: 0
p1_count: 0
timestamp: 2026-06-13T02-36-15Z
slug: src-app-about-page-tsx
---
## Re-critique (post-redesign)

Baseline was 25/40.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Fixed from baseline: nav now carries aria-current="page" and an active underline/font-medium state on /about, plus a working skip-to-content link. Static page with little else to convey; no in-section progress cue, hence not a 4. |
| 2 | Match Between System and Real World | 4 | n/a. Copy now speaks the parent's language directly (bedtime scene, read-aloud, free, narrated audio) in natural top-to-bottom order; the unattributed epigraph that broke the cite-your-sources convention was removed. |
| 3 | User Control and Freedom | 3 | Forward freedom restored: a styled "Begin with a story" link to /stories plus a footer with Stories/About nav means the page no longer dead-ends. Still a single linear read with no in-body anchors or links to actual stories. |
| 4 | Consistency and Standards | 4 | n/a. Faux-bold headings fixed (Instrument Serif rendered at natural 400), themeColor now matches background (#eff0e6), navbar/footer share the same shell and link patterns; cohesive and predictable. |
| 5 | Error Prevention | 3 | n/a in practice. Static page with no inputs or destructive actions; nothing to get wrong and nothing actively prevented, so it cannot earn a 4. |
| 6 | Recognition Rather Than Recall | 3 | Clean h1/h2 structure, everything visible on one scroll, and the CTA now surfaces the path to the product instead of forcing recall of the nav. Page still describes story breadth (full text, narrated audio) without surfacing a single real story to recognize. |
| 7 | Flexibility and Efficiency of Use | 2 | Still one rigid top-to-bottom path. No inline links from claims to examples, no anchors, no skim affordances (bolded phrases, pull-quote) for a distracted one-handed parent; the lone accelerator is the end CTA. |
| 8 | Aesthetic and Minimalist Design | 3 | Major lift: measure capped ~64ch (was ~105ch), natural-weight serif headings, generous CTA, footer closes the layout. Still under-ornamented for a "well-bound book" brand — no imagery, no display treatment for the opening, and body prose renders in Inter rather than the installed Literata reading face. |
| 9 | Help Users Recognize, Diagnose, and Recover from Errors | 3 | n/a. No error states possible on this static route; site-wide ErrorBoundary exists but is unexercised here, so this is unexercised-good rather than excellent. |
| 10 | Help and Documentation | 3 | Big improvement from baseline 1: the page now answers the parent's practical questions (free, full text + narrated audio, read-aloud length, no ads/signup) and a footer provides navigation. Still no curator name, no contact path, and no FAQ, so a specific question has nowhere to go. |
| **Total** | | **31/40** | |

## Anti-Patterns Verdict

No longer reads as AI slop. The redesign stripped the tells that gave the baseline away: the stacked triads, "modern seekers," civilizational-decline arc, question-scaffold padding, and the unattributed pseudo-Aristotle epigraph are gone, replaced by a concrete bedtime scene ("the lamp is on, a child is tucked under your arm") that matches the anthology voice PRODUCT.md asks for. The faux-bold Instrument Serif headings (a "no typographer looked at this" tell) are fixed to natural weight 400, the measure is capped near 64ch, and the page now ends in a real CTA and footer instead of a blank cream field. A reader would now say "someone wrote and set this," not "ChatGPT wrote an essay and nobody designed the page." The one lingering slop-adjacent note is structural, not generative: the page is still entirely text with no imagery or ornament on a "the book is the interface" brand, and the long-form prose renders in the Inter UI face rather than the Literata reading face the team just installed.

**Deterministic scan:** detect.mjs over src/app + src/components exited clean (0 findings).

## What's Working

- The copy rewrite is the standout: it opens on a concrete, warm bedtime scene and answers every practical vetting question (free, full text plus narrated audio, a few minutes per story, no ads, nothing to sign up for) in the anthology voice the brand asks for — while shedding the triads, jargon, and civilizational-decline arc that made the baseline read AI-generated.
- Typography and layout were genuinely fixed, not patched: measure dropped from ~105 to ~64 characters, Instrument Serif headings render at their real weight 400 (the faux-bold tell is gone), a dedicated Literata reading face was added to the system, and the page now closes with a styled CTA and a footer instead of a vast empty cream void.
- Accessibility and trust signals improved measurably and verifiably: skip-to-content link, aria-current="page" with a visible active nav state, themeColor matched to the background, four JSON-LD blocks, and the muted-foreground token fixed to #63645c (5.21:1 on background, up from the baseline 3.66:1 AA failure) — body 10.56:1, CTA white-on-green 8.38:1, focus ring 4.35:1 all pass.

## Remaining Issues

- **[P2] Still no human trust signal: the page is authored by an anonymous "We" with no curator name, no editorial-criteria byline, and no contact path anywhere on the page or in the footer. Parents vetting moral content for children are the highest-trust-bar audience, and there is nowhere to send a question.**
  - Fix: Add a short signed line or colophon (who curates and how stories are chosen/edited) and a contact link (email or simple form) in the footer so no question dead-ends.
- **[P2] The long-form prose renders in Inter (the UI/font-body face), not the Literata reading face the team just installed — fontText is loaded as a variable in layout but the about page paragraphs only carry leading-relaxed, so they inherit font-body. The dedicated book face is sitting unused on the exact page that most needs sustained-reading typography.**
  - Fix: Apply font-text (Literata) to the body paragraphs on this page (and other long-form prose), reserving Inter for nav/labels/controls, to deliver the "well-bound book" reading feel the brand promises.
- **[P3] The page still describes story breadth (full text, narrated audio, read-aloud length) without linking to or showing a single real story, and is entirely text with no imagery or ornament on a brand whose principle is "the book is the interface."**
  - Fix: Add one inline link to a representative story to substantiate the claim, and consider a small display/ornament treatment (drop cap, ribbon marker, or a single illustration) so the page reads as a designed preface, not a prose dump.
- **[P3] No skim affordances for the distracted one-handed parent persona: five dense paragraphs with no bolded key phrases, pull-quote, or summary, so the 10-second-between-interruptions reader cannot extract the gist quickly.**
  - Fix: Pull one strong line ("Arguments inform; stories transform") into a display pull-quote and/or lead with a one-sentence summary so the page rewards a glance.

## Verdict vs baseline

31/40 — up 6 from the 25/40 baseline, moving from \"Acceptable\" into the \"Good\" band; the dead-end CTA/footer, faux-bold headings, runaway measure, contrast failure, themeColor mismatch, and LLM-essay copy were all genuinely fixed, with no regressions, leaving only the anonymous-author trust gap and the unused Literata reading face.
