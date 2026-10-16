import { Newsreader, Inter, Literata } from 'next/font/google'

// Display face: Newsreader, a variable serif with an optical-size axis. At
// headline sizes the browser selects its high-contrast display cut; at dek and
// card sizes it settles into a sturdier text cut. Hierarchy comes from size and
// optical size, not synthesized weight.
export const fontHeading = Newsreader({
  variable: '--font-heading',
  subsets: ['latin'],
  style: ['normal', 'italic'],
  axes: ['opsz'],
  display: 'swap',
})

// UI face: Inter for kickers, metadata, navigation, and controls.
export const fontBody = Inter({
  variable: '--font-body',
  subsets: ['latin'],
  display: 'swap',
})

// Text face: Literata for long-form story prose. A true book serif with a
// generous x-height, real italics, small caps, and old-style figures, designed
// for sustained reading on screens (and for reading aloud from a phone).
export const fontText = Literata({
  variable: '--font-text',
  subsets: ['latin'],
  style: ['normal', 'italic'],
  axes: ['opsz'],
  display: 'swap',
  // Not preloaded: the story hero image is the LCP element, and preloading two
  // more large variable files starves it on slow phones. The metric-matched
  // fallback keeps the swap free of layout shift.
  preload: false,
})
