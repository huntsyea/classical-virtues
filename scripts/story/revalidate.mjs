// story:revalidate: ladder step 10, ask the site to drop its cached content now.
//
//   pnpm story:revalidate                                                 local dev server (http://localhost:3100)
//   pnpm story:revalidate --base-url https://www.classicalvirtues.com --yes   production
//
// POSTs to <base>/api/revalidate with `Authorization: Bearer <token>`, the
// publish-pipeline path of src/lib/revalidate.ts. The token is REVALIDATE_TOKEN,
// falling back to BASEHUB_WEBHOOK_SECRET (which that handler still accepts,
// as deprecated, until REVALIDATE_TOKEN is set on the site). Each call sends a
// unique body because the handler ignores repeated identical deliveries.
//
// Targets: localhost by default. Any other host must be this site (www or
// apex) or a preview host listed in STORY_PREVIEW_HOSTS, over https, and needs
// --yes. The legacy webhook secret is never sent to a preview. Content also refreshes
// within the 5-minute ISR window without this; it is the instant path.

import { randomUUID } from 'node:crypto'
import { main, isEntry, log, UsageError } from './lib/cli.mjs'
import { siteTarget, LOCAL_URL } from './lib/draft.mjs'

export async function revalidate(base, { production = false } = {}) {
  // The legacy secret is also Basehub's webhook signing key: it only ever goes
  // to production or this repo's dev server (http://localhost:3100), never to
  // a preview deployment or another local port.
  const devServer = base === LOCAL_URL
  const token = process.env.REVALIDATE_TOKEN || (devServer || production ? process.env.BASEHUB_WEBHOOK_SECRET : null)
  if (!token) throw new UsageError(devServer || production ? 'Set REVALIDATE_TOKEN (or the legacy BASEHUB_WEBHOOK_SECRET) to call the revalidate endpoint.' : 'This target needs REVALIDATE_TOKEN; the legacy webhook secret is only sent to production and http://localhost:3100.')
  const url = `${base}/api/revalidate`
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ source: 'story-pipeline', at: new Date().toISOString(), nonce: randomUUID() }),
    redirect: 'manual',
  })
  const text = await res.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    body = { raw: text.slice(0, 200) }
  }
  if (!res.ok || !body.revalidated) throw new Error(`POST ${url} returned HTTP ${res.status}: ${JSON.stringify(body)}`)
  return body
}

async function cli({ flags }) {
  const target = siteTarget(flags)
  const { base } = target
  const body = await revalidate(base, target)
  log.ok(`Revalidated ${base} via ${body.via ?? 'token'} at ${body.at ?? 'now'}${body.tags ? `: ${[body.tags].flat().join(', ')}` : ''}`)
  log.info(`Next (ladder step 11): pnpm story:verify <slug>${flags['base-url'] ? ` --base-url ${base} --yes` : ''}`)
}

if (isEntry(import.meta.url)) main(cli, { meta: import.meta.url, args: [0, 0], flags: { 'base-url': 'string', yes: 'boolean' } })
