import { getLiveStoriesSearchKey } from '@/lib/basehub'
import { getAllStories, toSearchDoc } from '@/lib/stories'

/**
 * Everything the client search box needs, fetched lazily on first focus:
 *   - `searchKey`: Basehub's public, collection-scoped `_searchKey`, so the box
 *     can query Basehub Search directly from the browser;
 *   - `docs`: a compact local index, used when Basehub Search is unavailable
 *     (no key, collection not indexed yet, or the search host is down).
 */
export const revalidate = 300

export async function GET() {
  const [searchKey, stories] = await Promise.all([getLiveStoriesSearchKey(), getAllStories()])
  // Cache-Control comes from `revalidate` (ISR), so a webhook purge is honoured.
  return Response.json({ searchKey, docs: stories.map((s) => toSearchDoc(s)) })
}
