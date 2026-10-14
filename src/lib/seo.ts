import type { Metadata } from 'next'
import { isoDuration } from './audio'
import { CANON, type Virtue } from './canon'
import { SITE, LD_ID, absoluteUrl } from './site'
import { staticOgCard, type OgCardKey } from './og-cards'
import type { StoryData } from './stories'

/**
 * SEO surfaces: metadata, OpenGraph/Twitter, and schema.org JSON-LD.
 *
 * Everything here lives outside the story body, as the SEO contract
 * (`SEO.md`, `writing.md` § SEO Boundary) requires. None of these helpers
 * touch prose; they only shape the technical surfaces a crawler or a share
 * card reads.
 */

/* -------------------------------------------------------------------------------------------------
 * Resilience helpers (unchanged contract)
 * -----------------------------------------------------------------------------------------------*/

/** Brand-safe default used when a story has no usable summary at all. */
export const DEFAULT_SUMMARY =
  'A short story from the Classical Virtues anthology, teaching virtue through character and choice.'

/**
 * Collapse whitespace and trim a string into a single clean line, or '' when
 * there is nothing usable.
 */
function clean(value: string | null | undefined): string {
  return value?.replace(/\s+/g, ' ').trim() ?? ''
}

/**
 * Truncate at a word boundary and append an ellipsis. Falls back to a hard cut
 * when there is no sensible space to break on.
 */
function truncate(value: string, maxLen: number): string {
  if (value.length <= maxLen) return value
  const slice = value.slice(0, maxLen - 1)
  const lastSpace = slice.lastIndexOf(' ')
  const body = lastSpace > Math.floor(maxLen / 2) ? slice.slice(0, lastSpace) : slice
  return `${body.trimEnd()}…`
}

/**
 * Resolve the summary used for the meta description, OG/Twitter description,
 * and Article schema. Fallback chain so the field is never empty (it is a
 * single point of failure across four SEO surfaces):
 *   1. the editorial `summary`
 *   2. a trimmed excerpt of the story prose
 *   3. a brand default
 */
export function resolveSummary(
  summary: string | null | undefined,
  plainText?: string | null,
): string {
  const editorial = clean(summary)
  if (editorial) return editorial

  const excerpt = clean(plainText)
  if (excerpt) return truncate(excerpt, 155)

  return DEFAULT_SUMMARY
}

/**
 * Image alt text with a concrete, descriptive fallback when the CMS alt is
 * empty or whitespace-only. Keeps the `<img alt>` wired end-to-end.
 */
export function resolveImageAlt(
  alt: string | null | undefined,
  title: string,
): string {
  return clean(alt) || `Illustration for ${title}`
}

/**
 * Fit overlay text into the fixed 1200×630 OG canvas. Longer strings get a
 * smaller font and anything beyond `max` characters is hard-truncated, so the
 * "classicalvirtues.com" footer can never be pushed off the image.
 */
export function fitOgText(
  value: string,
  { max = 180, large = 36, medium = 30, small = 24 }: {
    max?: number
    large?: number
    medium?: number
    small?: number
  } = {},
): { text: string; fontSize: number } {
  const text = truncate(clean(value), max)
  let fontSize = large
  if (text.length > 80) fontSize = medium
  if (text.length > 140) fontSize = small
  return { text, fontSize }
}

/**
 * Fit the OG title (the prominent heading). Same idea as {@link fitOgText} but
 * with a larger type scale and a tighter character budget.
 */
export function fitOgTitle(
  value: string,
  fallback = 'Classical Virtues',
): { text: string; fontSize: number } {
  const source = clean(value) || fallback
  const text = truncate(source, 90)
  let fontSize = 64
  if (text.length > 36) fontSize = 52
  if (text.length > 60) fontSize = 44
  return { text, fontSize }
}

/** The first sentence of a passage, for meta descriptions that end cleanly. */
export function firstSentence(value: string, maxLen = 200): string {
  const text = clean(value)
  const match = text.match(/^.+?[.!?](?=\s|$)/)
  return truncate(match ? match[0] : text, maxLen)
}

/* -------------------------------------------------------------------------------------------------
 * Images
 * -----------------------------------------------------------------------------------------------*/

const BASEHUB_ASSET_HOST = 'assets.basehub.com'

/**
 * A server-side crop of a Basehub image. Basehub resizes through Cloudflare
 * Images, so `?width=&height=&fit=cover` returns an exact-size rendition. Other
 * hosts are returned untouched (no crop is promised).
 */
export function imageVariant(
  url: string,
  { width, height, format = 'jpeg', quality = 82 }: { width: number; height: number; format?: string; quality?: number },
): string {
  try {
    const u = new URL(url, SITE.url)
    if (u.hostname !== BASEHUB_ASSET_HOST) return u.toString()
    u.searchParams.set('width', String(width))
    u.searchParams.set('height', String(height))
    u.searchParams.set('fit', 'cover')
    u.searchParams.set('format', format)
    u.searchParams.set('quality', String(quality))
    return u.toString()
  } catch {
    return url
  }
}

function isBasehubAsset(url: string): boolean {
  try {
    return new URL(url, SITE.url).hostname === BASEHUB_ASSET_HOST
  } catch {
    return false
  }
}

/**
 * Props for rendering a story image at its true size with a blur placeholder.
 * Spread into `next/image` or `BaseHubImage` (`basehub/next-image`, which also
 * routes resizing through Basehub's CDN instead of the Vercel optimizer):
 *
 *   <BaseHubImage {...storyImageProps(story)} sizes="(max-width: 768px) 100vw, 768px" />
 */
export function storyImageProps(story: StoryData) {
  return {
    src: story.image,
    alt: story.imageAlt,
    width: story.imageWidth ?? 1344,
    height: story.imageHeight ?? 896,
    ...(story.imageBlurDataURL
      ? { placeholder: 'blur' as const, blurDataURL: story.imageBlurDataURL }
      : {}),
  }
}

/** Branded 1200×630 card from `/api/og`, used where there is no story art. */
export function brandedOgImage(key: OgCardKey, alt?: string) {
  const card = staticOgCard(key)
  return {
    url: `/api/og?card=${encodeURIComponent(key)}`,
    width: 1200,
    height: 630,
    alt: alt ?? (card ? (card.subtitle ? `${card.title}: ${card.subtitle}` : card.title) : SITE.name),
    type: 'image/png',
  }
}

/** The story art cropped to the 1.91:1 share-card size. */
export function storyOgImage(story: StoryData) {
  if (!isBasehubAsset(story.image)) return brandedOgImage(`story-${story.slug}`, story.imageAlt)
  return {
    url: imageVariant(story.image, { width: 1200, height: 630 }),
    width: 1200,
    height: 630,
    alt: story.imageAlt,
    type: 'image/jpeg',
  }
}

/* -------------------------------------------------------------------------------------------------
 * Metadata
 * -----------------------------------------------------------------------------------------------*/

/** Feed discovery links. Repeated per page because `alternates` does not deep-merge. */
export const FEED_ALTERNATES = {
  'application/rss+xml': [
    { url: '/feed.xml', title: `${SITE.name}: all stories` },
    { url: '/podcast.xml', title: `${SITE.name}: narrated stories` },
  ],
}

type OgImage = { url: string; width?: number; height?: number; alt?: string; type?: string }

interface PageMetadataInput {
  /** Site path, e.g. `/virtues/charity`. Becomes the canonical and `og:url`. */
  path: string
  /** Short page title; the root template appends "| Classical Virtues". */
  title?: string
  /** Use instead of `title` to bypass the template (the home page). */
  absoluteTitle?: string
  description: string
  images?: OgImage[]
  noindex?: boolean
  openGraphType?: 'website' | 'article'
}

/**
 * Complete metadata for one page. Next.js merges metadata shallowly, so each
 * page must restate `openGraph`, `twitter`, and `alternates` in full or it
 * inherits the home page's `og:url`, image, and title.
 */
export function pageMetadata({
  path,
  title,
  absoluteTitle,
  description,
  images,
  noindex,
  openGraphType = 'website',
}: PageMetadataInput): Metadata {
  // Index pages unfurl as "Stories | Classical Virtues", not a bare "Stories".
  // Story pages override this with the bare headline (publisher convention).
  const shareTitle = absoluteTitle ?? (title ? `${title} | ${SITE.name}` : SITE.title)
  const shareImages = images?.length ? images : [brandedOgImage('home')]
  return {
    title: absoluteTitle ? { absolute: absoluteTitle } : title,
    description,
    alternates: { canonical: path, types: FEED_ALTERNATES },
    openGraph: {
      type: openGraphType,
      url: path,
      siteName: SITE.name,
      locale: SITE.ogLocale,
      title: shareTitle,
      description,
      images: shareImages,
    },
    twitter: {
      card: 'summary_large_image',
      title: shareTitle,
      description,
      images: shareImages.map((i) => ({ url: i.url, alt: i.alt ?? shareTitle })),
    },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  }
}

/** Metadata for a story page: story art as the share image, article dates, narration. */
export function storyMetadata(story: StoryData): Metadata {
  const path = `/stories/${story.slug}`
  const base = pageMetadata({
    path,
    title: story.title,
    description: story.summary,
    images: [storyOgImage(story)],
    openGraphType: 'article',
  })
  const tags = [story.canonicalVirtue?.title, story.subVirtue].filter((t): t is string => Boolean(t))
  return {
    ...base,
    keywords: [...tags, 'classical virtues', 'read-aloud story'],
    twitter: { ...base.twitter, title: story.title },
    openGraph: {
      ...base.openGraph,
      title: story.title,
      type: 'article',
      publishedTime: story.publishedAt,
      modifiedTime: story.updatedAt,
      section: story.canonicalVirtue?.title,
      tags,
      ...(story.audio ? { audio: [{ url: story.audio.url, type: story.audio.mimeType }] } : {}),
    },
  }
}

/* -------------------------------------------------------------------------------------------------
 * Structured data (schema.org JSON-LD)
 *
 * Every page emits one `@graph`. Shared entities (WebSite, Organization, the
 * anthology, the virtue terms) carry stable `@id`s from `LD_ID`, so the
 * site-wide graph in the root layout and each page's graph describe one
 * connected set of entities rather than repeated islands.
 * -----------------------------------------------------------------------------------------------*/

type Node = Record<string, unknown>

export function graph(...nodes: (Node | null | undefined | false)[]): Node {
  return { '@context': 'https://schema.org', '@graph': nodes.filter(Boolean) }
}

const organizationRef = { '@id': LD_ID.organization }

const curatorNode: Node = {
  '@type': 'Person',
  '@id': LD_ID.curator,
  name: SITE.curator.name,
  jobTitle: SITE.curator.jobTitle,
  url: absoluteUrl('/about'),
  worksFor: organizationRef,
}

/** WebSite + Organization + the anthology itself. Rendered once, in the root layout. */
export function siteJsonLd(): Node {
  return graph(
    {
      '@type': 'WebSite',
      '@id': LD_ID.website,
      url: absoluteUrl('/'),
      name: SITE.name,
      description: SITE.description,
      inLanguage: SITE.language,
      publisher: organizationRef,
      // `/search?q=` is a real, server-rendered results page. Google retired the
      // sitelinks search box in Nov 2024, so this earns no rich result there;
      // it remains valid schema.org that other consumers read.
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${SITE.url}/search?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'Organization',
      '@id': LD_ID.organization,
      name: SITE.name,
      url: absoluteUrl('/'),
      description: SITE.description,
      logo: {
        '@type': 'ImageObject',
        '@id': `${SITE.url}/#logo`,
        url: absoluteUrl(SITE.logo.path),
        contentUrl: absoluteUrl(SITE.logo.path),
        width: SITE.logo.width,
        height: SITE.logo.height,
        caption: SITE.name,
      },
      image: { '@id': `${SITE.url}/#logo` },
    },
    {
      // The anthology as a work in its own right; every story `isPartOf` it.
      '@type': 'Collection',
      '@id': LD_ID.anthology,
      name: SITE.name,
      alternateName: `${SITE.name}: ${SITE.tagline}`,
      description: SITE.description,
      url: absoluteUrl('/stories'),
      inLanguage: SITE.language,
      publisher: organizationRef,
      editor: { '@id': LD_ID.curator },
      genre: ['Fable', 'Moral tale'],
      isAccessibleForFree: true,
    },
    curatorNode,
  )
}

/** The seven-virtue canon as a DefinedTermSet node. */
function virtueSetNode(withTerms: boolean): Node {
  return {
    '@type': 'DefinedTermSet',
    '@id': LD_ID.virtueSet,
    name: 'The Seven Classical Virtues',
    description: 'The four cardinal and three theological virtues that order the Classical Virtues anthology.',
    url: absoluteUrl('/virtues'),
    inLanguage: SITE.language,
    ...(withTerms ? { hasDefinedTerm: CANON.map((v) => ({ '@id': LD_ID.virtueTerm(v.slug) })) } : {}),
  }
}

function virtueTermNode(virtue: Pick<Virtue, 'slug' | 'title' | 'alternateName' | 'tagline' | 'description'>): Node {
  return {
    '@type': 'DefinedTerm',
    '@id': LD_ID.virtueTerm(virtue.slug),
    name: virtue.title,
    ...(virtue.alternateName ? { alternateName: virtue.alternateName } : {}),
    termCode: virtue.slug,
    description: virtue.tagline,
    url: absoluteUrl(`/virtues/${virtue.slug}`),
    inDefinedTermSet: { '@id': LD_ID.virtueSet },
  }
}

export function breadcrumbNode(pageUrl: string, trail: { name: string; path: string }[]): Node {
  return {
    '@type': 'BreadcrumbList',
    '@id': `${pageUrl}#breadcrumb`,
    itemListElement: trail.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  }
}

function itemListNode(id: string, name: string, stories: Pick<StoryData, 'slug' | 'title'>[]): Node {
  return {
    '@type': 'ItemList',
    '@id': id,
    name,
    numberOfItems: stories.length,
    itemListOrder: 'https://schema.org/ItemListUnordered',
    itemListElement: stories.map((story, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: absoluteUrl(`/stories/${story.slug}`),
      name: story.title,
    })),
  }
}

/** Article images in the three ratios Google asks for (16:9, 4:3, 1:1). */
function storyImageObjects(story: StoryData): Node[] {
  if (!isBasehubAsset(story.image)) {
    return [{ '@type': 'ImageObject', url: absoluteUrl(story.image), caption: story.imageAlt }]
  }
  return [
    [1200, 675],
    [1200, 900],
    [1200, 1200],
  ].map(([width, height]) => ({
    '@type': 'ImageObject',
    url: imageVariant(story.image, { width, height }),
    width,
    height,
    caption: story.imageAlt,
  }))
}

/** "From Aesop's Fables" → "Aesop's Fables": the work, not the sentence about it. */
function sourceTitle(source: string): string {
  return clean(source).replace(/^(from|retold from|based on|adapted from|after)\s+/i, '') || clean(source)
}

function genreFor(story: StoryData): string {
  const source = story.source?.toLowerCase() ?? ''
  if (source.includes('aesop') || source.includes('fable')) return 'Fable'
  if (/samuel|kings|genesis|gospel|scripture|bible/.test(source)) return 'Bible story'
  return 'Moral tale'
}

/**
 * A story page's graph.
 *
 * Typed `["Article", "ShortStory"]`: `Article` is the type Google's Article
 * rich result reads (headline, images, dates, author), while `ShortStory`
 * (a schema.org CreativeWork) says what the page actually is. Google accepts
 * multi-typed entities and validates the Article properties; ShortStory alone
 * would be valid schema.org but invisible to Google's Article features.
 */
export function storyJsonLd(story: StoryData, virtue?: Virtue | null): Node {
  const url = absoluteUrl(`/stories/${story.slug}`)
  const images = storyImageObjects(story)
  const audio = story.audio
    ? {
        '@type': 'AudioObject',
        '@id': `${url}#narration`,
        name: `${story.title} (narration)`,
        description: story.summary,
        contentUrl: story.audio.url,
        encodingFormat: story.audio.mimeType,
        inLanguage: SITE.language,
        isAccessibleForFree: true,
        ...(story.audio.durationSeconds ? { duration: isoDuration(story.audio.durationSeconds) } : {}),
        ...(story.audio.byteLength ? { contentSize: `${story.audio.byteLength}` } : {}),
      }
    : null

  const keywords = [story.canonicalVirtue?.title, story.subVirtue, 'classical virtues', 'read-aloud story'].filter(
    Boolean,
  )

  return graph(
    {
      '@type': 'WebPage',
      '@id': url,
      url,
      name: story.title,
      description: story.summary,
      inLanguage: SITE.language,
      isPartOf: { '@id': LD_ID.website },
      breadcrumb: { '@id': `${url}#breadcrumb` },
      primaryImageOfPage: images[0],
      datePublished: story.publishedAt,
      dateModified: story.updatedAt,
      mainEntity: { '@id': `${url}#story` },
    },
    {
      '@type': ['Article', 'ShortStory'],
      '@id': `${url}#story`,
      headline: truncate(story.title, 110),
      name: story.title,
      description: story.summary,
      url,
      mainEntityOfPage: { '@id': url },
      image: images,
      thumbnailUrl: images[images.length - 1]?.url,
      datePublished: story.publishedAt,
      dateModified: story.updatedAt,
      // Google: author must not be the publisher. The retelling's author is the
      // curator who edits it; the original work is credited via `isBasedOn`.
      author: {
        '@type': 'Person',
        '@id': LD_ID.curator,
        name: SITE.curator.name,
        url: absoluteUrl('/about'),
      },
      publisher: organizationRef,
      isPartOf: { '@id': LD_ID.anthology },
      ...(virtue ? { about: { '@id': LD_ID.virtueTerm(virtue.slug) } } : {}),
      articleSection: story.canonicalVirtue?.title,
      genre: genreFor(story),
      keywords: keywords.join(', '),
      wordCount: story.wordCount,
      timeRequired: `PT${story.readAloudMinutes}M`,
      inLanguage: SITE.language,
      isAccessibleForFree: true,
      audience: { '@type': 'PeopleAudience', audienceType: 'Families and educators reading aloud with children' },
      ...(story.source ? { isBasedOn: { '@type': 'CreativeWork', name: sourceTitle(story.source) } } : {}),
      ...(audio ? { audio: { '@id': `${url}#narration` } } : {}),
    },
    audio,
    virtue ? virtueTermNode(virtue) : null,
    virtue ? virtueSetNode(false) : null,
    breadcrumbNode(url, [
      { name: 'Home', path: '/' },
      { name: 'Stories', path: '/stories' },
      { name: story.title, path: `/stories/${story.slug}` },
    ]),
  )
}

/** A virtue hub: CollectionPage about one DefinedTerm, listing its stories. */
export function virtueHubJsonLd(
  virtue: Virtue & { stories: StoryData[]; updatedAt?: string | null },
): Node {
  const url = absoluteUrl(`/virtues/${virtue.slug}`)
  return graph(
    {
      '@type': 'CollectionPage',
      '@id': url,
      url,
      name: `${virtue.title}: ${virtue.tagline}`,
      description: virtue.description,
      inLanguage: SITE.language,
      isPartOf: { '@id': LD_ID.website },
      about: { '@id': LD_ID.virtueTerm(virtue.slug) },
      breadcrumb: { '@id': `${url}#breadcrumb` },
      ...(virtue.updatedAt ? { dateModified: virtue.updatedAt } : {}),
      mainEntity: { '@id': `${url}#stories` },
    },
    itemListNode(`${url}#stories`, `Stories of ${virtue.title.toLowerCase()}`, virtue.stories),
    virtueTermNode(virtue),
    virtueSetNode(false),
    breadcrumbNode(url, [
      { name: 'Home', path: '/' },
      { name: 'Virtues', path: '/virtues' },
      { name: virtue.title, path: `/virtues/${virtue.slug}` },
    ]),
  )
}

/** The virtues index: the DefinedTermSet of seven, as a CollectionPage. */
export function virtuesIndexJsonLd(virtues: Virtue[]): Node {
  const url = absoluteUrl('/virtues')
  return graph(
    {
      '@type': 'CollectionPage',
      '@id': url,
      url,
      name: 'The Virtues',
      description: 'The seven classical virtues that order the Classical Virtues anthology.',
      inLanguage: SITE.language,
      isPartOf: { '@id': LD_ID.website },
      about: { '@id': LD_ID.virtueSet },
      breadcrumb: { '@id': `${url}#breadcrumb` },
      mainEntity: { '@id': `${url}#list` },
    },
    {
      '@type': 'ItemList',
      '@id': `${url}#list`,
      name: 'The Seven Classical Virtues',
      numberOfItems: virtues.length,
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
      itemListElement: virtues.map((v, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: absoluteUrl(`/virtues/${v.slug}`),
        name: v.title,
      })),
    },
    virtueSetNode(true),
    ...virtues.map(virtueTermNode),
    breadcrumbNode(url, [
      { name: 'Home', path: '/' },
      { name: 'Virtues', path: '/virtues' },
    ]),
  )
}

/** The stories index: the anthology's table of contents. */
export function storiesIndexJsonLd(stories: StoryData[]): Node {
  const url = absoluteUrl('/stories')
  return graph(
    {
      '@type': 'CollectionPage',
      '@id': url,
      url,
      name: 'Stories',
      description: 'The full table of contents of the Classical Virtues anthology.',
      inLanguage: SITE.language,
      isPartOf: { '@id': LD_ID.website },
      about: { '@id': LD_ID.anthology },
      breadcrumb: { '@id': `${url}#breadcrumb` },
      mainEntity: { '@id': `${url}#list` },
    },
    itemListNode(`${url}#list`, 'Classical Virtue Stories', stories),
    breadcrumbNode(url, [
      { name: 'Home', path: '/' },
      { name: 'Stories', path: '/stories' },
    ]),
  )
}

/** The home page: the anthology's front door. */
export function homeJsonLd(stories: StoryData[]): Node {
  const url = absoluteUrl('/')
  return graph(
    {
      '@type': 'CollectionPage',
      '@id': url,
      url,
      name: SITE.title,
      description: SITE.description,
      inLanguage: SITE.language,
      isPartOf: { '@id': LD_ID.website },
      about: { '@id': LD_ID.anthology },
      publisher: organizationRef,
      mainEntity: { '@id': `${url}#stories` },
    },
    itemListNode(`${url}#stories`, 'From the collection', stories),
  )
}

/** The About page. */
export function aboutJsonLd(): Node {
  const url = absoluteUrl('/about')
  return graph(
    {
      '@type': 'AboutPage',
      '@id': url,
      url,
      name: 'About Classical Virtues',
      inLanguage: SITE.language,
      isPartOf: { '@id': LD_ID.website },
      about: organizationRef,
      mainEntity: { '@id': LD_ID.anthology },
      breadcrumb: { '@id': `${url}#breadcrumb` },
    },
    breadcrumbNode(url, [
      { name: 'Home', path: '/' },
      { name: 'About', path: '/about' },
    ]),
  )
}
