import 'server-only'
import { cacheLife } from 'next/cache'

/**
 * The footer's copyright year.
 *
 * Cache Components forbids reading the clock while prerendering the shell
 * (`new Date()` in a Server Component fails the build), so the year lives in
 * its own `'use cache'` scope: it is computed once, stored with the other
 * cached content, and refreshed on its own schedule below.
 */
export async function copyrightYear(): Promise<number> {
  'use cache'
  cacheLife('weeks')
  return new Date().getFullYear()
}
