import { Instrument_Serif, Inter, Literata } from 'next/font/google'

// Display face: Instrument Serif ships weight 400 only.
// Hierarchy comes from size, never from synthesized bold.
export const fontHeading = Instrument_Serif({
  variable: '--font-heading',
  subsets: ['latin'],
  weight: '400',
  display: 'swap'
})

// UI face: Inter for labels, navigation, and controls.
export const fontBody = Inter({
  variable: '--font-body',
  subsets: ['latin'],
  display: 'swap'
})

// Text face: Literata for long-form story prose. A true book serif
// with real italics and weights, designed for sustained reading.
export const fontText = Literata({
  variable: '--font-text',
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  style: ['normal', 'italic'],
  display: 'swap'
})
