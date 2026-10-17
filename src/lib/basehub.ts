import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import { basehub } from 'basehub'
import type { StoriesItem } from '../../basehub-types'
import '../../basehub.config' // Import the config to ensure it's loaded

/**
 * Basehub query layer. Everything here talks to the CMS; `src/lib/stories.ts`
 * adapts the results into the site's `StoryData` shape.
 *
 * Caching follows Basehub's documented setup (docs.basehub.com →
 * `nextjs-integration/environments-and-caching`) on top of Next 16's Cache
 * Components model, which is what Basehub's own Next 16 playground uses: every
 * reader below is a `'use cache'` scope with an explicit `cacheLife` and
 * `cacheTag`, and the SDK's `<Toolbar />` is mounted in the root layout inside
 * the `<Suspense>` boundary Cache Components requires for its per-request ref
 * lookup.
 *
 *   - The SDK tags every query fetch with `basehub-<hash of query + sdkBuildId>`
 *     (`cacheTagFromQuery`) and sends the same string as `x-basehub-cache-tag`.
 *     Passing `next`/`cache` to `basehub()` replaces that tag, so we never do:
 *     the docs are explicit that it opts the query out of automatic
 *     revalidation. Those fetch tags propagate into the enclosing `'use cache'`
 *     entry, so on commit Basehub's servers can still call the Toolbar's Server
 *     Action to revalidate exactly the queries that changed.
 *   - `cacheTag(BASEHUB_CONTENT_TAG)` is ours. It cannot ride on the SDK queries
 *     (a caller-supplied `next.tags` replaces the hash tag and drops the
 *     `x-basehub-cache-tag` header, verified against basehub 9.6.0), so each
 *     reader declares it and `POST /api/revalidate` expires it with the `'max'`
 *     profile: stale-while-revalidate, so a purge while Basehub is unreachable
 *     keeps serving the last good entry instead of hard-expiring pages into
 *     500s.
 *   - `cacheLife('content')` (next.config.mjs) is the safety net behind those
 *     tags: serve up to 5 minutes, revalidate in the background, keep a year,
 *     which is the window these routes had before Cache Components.
 *   - Draft Mode (preview) bypasses all of it: inside a `'use cache'` scope the
 *     work re-executes on every request and stores nothing, and the SDK queries
 *     drafts with `no-store`. Branch preview is the one casualty: the SDK reads
 *     the `bshb-preview-ref-<repoHash>` cookie with `cookies()`, which Cache
 *     Components forbids inside a `'use cache'` scope, so it falls back to the
 *     resolved ref (main). Reading that cookie outside the scope and passing it
 *     in as `ref` does work, but it turns every content page into a request-time
 *     streaming hole: measured 88 Lighthouse performance on /stories, under the
 *     90 budget, so it is not shipped. See AGENTS.md.
 *   - In `next dev` the SDK always reads drafts, so dev shows unpublished edits:
 *     verify published behaviour on a production build.
 */

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

/**
 * Stable cache tag for everything that renders Basehub content.
 *
 * The SDK tags each query with an opaque `basehub-<hash of query + build id>`,
 * and fetch tags propagate into the enclosing `'use cache'` entry, so Basehub's
 * automatic on-demand revalidation keeps working on its own. This tag is ours:
 * every cached reader below applies it with `cacheTag`, which is how
 * `POST /api/revalidate` can expire all of them at once (the SDK's hashes
 * cannot be enumerated) with the `'max'` profile, i.e. stale-while-revalidate.
 * A purge while Basehub is unreachable therefore keeps serving the last good
 * cache entry instead of hard-expiring pages into 500s.
 */
export const BASEHUB_CONTENT_TAG = 'basehub:content'

/* -------------------------------------------------------------------------------------------------
 * Schema introspection (tolerance before/after the story-schema migration)
 * -----------------------------------------------------------------------------------------------*/

type FieldKind = 'OBJECT' | 'UNION' | 'SCALAR' | string

const INTROSPECTION_QUERY = `query StoryFields {
  __type(name: "StoriesItem") { fields { name type { kind ofType { kind } } } }
}`

/**
 * Field name → GraphQL kind for `StoriesItem`, from the committed schema.
 * Cached for an hour (and expired by the revalidation webhook) so a committed
 * migration lights up the new fields without a deploy.
 */
async function getStoryFieldKinds(): Promise<Map<string, FieldKind>> {
  'use cache'
  cacheLife('hours')
  cacheTag('basehub:schema')
  if (!hasBasehubToken()) return new Map()
  try {
    const res = await fetch('https://api.basehub.com/graphql', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-basehub-token': process.env.BASEHUB_TOKEN as string,
        'x-basehub-api-version': '4',
      },
      // Cached by this `'use cache'` scope; a fetch-level `next: { revalidate }`
      // would be ignored with Cache Components, so the lifetime lives above.
      body: JSON.stringify({ query: INTROSPECTION_QUERY }),
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
}

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

// Each query is wrapped in `React.cache` only: per-request memoization so a
// page and its `generateMetadata` do not repeat the same query. It is not a
// cache layer (no cross-request storage, no tags) and does not touch the
// fetch options, so the SDK's own tags stay intact. Development therefore
// behaves exactly like production here, and draft edits always show.
//
// Every reader is a `'use cache'` scope (`cacheLife('content')`,
// `cacheTag(BASEHUB_CONTENT_TAG)`), which is Next 16's caching model: the
// prerender fills the entry and the content lands in the route's static shell,
// while Basehub's per-query fetch tags propagate into the entry for Basehub's
// own on-demand revalidation.

const PAGE_SIZE = 100

/** Every story, in dashboard order, paginating past Basehub's page size. */
export async function getAllStories(): Promise<BasehubStory[]> {
  'use cache'
  cacheLife('content')
  cacheTag(BASEHUB_CONTENT_TAG)
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
}

/** Cache tag for the search-key probe below; expired by `POST /api/revalidate`. */
export const SEARCH_KEY_CACHE_TAG = 'basehub:search-key'

/** One story, filtered by slug on the Basehub side. */
export async function getStoryBySlug(slug: string): Promise<BasehubStory | null> {
  'use cache'
  cacheLife('content')
  cacheTag(BASEHUB_CONTENT_TAG)
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
}

/**
/**
 * Public search key for the stories collection. Basehub designs `_searchKey`
 * to be shipped to the browser; it only grants search over this collection.
 * Cached with the rest of the content, so a publish that changes the key (or
 * turns indexing on) lands with the next revalidation.
 */
export async function getStoriesSearchKey(): Promise<string | null> {
  'use cache'
  cacheLife('content')
  cacheTag(BASEHUB_CONTENT_TAG)
  return queryStoriesSearchKey()
}

/** The query behind both search-key readers, uncached. */
async function queryStoriesSearchKey(): Promise<string | null> {
  if (!hasBasehubToken()) return null
  try {
    const data = await basehub().query({ stories: { _searchKey: true } })
    return data.stories._searchKey || null
  } catch (error) {
    return handleBasehubError('getStoriesSearchKey', error)
  }
}

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
export async function getVirtuesFromBasehub(): Promise<BasehubVirtue[]> {
  'use cache'
  cacheLife('content')
  cacheTag(BASEHUB_CONTENT_TAG)
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
}

/**
 * The search key, but only when Basehub Search actually answers for it. Until
 * the stories component is indexed ("Index block" in its properties panel, then
 * a commit; `migrate-story-schema.mjs --enable-search`), Basehub's search host
 * returns HTTP 500; probing here keeps browsers from making that failing
 * request. The answer is cached for an hour so a known-unindexed collection
 * costs one failing probe per hour, and `BASEHUB_SEARCH_ENABLED=false` skips
 * the probe entirely.
 *
 * This is not one of the SDK's tagged queries (the probe lives on Basehub's
 * search host, not the GraphQL API), so it keeps an explicit tag of its own and
 * `POST /api/revalidate` expires it.
 */
/** Uncached probe behind {@link getLiveStoriesSearchKey}. */
async function probeLiveSearchKey(): Promise<string | null> {
  const key = await queryStoriesSearchKey()
  if (!key) return null
  try {
    const { search } = await import('basehub/search')
    await search(key, 'virtue', { queryBy: ['_title'], perPage: 1 })
    return key
  } catch {
    return null // search not live yet: use the local index, not an outage
  }
}

/**
 * The search key, but only when Basehub Search actually answers for it, so a
 * browser never makes a request that is known to fail. Cached for an hour and
 * expired by the revalidation webhook like the rest of this module.
 */
export async function getLiveStoriesSearchKey(): Promise<string | null> {
  'use cache'
  cacheLife('hours')
  cacheTag(SEARCH_KEY_CACHE_TAG)
  if (!hasBasehubToken() || process.env.BASEHUB_SEARCH_ENABLED === 'false') return null
  return probeLiveSearchKey()
}
