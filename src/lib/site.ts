/**
 * Site identity shared by metadata, structured data, feeds, and sitemaps.
 *
 * `NEXT_PUBLIC_SITE_URL` lets preview deployments emit their own absolute URLs;
 * production falls back to the canonical domain so canonicals never point at a
 * preview host by accident.
 */
// Production 308-redirects the apex to www, so www is the canonical origin.
const DEFAULT_SITE_URL = 'https://www.classicalvirtues.com'

function resolveSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (fromEnv && /^https?:\/\//.test(fromEnv)) return fromEnv.replace(/\/+$/, '')
  return DEFAULT_SITE_URL
}

export const SITE = {
  url: resolveSiteUrl(),
  name: 'Classical Virtues',
  /** Bare host for visible credits (OG card footer). */
  host: 'classicalvirtues.com',
  /** Used as the home `<title>` and the default OG title. */
  title: 'Classical Virtues | Timeless Stories of Character',
  tagline: 'Timeless Stories of Character',
  description:
    'Read classical virtue stories gathered for families: short moral tales with plain summaries, full text, and narrated audio.',
  /** BCP 47 tag for `inLanguage` and the RSS `<language>`. */
  language: 'en-US',
  ogLocale: 'en_US',
  /** The curator named on the About page. */
  curator: { name: 'Hunter', jobTitle: 'Curator' },
  /** Publisher logo served by `src/app/logo.png/route.tsx`. */
  logo: { path: '/logo.png', width: 512, height: 512 },
} as const

/** Absolute URL for a site path (`/stories/x` → `https://…/stories/x`). */
export function absoluteUrl(path = '/'): string {
  if (/^https?:\/\//.test(path)) return path
  const normalized = path.startsWith('/') ? path : `/${path}`
  return normalized === '/' ? `${SITE.url}/` : `${SITE.url}${normalized}`
}

/** Stable JSON-LD node ids so every page's graph links to the same entities. */
export const LD_ID = {
  website: `${SITE.url}/#website`,
  organization: `${SITE.url}/#organization`,
  anthology: `${SITE.url}/#anthology`,
  curator: `${SITE.url}/about#curator`,
  virtueSet: `${SITE.url}/virtues#set`,
  virtueTerm: (slug: string) => `${SITE.url}/virtues/${slug}#term`,
} as const
