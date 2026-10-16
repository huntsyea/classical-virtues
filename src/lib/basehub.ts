import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { basehub } from 'basehub'
import type { StoriesItem } from '../../basehub-types'
import '../../basehub.config' // Import the config to ensure it's loaded

/**
 * Basehub query layer. Everything here talks to the CMS; `src/lib/stories.ts`
 * adapts the results into the site's `StoryData` shape.
 *
 * Caching (verified with `next build`, see the route table in the PR notes):
 *
 *   - Every SDK call first runs `resolveRef`, a `cache: 'no-store'` POST to
 *     basehub.com. Inside a page render that fetch marks the route dynamic, so
 *     with plain `basehub().query()` every route built as `ƒ` (no ISR at all).
 *   - So each query runs inside `unstable_cache` (tag `basehub`, 300 s). Next
 *     ignores dynamic signals inside that scope, the result is cached as one
 *     entry, and the tag is attached to every page that reads it. Routes build
 *     as ISR (`●`/`○`, revalidate 5m).
 *   - Freshness: `POST /api/revalidate` (signed Basehub webhook or pipeline
 *     token) expires the `basehub` tag and every path immediately; otherwise
 *     content refreshes within the 5 minute window.
 *   - Basehub's `<Toolbar />` is mounted in the root layout, as its docs
 *     prescribe, and it makes its own `no-store` ref lookup while the layout
 *     renders. A `no-store` fetch outside a cache scope is what marks a route
 *     dynamic, so mounting the Toolbar puts every route back on `ƒ`
 *     (server-rendered on demand). That is the price of the documented setup:
 *     the queries below stay cached under the `basehub` tag, but the pages
 *     themselves are no longer prerendered. Do not "fix" this by gating or
 *     lazy-loading the Toolbar: it is Basehub's supported preview affordance.
 *   - The Toolbar's own on-demand revalidation targets the SDK's per-query hash
 *     tags, which nothing here is cached under, so it cannot purge the entries
 *     below. `POST /api/revalidate` (the tag we do use) stays the instant-publish
 *     path.
 *   - Draft Mode (preview) bypasses `unstable_cache`, and the SDK then queries
 *     drafts with `no-store`. The Toolbar toggles that Draft Mode itself, so no
 *     route of ours is involved. In `next dev` the SDK always reads drafts and
 *     the cache is skipped entirely, so dev shows unpublished edits: verify
 *     published behaviour on a production build.
 */

/** Cache tag on every Basehub-backed entry; the revalidation webhook expires it. */
export const BASEHUB_CACHE_TAG = 'basehub'

/** Time-based safety net for Basehub content (seconds). Matches page `revalidate`. */
export const BASEHUB_REVALIDATE_SECONDS = 300

/**
 * Wrap a Basehub query: cross-request cache (`unstable_cache`) plus per-request
 * dedupe (`React.cache`). Results must be JSON-serializable. Development skips
 * the cross-request layer so draft edits show up immediately.
 */
// eslint-disable-next-line no-unused-vars -- parameter name inside a function type
function cachedQuery<Args extends unknown[], R>(name: string, fn: (...args: Args) => Promise<R>) {
  const crossRequest = unstable_cache(fn, ['basehub', name], {
    revalidate: BASEHUB_REVALIDATE_SECONDS,
    tags: [BASEHUB_CACHE_TAG],
  })
  return cache((...args: Args): Promise<R> =>
    process.env.NODE_ENV === 'development' ? fn(...args) : crossRequest(...args),
  )
}

/** True when the Basehub read token is configured. Every query is gated on it. */
export function hasBasehubToken(): boolean {
  return Boolean(process.env.BASEHUB_TOKEN)
}

/**
 * Outage policy. With no token the site renders empty states: that is the
 * documented graceful degradation, and keeps token-less builds green (queries
 * short-circuit on `hasBasehubToken()` before reaching here). With a token, a
 * failed query always throws:
 *
 *   - at runtime, so ISR keeps serving the last good render instead of caching
 *     live stories as 404s, flipping hubs to noindex, or emptying the feeds;
 *   - during `next build`, so the build fails loudly and Vercel keeps the
 *     previous healthy deployment live, rather than promoting an empty site.
 */
export function handleBasehubError(label: string, error: unknown): never {
  console.error(`[basehub] ${label} failed:`, error)
  throw error instanceof Error ? error : new Error(`${label} failed`)
}

// Use BaseHub's generated types for full type safety.
export type Story = StoriesItem

/**
 * Fields added by `scripts/basehub/migrate-story-schema.mjs`. They are absent
 * from the generated types until the migration is committed and `basehub`
 * regenerates the client, so they are typed by hand and only selected once
 * schema introspection confirms they exist.
 */
export interface StoryMigratedFields {
  canonicalVirtue?: { _id: string; _slug: string; _title: string } | null
  subVirtue?: string | null
  audio?: { url: string; duration: number; mimeType: string; fileSize: number } | null
  /** Editorial publication date (ISO). `_sys.createdAt` is only when the entry was made. */
  publishedAt?: string | null
  /** Last substantive revision (ISO), set by editors; `_sys.lastModifiedAt` moves on any edit. */
  contentUpdatedAt?: string | null
  /** Editorial standfirst for the story page and cards (80 to 160 characters). */
  dek?: string | null
}

const STORY_ITEM_FIELDS = {
  _id: true,
  _slug: true,
  _title: true,
  _sys: { createdAt: true, lastModifiedAt: true },
  virtue: true,
  summary: true,
  virtueDescription: true,
  audioUrl: true,
  source: true,
  image: {
    url: true,
    alt: true,
    width: true,
    height: true,
    aspectRatio: true,
    blurDataURL: true,
    mimeType: true,
  },
  content: {
    markdown: true,
    plainText: true,
    readingTime: true,
  },
} as const

export type BasehubStory = Pick<
  StoriesItem,
  '_id' | '_slug' | '_title' | 'virtue' | 'summary' | 'virtueDescription' | 'audioUrl' | 'source'
> & {
  _sys: Pick<StoriesItem['_sys'], 'createdAt' | 'lastModifiedAt'>
  image: Pick<
    StoriesItem['image'],
    'url' | 'alt' | 'width' | 'height' | 'aspectRatio' | 'blurDataURL' | 'mimeType'
  >
  content: Pick<NonNullable<StoriesItem['content']>, 'markdown' | 'plainText' | 'readingTime'> | null
} & StoryMigratedFields

/* -------------------------------------------------------------------------------------------------
 * Schema introspection (tolerance before/after the story-schema migration)
 * -----------------------------------------------------------------------------------------------*/

type FieldKind = 'OBJECT' | 'UNION' | 'SCALAR' | string

const INTROSPECTION_QUERY = `query StoryFields {
  __type(name: "StoriesItem") { fields { name type { kind ofType { kind } } } }
}`

/**
 * Field name → GraphQL kind for `StoriesItem`, from the committed schema.
 * Cached for an hour (and busted by the revalidation webhook) so a committed
 * migration lights up the new fields without a deploy.
 */
const getStoryFieldKinds = cache(async (): Promise<Map<string, FieldKind>> => {
  if (!hasBasehubToken()) return new Map()
  try {
    const res = await fetch('https://api.basehub.com/graphql', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-basehub-token': process.env.BASEHUB_TOKEN as string,
        'x-basehub-api-version': '4',
      },
      body: JSON.stringify({ query: INTROSPECTION_QUERY }),
      next: { revalidate: 3600, tags: ['basehub:schema'] },
    })
    const json = (await res.json()) as {
      errors?: { message: string }[]
      data?: { __type?: { fields?: { name: string; type: { kind: string; ofType?: { kind: string } | null } }[] } }
    }
    const fields = json.data?.__type?.fields
    if (!res.ok || json.errors?.length || !fields?.length) {
      throw new Error(`schema introspection HTTP ${res.status}: ${json.errors?.map((e) => e.message).join('; ') ?? 'no fields'}`)
    }
    return new Map(fields.map((f) => [f.name, f.type.ofType?.kind ?? f.type.kind]))
  } catch (error) {
    // A silent fallback would quietly drop canonicalVirtue/audio/dates for a
    // whole cache window; fail like any other Basehub query instead.
    return handleBasehubError('schema introspection', error)
  }
})

/** Selection for the migrated fields that actually exist in the schema. */
async function migratedFieldSelection(): Promise<Record<string, unknown>> {
  const kinds = await getStoryFieldKinds()
  const selection: Record<string, unknown> = {}

  const virtueFields = { _id: true, _slug: true, _title: true }
  if (kinds.has('canonicalVirtue')) {
    selection.canonicalVirtue =
      kinds.get('canonicalVirtue') === 'UNION' ? { on_VirtuesItem: virtueFields } : virtueFields
  }
  if (kinds.has('subVirtue')) selection.subVirtue = true
  if (kinds.has('publishedAt')) selection.publishedAt = true
  if (kinds.has('contentUpdatedAt')) selection.contentUpdatedAt = true
  if (kinds.has('dek')) selection.dek = true
  if (kinds.has('audio')) {
    const audioFields = { url: true, duration: true, mimeType: true, fileSize: true }
    selection.audio = kinds.get('audio') === 'UNION' ? { on_BlockAudio: audioFields } : audioFields
  }
  return selection
}

async function storySelection() {
  // The migrated keys are unknown to the generated types, so the merged object
  // is typed as the base selection; the extra keys pass straight through genql.
  return { ...STORY_ITEM_FIELDS, ...(await migratedFieldSelection()) } as typeof STORY_ITEM_FIELDS
}

/* -------------------------------------------------------------------------------------------------
 * Stories
 * -----------------------------------------------------------------------------------------------*/

const PAGE_SIZE = 100

/** Every story, in dashboard order, paginating past Basehub's page size. */
export const getAllStories = cachedQuery('getAllStories', async (): Promise<BasehubStory[]> => {
  if (!hasBasehubToken()) return []
  try {
    const items = await storySelection()
    const stories: BasehubStory[] = []
    for (let skip = 0; ; skip += PAGE_SIZE) {
      const data = await basehub().query({
        stories: {
          __args: { first: PAGE_SIZE, skip },
          _meta: { totalCount: true },
          items,
        },
      })
      stories.push(...(data.stories.items as BasehubStory[]))
      if (stories.length >= data.stories._meta.totalCount || data.stories.items.length < PAGE_SIZE) break
    }
    return stories
  } catch (error) {
    return handleBasehubError('getAllStories', error)
  }
})

/** One story, filtered by slug on the Basehub side. */
export const getStoryBySlug = cachedQuery('getStoryBySlug', async (slug: string): Promise<BasehubStory | null> => {
  if (!hasBasehubToken()) return null
  try {
    const data = await basehub().query({
      stories: {
        __args: { first: 1, filter: { _slug: { eq: slug } } },
        item: await storySelection(),
      },
    })
    return (data.stories.item as BasehubStory | null) ?? null
  } catch (error) {
    return handleBasehubError(`getStoryBySlug(${slug})`, error)
  }
})

/**
 * Public search key for the stories collection. Basehub designs `_searchKey`
 * to be shipped to the browser; it only grants search over this collection.
 */
export const getStoriesSearchKey = cachedQuery('getStoriesSearchKey', async (): Promise<string | null> => {
  if (!hasBasehubToken()) return null
  try {
    const data = await basehub().query({ stories: { _searchKey: true } })
    return data.stories._searchKey || null
  } catch (error) {
    return handleBasehubError('getStoriesSearchKey', error)
  }
})

/* -------------------------------------------------------------------------------------------------
 * Virtues
 * -----------------------------------------------------------------------------------------------*/

export interface BasehubVirtue {
  _id: string
  _slug: string
  _title: string
  _sys: { lastModifiedAt: string }
  alternateName: string | null
  tagline: string | null
  order: number | null
  description: { plainText: string } | null
}

/** The CMS mirror of the seven-virtue canon (ids for references, edit dates). */
export const getVirtuesFromBasehub = cachedQuery('getVirtuesFromBasehub', async (): Promise<BasehubVirtue[]> => {
  if (!hasBasehubToken()) return []
  try {
    const data = await basehub().query({
      virtues: {
        __args: { first: 20 },
        items: {
          _id: true,
          _slug: true,
          _title: true,
          _sys: { lastModifiedAt: true },
          alternateName: true,
          tagline: true,
          order: true,
          description: { plainText: true },
        },
      },
    })
    return data.virtues.items as BasehubVirtue[]
  } catch (error) {
    return handleBasehubError('getVirtuesFromBasehub', error)
  }
})

/**
 * The search key, but only when Basehub Search actually answers for it. Until
 * the stories component is indexed ("Index block" in its properties panel, then
 * a commit; `migrate-story-schema.mjs --enable-search`), Basehub's search host
 * returns HTTP 500; probing here keeps browsers from making that failing
 * request. The answer is cached for an hour so a known-unindexed collection
 * costs one failing probe per hour, and `BASEHUB_SEARCH_ENABLED=false` skips
 * the probe entirely.
 */
const probeLiveSearchKey = unstable_cache(
  async (): Promise<string | null> => {
    const key = await getStoriesSearchKey()
    if (!key) return null
    try {
      const { search } = await import('basehub/search')
      await search(key, 'virtue', { queryBy: ['_title'], perPage: 1 })
      return key
    } catch {
      return null // search not live yet: use the local index, not an outage
    }
  },
  ['basehub', 'liveStoriesSearchKey'],
  { revalidate: 3600, tags: [BASEHUB_CACHE_TAG] },
)

export const getLiveStoriesSearchKey = cache(async (): Promise<string | null> => {
  if (!hasBasehubToken() || process.env.BASEHUB_SEARCH_ENABLED === 'false') return null
  return probeLiveSearchKey()
})
