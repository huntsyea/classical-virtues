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
 * Caching follows Basehub's documented setup (docs.basehub.com →
 * `nextjs-integration/environments-and-caching`): plain `basehub().query()`
 * with no `cache`/`next` overrides, plus the SDK's own `<Toolbar />` in the
 * root layout. Nothing here wraps the queries in a cache of ours.
 *
 * How the documented caching actually works (verified against the installed
 * SDK, `node_modules/basehub/dist/chunk-4VKF2UXK.js`, and against this repo's
 * `next build` route tables):
 *
 *   - The SDK tags every query fetch with `basehub-<hash of query + sdkBuildId>`
 *     (`cacheTagFromQuery`) and sends the same string as `x-basehub-cache-tag`.
 *     Passing `next`/`cache` to `basehub()` replaces that tag, which is why the
 *     docs say not to: it opts the query out of automatic revalidation.
 *   - Next stores those fetches in the Data Cache during build-time
 *     prerendering ("implicit build-time cache"), and the collected tags are
 *     attached to the rendered route entry as well. So a committed change makes
 *     Basehub's servers call the Toolbar's Server Action, which runs
 *     `revalidateTag('basehub-<hash>')` for exactly those tags, and the cached
 *     pages are marked stale.
 *   - `POST /api/revalidate` cannot use those tags: they are opaque
 *     per-query hashes. So reading content also declares `basehub:content`
 *     (`declareContentTag` below), and the webhook expires that tag with the
 *     `'max'` (stale-while-revalidate) profile, which keeps a purge during an
 *     outage from hard-expiring pages into 500s; see `src/lib/revalidate.ts`.
 *   - The SDK resolves a ref before every call with `resolveRef`, a
 *     `cache: 'no-store'` POST to `basehub.com/api/git/resolve-ref`. A
 *     `no-store` fetch marks its route dynamic, so the Toolbar (which renders
 *     in the root layout, and therefore in every route) would otherwise leave
 *     whichever routes happen to run it first in each build worker as `ƒ`,
 *     varying from build to build. The Basehub-backed routes therefore declare
 *     `export const dynamic = 'force-static'` in their page files, which is the
 *     documented Next.js way to say "prerender this route": Next then ignores
 *     that dynamic signal. Do not replace this with a cache wrapper; the
 *     queries below are only cached by the SDK's own tags. The price is that
 *     `cookies()` is empty on those routes, so the Toolbar's branch preview
 *     (which the SDK reads from the `bshb-preview-ref-<repoHash>` cookie) reads
 *     the resolved ref, i.e. main, instead of the selected branch. Draft Mode
 *     itself, and draft preview of main, still work. See AGENTS.md.
 *   - Draft Mode (preview) bypasses all of it: the SDK then queries drafts with
 *     `no-store`, the route is rendered per request, and nothing is cached. The
 *     Toolbar toggles Draft Mode itself, so no route of ours is involved. In
 *     `next dev` the SDK always reads drafts, so dev shows unpublished edits:
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
 * Stable cache tag for every route that renders Basehub content.
 *
 * The SDK tags each query with an opaque `basehub-<hash of query + build id>`,
 * and a caller-supplied `next` *replaces* that tag (and the sent
 * `x-basehub-cache-tag` header) rather than merging with it, which is exactly
 * the opt-out the caching docs warn about. So a stable tag cannot ride on the
 * content queries without giving up Basehub's automatic on-demand
 * revalidation. Instead, reading content declares this tag with the one cheap,
 * cached probe below: Next collects the tags of every fetch made while a route
 * renders (or a route handler runs) onto that route's cache entry.
 *
 * `POST /api/revalidate` expires it with the `'max'` profile
 * (stale-while-revalidate), so a purge while Basehub is unreachable keeps
 * serving the last good render instead of hard-expiring pages into 500s.
 */
export const BASEHUB_CONTENT_TAG = 'basehub:content'

/**
 * Declare {@link BASEHUB_CONTENT_TAG} for whatever route is rendering.
 *
 * Not a content read: the tag is the entire point, and the answer is cached for
 * an hour, so this costs one request per cache window rather than one per
 * render. The `next` option here opts *this* query out of Basehub's automatic
 * revalidation, which does not matter: it is not a content query, and the
 * queries that do read content still carry the SDK's own tags.
 */
const declareContentTag = cache(async (): Promise<void> => {
  if (!hasBasehubToken()) return
  try {
    await basehub({ next: { revalidate: 3600, tags: [BASEHUB_CONTENT_TAG] } }).query({ __typename: true })
  } catch (error) {
    return handleBasehubError('content tag probe', error)
  }
})

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

// Each query is wrapped in `React.cache` only: per-request memoization so a
// page and its `generateMetadata` do not repeat the same query. It is not a
// cache layer (no cross-request storage, no tags) and does not touch the
// fetch options, so the SDK's own tags stay intact. Development therefore
// behaves exactly like production here, and draft edits always show.
//
// Every reader declares the content tag first, so that a purge can expire the
// route that rendered it; see `declareContentTag`.

const PAGE_SIZE = 100

/** Every story, in dashboard order, paginating past Basehub's page size. */
export const getAllStories = cache(async (): Promise<BasehubStory[]> => {
  if (!hasBasehubToken()) return []
  await declareContentTag()
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

/** Cache tag for the search-key probe below; expired by `POST /api/revalidate`. */
export const SEARCH_KEY_CACHE_TAG = 'basehub:search-key'

/** One story, filtered by slug on the Basehub side. */
export const getStoryBySlug = cache(async (slug: string): Promise<BasehubStory | null> => {
  if (!hasBasehubToken()) return null
  await declareContentTag()
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
export const getStoriesSearchKey = cache(async (): Promise<string | null> => {
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
export const getVirtuesFromBasehub = cache(async (): Promise<BasehubVirtue[]> => {
  if (!hasBasehubToken()) return []
  await declareContentTag()
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
 *
 * This is not one of the SDK's tagged queries (the probe lives on Basehub's
 * search host, not the GraphQL API), so it keeps an explicit tag of its own and
 * `POST /api/revalidate` expires it. `src/lib/audio.ts` caches its blob probe
 * the same way.
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
  { revalidate: 3600, tags: [SEARCH_KEY_CACHE_TAG] },
)

export const getLiveStoriesSearchKey = cache(async (): Promise<string | null> => {
  if (!hasBasehubToken() || process.env.BASEHUB_SEARCH_ENABLED === 'false') return null
  return probeLiveSearchKey()
})
