import virtuesData from '@/data/virtues.json'
import { getAllStories, type StoryData } from './stories'

/**
 * The seven classical virtues: the fixed canon (four cardinal, three
 * theological). The descriptions are warm, family-anthology copy.
 *
 * This is the source of truth for the canon and is mirrored into Basehub by
 * `scripts/seed-virtues.mjs`. Because the canon never changes, it lives in the
 * repo so the site renders all seven regardless of CMS availability. The same
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

/**
 * Sub-virtue angle → canon virtue slug.
 *
 * `PRODUCT.md` and `writing.md` allow sub-virtues (kindness, mercy, honesty, …)
 * as story *angles*, but every published story must still map back to one of the
 * seven canon virtues so no story is orphaned and no virtue hub renders empty.
 * The CMS `virtue` field stays free-text. It carries the angle shown in the
 * story eyebrow, and this table is the authoritative bridge from that angle to
 * canon. It is the engineering counterpart to a `canonicalVirtue` field: the
 * canon never changes, so (like the seven virtues themselves) it lives in-repo
 * rather than in the CMS.
 *
 * Mappings are sourced from the Writing Vault canon reference (PRO-57):
 *   - kindness → charity   (compassion freely given)
 *   - mercy    → charity   (covenant love shown where judgment is expected)
 *   - honesty  → justice   (giving others the truth they are owed)
 *
 * When a new sub-virtue angle is introduced, add it here (see
 * `content/vault/new-virtue-checklist.md`) rather than leaving an orphan label.
 */
const SUB_VIRTUE_TO_CANON_SLUG: Record<string, string> = {
  kindness: 'charity',
  mercy: 'charity',
  honesty: 'justice',
}

/**
 * Resolve a story's free-text `virtue` to its canon virtue, or `undefined` when
 * it maps to no canon entry. Matches a canon title or familiar alternate name
 * first (e.g. Courage→Fortitude, Love→Charity), then falls back to the
 * sub-virtue bridge above.
 */
function resolveCanonVirtue(storyVirtue: string): Virtue | undefined {
  const needle = storyVirtue.trim().toLowerCase()
  const direct = VIRTUES.find(
    (v) =>
      needle === v.title.toLowerCase() ||
      needle === v.alternateName?.toLowerCase(),
  )
  if (direct) return direct

  const canonSlug = SUB_VIRTUE_TO_CANON_SLUG[needle]
  return canonSlug ? VIRTUES.find((v) => v.slug === canonSlug) : undefined
}

/** True when a story's free-text virtue resolves to this canon virtue. */
function storyMatchesVirtue(virtue: Virtue, storyVirtue: string): boolean {
  return resolveCanonVirtue(storyVirtue)?.slug === virtue.slug
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
 * using the same resolution the virtue pages use to gather stories.
 */
export function getVirtueSlugForStoryVirtue(storyVirtue: string): string | null {
  return resolveCanonVirtue(storyVirtue)?.slug ?? null
}
