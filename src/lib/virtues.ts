import virtuesData from '@/data/virtues.json'
import { getAllStories, type StoryData } from './stories'

/**
 * The seven classical virtues — the fixed canon (four cardinal, three
 * theological). The descriptions are warm, family-anthology copy.
 *
 * This is the source of truth for the canon and is mirrored into Basehub by
 * `scripts/seed-virtues.mjs`. Because the canon never changes, it lives in the
 * repo so the site renders all seven regardless of CMS availability — the same
 * graceful-degradation principle used for stories in `src/lib/stories.ts`.
 */
export interface Virtue {
  slug: string
  title: string
  /** A familiar alternate name, e.g. Courage for Fortitude, Love for Charity. */
  alternateName?: string
  order: number
  tagline: string
  description: string
}

export interface VirtueData extends Virtue {
  /** Stories from Basehub whose `virtue` matches this virtue's name. */
  stories: StoryData[]
}

const VIRTUES: Virtue[] = (virtuesData as Virtue[])
  .slice()
  .sort((a, b) => a.order - b.order)

/** True when a story's free-text virtue matches this virtue's name or alias. */
function storyMatchesVirtue(virtue: Virtue, storyVirtue: string): boolean {
  const needle = storyVirtue.trim().toLowerCase()
  return (
    needle === virtue.title.toLowerCase() ||
    needle === virtue.alternateName?.toLowerCase()
  )
}

/** All seven virtues, in canonical order, each with its attached stories. */
export async function getAllVirtues(): Promise<VirtueData[]> {
  const stories = await getAllStories()
  return VIRTUES.map((virtue) => ({
    ...virtue,
    stories: stories.filter((s) => storyMatchesVirtue(virtue, s.virtue)),
  }))
}

/** A single virtue by slug, with its attached stories, or null if unknown. */
export async function getVirtueBySlug(slug: string): Promise<VirtueData | null> {
  const virtue = VIRTUES.find((v) => v.slug === slug)
  if (!virtue) return null

  const stories = await getAllStories()
  return {
    ...virtue,
    stories: stories.filter((s) => storyMatchesVirtue(virtue, s.virtue)),
  }
}

/** Slugs for static generation, no CMS round-trip needed. */
export function getVirtueSlugs(): string[] {
  return VIRTUES.map((v) => v.slug)
}

/**
 * Resolve a story's free-text virtue to its canonical virtue-hub slug, or null
 * when it maps to no canon entry. Lets a story link back up to its virtue page
 * using the same name/alias matching the virtue pages use to gather stories.
 */
export function getVirtueSlugForStoryVirtue(storyVirtue: string): string | null {
  return VIRTUES.find((v) => storyMatchesVirtue(v, storyVirtue))?.slug ?? null
}
