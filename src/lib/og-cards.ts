import { CANON, getCanonBySlug } from './canon'
import { SITE } from './site'

/**
 * The only cards `/api/og` will draw. Text is looked up on the server from a
 * key, never taken from the query string, so the branded card cannot be made
 * to say arbitrary things (and each card is one cacheable URL).
 */
export interface OgCard {
  title: string
  subtitle?: string
}

const PAGE_CARDS = {
  home: { title: SITE.name, subtitle: SITE.tagline },
  stories: { title: 'Stories', subtitle: 'The full table of contents' },
  virtues: { title: 'The Virtues', subtitle: CANON.map((v) => v.title).join(', ') },
  about: { title: 'About Classical Virtues', subtitle: 'Why virtue, and why stories?' },
  search: { title: 'Search', subtitle: 'Find a story by title, virtue, or source' },
} satisfies Record<string, OgCard>

export type PageCardKey = keyof typeof PAGE_CARDS
/** `home`, `stories`, …, `virtue-<slug>`, or `story-<slug>` (story title lookup). */
export type OgCardKey = PageCardKey | `virtue-${string}` | `story-${string}`

/** Cards that need no CMS lookup; `story-*` keys are resolved by the route. */
export function staticOgCard(key: string): OgCard | null {
  // Own keys only: `in` would also accept `toString`, `__proto__`, …
  if (Object.hasOwn(PAGE_CARDS, key)) return PAGE_CARDS[key as PageCardKey]
  if (key.startsWith('virtue-')) {
    const virtue = getCanonBySlug(key.slice('virtue-'.length))
    return virtue ? { title: virtue.title, subtitle: virtue.tagline } : null
  }
  return null
}
