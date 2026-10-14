import { cache } from 'react'
import { getVirtuesFromBasehub } from './basehub'
import { CANON, getCanonBySlug, getVirtueSlugForStoryVirtue, type Virtue } from './canon'
import { getAllStories, latestUpdate, type StoryData } from './stories'

/**
 * The seven classical virtues with their stories.
 *
 * `src/data/virtues.json` (via `./canon`) is the source of truth for the canon:
 * slugs, order, and aliases never come from the CMS, so all seven hubs render
 * regardless of Basehub availability, the same graceful-degradation principle
 * used for stories in `src/lib/stories.ts`.
 *
 * Copy (tagline, description, alternate name) also comes from the JSON, which
 * holds the approved text. Basehub's `virtues` mirror contributes only its
 * instance ids (targets for the `canonicalVirtue` reference) and edit dates.
 * Do not read copy from the mirror until it is re-synced: as of 2026-10 its
 * descriptions predate the punctuation pass and still contain em dashes.
 */
export type { Virtue }

export interface VirtueData extends Virtue {
  /** Stories whose canonical virtue resolves to this virtue. */
  stories: StoryData[]
  /** Basehub instance id, when the CMS mirror is reachable. */
  basehubId: string | null
  /** Latest edit across the virtue copy and its stories (ISO), if known. */
  updatedAt: string | null
}

/** Canon joined with its Basehub instance id and last edit date. */
const getCanonWithCmsIds = cache(async () => {
  const cms = new Map((await getVirtuesFromBasehub()).map((v) => [v._slug, v]))
  return CANON.map((virtue) => {
    const row = cms.get(virtue.slug)
    return {
      virtue: { ...virtue } satisfies Virtue,
      basehubId: row?._id ?? null,
      cmsUpdatedAt: row?._sys.lastModifiedAt ?? null,
    }
  })
})

function withStories(
  entry: Awaited<ReturnType<typeof getCanonWithCmsIds>>[number],
  stories: StoryData[],
): VirtueData {
  const own = stories.filter((s) => s.canonicalVirtue?.slug === entry.virtue.slug)
  const dates = [latestUpdate(own), entry.cmsUpdatedAt ?? undefined].filter(Boolean) as string[]
  return {
    ...entry.virtue,
    stories: own,
    basehubId: entry.basehubId,
    updatedAt: dates.sort().at(-1) ?? null,
  }
}

/** All seven virtues, in canonical order, each with its attached stories. */
export async function getAllVirtues(): Promise<VirtueData[]> {
  const [entries, stories] = await Promise.all([getCanonWithCmsIds(), getAllStories()])
  return entries.map((entry) => withStories(entry, stories))
}

/** A single virtue by slug, with its attached stories, or null if unknown. */
export async function getVirtueBySlug(slug: string): Promise<VirtueData | null> {
  if (!getCanonBySlug(slug)) return null
  const [entries, stories] = await Promise.all([getCanonWithCmsIds(), getAllStories()])
  const entry = entries.find((e) => e.virtue.slug === slug)
  return entry ? withStories(entry, stories) : null
}

/** Slugs for static generation, no CMS round-trip needed. */
export function getVirtueSlugs(): string[] {
  return CANON.map((v) => v.slug)
}

/**
 * Re-exported for existing server callers. Client components must import it
 * from `@/lib/canon`: this module pulls in the Basehub SDK.
 */
export { getVirtueSlugForStoryVirtue }
