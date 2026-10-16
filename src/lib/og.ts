/**
 * Shared pieces for generated images (`/api/og`, `/podcast-artwork.png`).
 *
 * Satori (behind `next/og`) can only draw fonts it is handed as bytes, so the
 * display face is fetched from Google Fonts, subset to exactly the glyphs on
 * the card. If the font host is unreachable the card still renders in the
 * built-in sans rather than failing.
 */
export const OG_COLORS = {
  paper: '#f9f7f1',
  ink: '#1f1d18',
  muted: '#6a6558',
  olive: '#4b5e1f',
  rule: '#d9d4c5',
} as const

type FontStyle = 'normal' | 'italic'

export async function loadGoogleFont(
  family: string,
  text: string,
  { weight = 400, style = 'normal' }: { weight?: number; style?: FontStyle } = {},
): Promise<ArrayBuffer | null> {
  const axis = style === 'italic' ? `ital,wght@1,${weight}` : `wght@${weight}`
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:${axis}&text=${encodeURIComponent(text)}`
  try {
    // No browser UA, so Google serves TrueType, which Satori can parse.
    const css = await (await fetch(url, { cache: 'force-cache' })).text()
    const src = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1]
    if (!src) return null
    const res = await fetch(src, { cache: 'force-cache' })
    return res.ok ? await res.arrayBuffer() : null
  } catch {
    return null
  }
}

/** Font entries for `ImageResponse`, skipping any face that failed to load. */
export async function ogFonts(text: string) {
  const [regular, italic] = await Promise.all([
    loadGoogleFont('Newsreader', text, { weight: 500 }),
    loadGoogleFont('Newsreader', text, { weight: 400, style: 'italic' }),
  ])
  return [
    regular && { name: 'Newsreader', data: regular, weight: 500 as const, style: 'normal' as const },
    italic && { name: 'Newsreader', data: italic, weight: 400 as const, style: 'italic' as const },
  ].filter((f): f is NonNullable<typeof f> => Boolean(f))
}
