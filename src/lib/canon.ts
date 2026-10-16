import virtuesData from '@/data/virtues.json'

/**
 * The seven classical virtues: the fixed canon (four cardinal, three
 * theological). `src/data/virtues.json` is the source of truth for slugs,
 * order, and aliases; Basehub's `virtues` collection mirrors it (seeded by
 * `scripts/seed-virtues.mjs`) and may override editorial copy.
 *
 * This module is pure (no CMS access) so the data layer, SEO helpers, and the
 * client search index can all resolve canon without import cycles.
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

export const CANON: readonly Virtue[] = (virtuesData as Virtue[])
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
 * canon until a story carries an explicit `canonicalVirtue` reference (added by
 * `scripts/basehub/migrate-story-schema.mjs`).
 *
 * Mappings are sourced from the Writing Vault canon reference (PRO-57):
 *   - kindness → charity   (compassion freely given)
 *   - mercy    → charity   (covenant love shown where judgment is expected)
 *   - honesty  → justice   (giving others the truth they are owed)
 *
 * When a new sub-virtue angle is introduced, add it here (see
 * `content/vault/new-virtue-checklist.md`) rather than leaving an orphan label.
 */
export const SUB_VIRTUE_TO_CANON_SLUG: Record<string, string> = {
  kindness: 'charity',
  mercy: 'charity',
  honesty: 'justice',
}

export function getCanonBySlug(slug: string | null | undefined): Virtue | undefined {
  if (!slug) return undefined
  const needle = slug.trim().toLowerCase()
  return CANON.find((v) => v.slug === needle)
}

/**
 * Resolve a story's free-text `virtue` to its canon virtue, or `undefined` when
 * it maps to no canon entry. Matches a canon title or familiar alternate name
 * first (e.g. Courage→Fortitude, Love→Charity), then falls back to the
 * sub-virtue bridge above.
 */
export function resolveCanonVirtue(storyVirtue: string | null | undefined): Virtue | undefined {
  const needle = storyVirtue?.trim().toLowerCase()
  if (!needle) return undefined
  const direct = CANON.find(
    (v) =>
      needle === v.slug ||
      needle === v.title.toLowerCase() ||
      needle === v.alternateName?.toLowerCase(),
  )
  if (direct) return direct
  return getCanonBySlug(SUB_VIRTUE_TO_CANON_SLUG[needle])
}

/**
 * Canon virtue-hub slug for a story's free-text virtue, or null when it maps to
 * no canon entry. Client-safe (no CMS imports), so client components should
 * import it from here rather than from `@/lib/virtues`.
 */
export function getVirtueSlugForStoryVirtue(storyVirtue: string): string | null {
  return resolveCanonVirtue(storyVirtue)?.slug ?? null
}
