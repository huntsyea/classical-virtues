// story:publish: ladder step 9, stage the story in Basehub (production-recipe step 5).
//
//   pnpm story:publish <slug>                   dry run: the plan and the exact mutation
//   pnpm story:publish <slug> --assets --yes    upload narration (Vercel Blob) and the
//                                               illustration (Basehub assets); nothing
//                                               on the site changes
//   pnpm story:publish <slug>                   dry run again: now every URL is real
//   pnpm story:publish <slug> --yes             stage this story in Basehub's working tree
//   --update-existing   required when the slug is already a story in Basehub
//                       (the plan shows a full before/after diff first)
//
// This command never makes anything live. It stages one story's changes; a
// person (the editor of record, production-recipe step 5) then reviews the
// Basehub dashboard's Changes tab and commits there. The script prints the
// dashboard link and what to check. There is no commit code in the pipeline.
//
// Every run, including the dry run, re-runs story:check (lint, contract,
// editor gate note, SEO QA note) and re-measures the illustration and MP3 from
// the files, or the hosted narration from its URL (lib/artifacts.mjs).
// state.json is a cache: asset URLs recorded in it are only used after
// fetching them from an allowed host (this project's Blob store,
// assets.basehub.com) and matching their sha256 to the approved bytes. Writes
// also need an operator approval record matching the draft, both notes and
// both files; every hash is checked again immediately before each upload and
// before the transaction.
//
// Fields: the seven StoriesItem fields that exist today, plus canonicalVirtue
// (reference to the VirtuesItem), subVirtue, audio (media, same file as
// audioUrl; left out when there is no narration), publishedAt (on create; the
// staging date, which the committer corrects in the dashboard if they commit
// on a later day), contentUpdatedAt and dek (the draft's optional standfirst,
// empty meaning "use the summary"), whenever the draft-tree schema has
// them (scripts/basehub/migrate-story-schema.mjs). Every live field must be
// set, or the payload is invalid.
//
// Needs BASEHUB_ADMIN_TOKEN (write scope) and BLOB_READ_WRITE_TOKEN for writes;
// a read token is enough for the dry run.

import { readFileSync } from 'node:fs'
import { main, isEntry, log, c, UsageError, GateError, requireEnv } from './lib/cli.mjs'
import { readState, writeStage, sha256 } from './lib/draft.mjs'
import { resolveCanon } from './lib/canon.mjs'
import { requireCheck } from './check.mjs'
import { imageArtifact, audioArtifact, approvalProblems } from './lib/artifacts.mjs'
import {
  resolveStoryTarget, liveStoryFields, virtueIds, storyOperation, storyValues, validateOperation,
  uploadAsset, transact, gql, fieldDiff, verifyAsset,
} from './lib/basehub-publish.mjs'
import { blobPathname, blobPublicUrl, uploadNarration } from '../audio/upload.mjs'

/** Current gates and artifacts, computed from the files. */
async function assess(slug) {
  const check = await requireCheck(slug)
  const { draft } = check
  const image = await imageArtifact(draft)
  const audio = await audioArtifact(draft)
  const approval = approvalProblems(draft, check, image, audio)
  return { check, draft, image, audio, approval, problems: [...image.problems, ...audio.problems, ...approval.problems] }
}

/** URLs for the payload: real once uploaded (recorded against the same bytes), else pending. */
function resolveUrls(image, audio, slug) {
  const assets = readState(slug).stages.publish?.assets ?? {}
  let audioUrl
  let audioPending = null
  if (audio.expectation === 'none') audioUrl = ''
  else if (audio.expectation === 'url') audioUrl = audio.url
  else if (audio.sha256 && assets.audio?.sha256 === audio.sha256) audioUrl = assets.audio.url
  else if (audio.file && audio.sha256) {
    const pathname = blobPathname(slug, readFileSync(audio.file))
    audioPending = { pathname, url: blobPublicUrl(pathname) }
    audioUrl = `<pending upload: ${audioPending.url ?? pathname}>`
  } else audioUrl = '<narration not mastered>'
  const imageFileName = image.sha256 ? `${slug}-${image.sha256.slice(0, 8)}.jpg` : `${slug}.jpg`
  let imageUrl
  let imagePending = null
  if (image.sha256 && assets.image?.sha256 === image.sha256) imageUrl = assets.image.url
  else if (image.sha256) {
    imagePending = { fileName: imageFileName }
    imageUrl = `<pending upload: Basehub asset ${imageFileName}>`
  } else imageUrl = '<illustration not made>'
  return { audioUrl, audioPending, imageUrl, imagePending, imageFileName }
}

/** GraphQL selection for one story, including the migrated fields the schema has. */
function storySelection(liveFields) {
  const pick = (name, typeName, inner) =>
    !liveFields[name] ? '' : liveFields[name].kind === 'UNION' ? `${name} { ... on ${typeName} { ${inner} } }` : `${name} { ${inner} }`
  return [
    '_id _slug _title _dashboardUrl virtue summary virtueDescription source audioUrl image { url alt } content { markdown }',
    pick('canonicalVirtue', 'VirtuesItem', '_id'),
    liveFields.subVirtue ? 'subVirtue' : '',
    pick('audio', 'BlockAudio', 'url'),
    liveFields.publishedAt ? 'publishedAt' : '',
    liveFields.contentUpdatedAt ? 'contentUpdatedAt' : '',
    liveFields.dek ? 'dek' : '',
  ].join(' ')
}

async function readStory(token, liveFields, match) {
  const data = await gql(`query { stories { items { ${storySelection(liveFields)} } } }`, { token, draft: true })
  return data.stories.items.find(match) ?? null
}

/** Byte checks for every asset URL the payload will carry. */
function assetChecks(p) {
  const list = []
  if (p.audio.sha256 && /^https:/.test(p.urls.audioUrl)) list.push(['narration', p.urls.audioUrl, p.audio.sha256])
  if (p.image.sha256 && /^https:/.test(p.urls.imageUrl)) list.push(['illustration', p.urls.imageUrl, p.image.sha256])
  return list
}

async function plan(slug, flags, token) {
  const a = await assess(slug)
  const target = await resolveStoryTarget(slug, token)
  const liveFields = await liveStoryFields(token)
  const urls = resolveUrls(a.image, a.audio, slug)
  const ctx = {
    imageUrl: urls.imageUrl,
    imageFileName: urls.imageFileName,
    audioUrl: urls.audioUrl,
    liveFields,
    virtueIds: liveFields.canonicalVirtue ? await virtueIds(token) : {},
    canonSlug: resolveCanon(a.draft.fields.virtue)?.slug,
    today: new Date().toISOString(),
  }
  const op = storyOperation(a.draft, target, ctx)
  const payloadProblems = await validateOperation(op, liveFields)
  // Recorded asset URLs are claims; fetch them and compare with the approved bytes.
  for (const [name, url, expected] of assetChecks({ ...a, urls })) {
    const v = await verifyAsset(url, expected, sha256)
    if (!v.ok) payloadProblems.push(`${name} asset ${url}: ${v.reason}`)
  }
  let diff = null
  if (target.existing) {
    const item = await readStory(token, liveFields, (i) => i._id === target.existing._id)
    diff = fieldDiff(item, storyValues(a.draft, { ...ctx, isCreate: false }), a.draft.fields.title)
  }
  const updateBlocked = target.existing && !flags['update-existing']
  return { ...a, target, liveFields, ctx, urls, op, payloadProblems, diff, updateBlocked }
}

/** Line diff by longest common subsequence: shows edits, reorders and duplicates. */
export function lineDiff(from, to) {
  const a = from.split('\n')
  const b = to.split('\n')
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0))
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
  }
  const out = []
  let i = 0
  let j = 0
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      out.push(['=', a[i]])
      i++
      j++
    } else if (j < b.length && (i === a.length || dp[i][j + 1] >= dp[i + 1][j])) out.push(['+', b[j++]])
    else out.push(['-', a[i++]])
  }
  return out
}

function printDiff({ field, from, to }) {
  console.log(c.yellow(`            ${field}:`))
  for (const [op, line] of lineDiff(from, to)) {
    if (op === '=') continue
    console.log(op === '-' ? c.red(`              - ${line}`) : c.green(`              + ${line}`))
  }
}

function printPlan(p, mode) {
  const { draft, check, image, audio, target, urls } = p
  console.log(c.bold(`\n${mode}: "${draft.fields.title}" (${draft.slug})`))
  console.log(`  check     ${c.green('pass')} (draft ${draft.hash.slice(0, 12)}, editor round ${check.gate.round} ${check.gate.verdict}, SEO ${check.seo.verdict})`)
  console.log(`  files     image ${image.sha256?.slice(0, 12) ?? 'missing'} · narration ${audio.sha256?.slice(0, 12) ?? audio.expectation}${audio.transcript ? ` · transcript ${audio.transcript.status}` : ''}`)
  console.log(`  people    editor round reviewed by ${check.gate.reviewer ?? '(not named)'}, signed off by ${check.gate.signOff?.name}; SEO run by ${check.seo.runBy}, signed off by ${check.seo.signOff?.name}`)
  for (const w of audio.warnings ?? []) console.log(c.red(`            ${w}`))
  const gate = p.problems.length ? c.red('CLOSED') : c.green('open')
  console.log(`  approval  ${gate}${p.approval.approval?.by ? ` (by ${p.approval.approval.by})` : ''}`)
  for (const x of p.problems) console.log(c.red(`            ${x}`))
  if (target.existing) {
    console.log(`  target    ${c.yellow(`UPDATE live story ${target.existing._id} ("${target.existing._title}")`)}${p.updateBlocked ? c.red('  needs --update-existing') : ''}`)
    for (const d of p.diff ?? []) printDiff(d)
  } else {
    console.log(`  target    CREATE in stories collection ${target.collectionId}`)
  }
  console.log(`  assets    narration: ${urls.audioPending ? `upload to Blob as ${urls.audioPending.pathname} (→ ${urls.audioPending.url ?? 'URL known after upload'})` : urls.audioUrl || 'none'}`)
  console.log(`            illustration: ${urls.imagePending ? `upload to Basehub assets as ${urls.imagePending.fileName}` : urls.imageUrl}`)
  console.log('  mutation  basehub({ token: BASEHUB_ADMIN_TOKEN }).mutation({ transaction: { __args: { data }, status: true, message: true, duration: true } })')
  console.log(c.dim('            (stages in the Basehub working tree; a person commits in the dashboard)'))
  console.log(JSON.stringify([p.op], null, 2).replace(/^/gm, '            '))
  console.log(`  schema    draft-tree StoriesItem fields: ${Object.keys(p.liveFields).join(', ')}`)
  if (p.payloadProblems.length) for (const x of p.payloadProblems) console.log(c.red(`  invalid   ${x}`))
  else console.log(`  payload   ${c.green('valid')}: every live field set, values checked against the SDK value schemas, every URL fetched and matching the approved bytes`)
}

/** Re-hash the files right before a write; abort if anything moved. */
async function recheck(slug, expected) {
  const a = await assess(slug)
  if (a.problems.length) throw new GateError(a.problems.join(' '))
  if (a.image.sha256 !== expected.image || (a.audio.sha256 ?? null) !== (expected.audio ?? null) || a.draft.hash !== expected.draft) {
    throw new GateError('A file changed while publishing; aborting before the write.')
  }
  return a
}

async function uploadAssets(p, token) {
  const expected = { image: p.image.sha256, audio: p.audio.sha256 ?? null, draft: p.draft.hash }
  const assets = { ...(readState(p.draft.slug).stages.publish?.assets ?? {}) }
  if (p.urls.audioPending) {
    log.step('Uploading narration to Vercel Blob')
    await recheck(p.draft.slug, expected)
    const res = await uploadNarration(p.audio.file, p.draft.slug, { yes: true, quiet: true, expectedSha256: expected.audio })
    assets.audio = { url: res.url, sha256: expected.audio }
    writeStage(p.draft.slug, 'publish', { ...(readState(p.draft.slug).stages.publish ?? {}), status: 'assets', assets })
  }
  if (p.urls.imagePending) {
    log.step('Uploading illustration to Basehub assets')
    await recheck(p.draft.slug, expected)
    const bytes = readFileSync(p.image.file)
    if (sha256(bytes) !== expected.image) throw new GateError('Illustration changed on disk; aborting.')
    const url = await uploadAsset(token, p.urls.imagePending.fileName, bytes, 'image/jpeg')
    assets.image = { url, sha256: expected.image }
    writeStage(p.draft.slug, 'publish', { ...(readState(p.draft.slug).stages.publish ?? {}), status: 'assets', assets })
    log.ok(`Image asset: ${url}`)
  }
  if (!p.urls.audioPending && !p.urls.imagePending) log.ok('Assets already uploaded for these exact bytes.')
}

async function stage(p, token) {
  const expected = { image: p.image.sha256, audio: p.audio.sha256 ?? null, draft: p.draft.hash }
  await recheck(p.draft.slug, expected)
  for (const [name, url, sha] of assetChecks(p)) {
    const v = await verifyAsset(url, sha, sha256)
    if (!v.ok) throw new GateError(`The ${name} at ${url} is not the approved file: ${v.reason}.`)
  }
  log.step(`${p.op.type === 'update' ? 'Updating' : 'Creating'} the story in the Basehub working tree`)
  const tx = await transact(token, [p.op], 'story transaction')
  log.ok(`Transaction ${tx.status} in ${tx.duration ?? '?'} ms`)
  const item = await verifyDraftTree(token, p)
  writeStage(p.draft.slug, 'publish', {
    ...(readState(p.draft.slug).stages.publish ?? {}),
    status: 'staged',
    draftHash: p.draft.hash,
    itemId: item._id,
    dashboardUrl: item._dashboardUrl,
    audioUrl: p.urls.audioUrl,
    imageUrl: p.urls.imageUrl,
    approvedBy: p.approval.approval?.by,
  })
  return item
}

/** Read the story back from the draft tree and compare every field written. */
async function verifyDraftTree(token, p) {
  const item = await readStory(token, p.liveFields, (i) => i._slug === p.draft.slug)
  if (!item) throw new Error(`Transaction completed but "${p.draft.slug}" is not in the draft tree.`)
  const f = p.draft.fields
  const v = p.op.type === 'update' ? p.op.value : p.op.data.value
  const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()
  const checks = [
    ['title', item._title, f.title],
    ['virtue', item.virtue, f.virtue],
    ['summary', item.summary, f.summary],
    ['virtueDescription', item.virtueDescription, f.virtueDescription],
    ['source', item.source, f.source],
    ['audioUrl', item.audioUrl ?? '', p.urls.audioUrl ?? ''],
    ['image.alt', item.image?.alt, f.imageAlt],
  ]
  if (v.canonicalVirtue) checks.push(['canonicalVirtue', item.canonicalVirtue?._id, v.canonicalVirtue.value])
  if (v.subVirtue) checks.push(['subVirtue', item.subVirtue ?? '', v.subVirtue.value])
  if (v.audio) checks.push(['audio.url', item.audio?.url, v.audio.value.url])
  if (v.dek) checks.push(['dek', item.dek ?? '', v.dek.value])
  const mismatches = checks.filter(([, got, want]) => norm(got) !== norm(want))
  // Basehub re-hosts images it is given; the read-back URL must at least be on its asset CDN.
  if (!/^https:\/\/assets\.basehub\.com\//.test(item.image?.url ?? '')) mismatches.push(['image.url', item.image?.url, 'an assets.basehub.com URL'])
  const words = (s) => norm(s).replace(/[*_\\]/g, '')
  if (words(item.content?.markdown) !== words(p.draft.body)) log.warn('Body text in Basehub differs after markdown normalization; compare it in the dashboard before committing.')
  if (mismatches.length) {
    for (const [k, got, want] of mismatches) log.fail(`${k}: Basehub has ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`)
    throw new Error('Read-back from Basehub does not match the payload.')
  }
  log.ok(`Read-back matches the payload (${checks.length} fields and the image URL).`)
  return item
}

async function cli({ _, flags }) {
  const slug = _[0]
  if (flags.assets && !flags.yes) throw new UsageError('--assets uploads files; pass --yes with it (run without flags for the dry run).')
  const readToken = process.env.BASEHUB_ADMIN_TOKEN || process.env.BASEHUB_TOKEN
  if (!readToken) throw new UsageError('Set BASEHUB_TOKEN (read) for the dry run, BASEHUB_ADMIN_TOKEN for writes.')

  if (!flags.yes) {
    const p = await plan(slug, flags, readToken)
    printPlan(p, 'Dry run')
    const pending = p.urls.audioPending || p.urls.imagePending
    if (p.problems.length) log.warn('Gates are closed (red above); writes will refuse.')
    else if (pending) log.info(`Next: pnpm story:publish ${slug} --assets --yes  (uploads only), then dry-run again to see the final mutation.`)
    else if (p.updateBlocked) log.warn('This would overwrite a live story; add --update-existing once the diff above is intended.')
    else if (!p.payloadProblems.length) log.ok(`The mutation above is final. Next: pnpm story:publish ${slug} --yes  (stages it; a person commits in Basehub)`)
    return
  }

  const token = requireEnv('BASEHUB_ADMIN_TOKEN', 'Publishing needs a Basehub Admin Token with write scope.')
  const p = await plan(slug, flags, token)
  if (p.problems.length) {
    printPlan(p, 'Refused')
    throw new GateError(p.problems.join(' '))
  }
  if (flags.assets) {
    await uploadAssets(p, token)
    printPlan(await plan(slug, flags, token), 'Final mutation (not yet sent)')
    log.ok(`Assets uploaded. Review the mutation above, then: pnpm story:publish ${slug} --yes`)
    return
  }
  printPlan(p, 'Staging')
  if (p.urls.audioPending || p.urls.imagePending) throw new GateError(`Assets are not uploaded yet. Run \`pnpm story:publish ${slug} --assets --yes\` and review the dry run first.`)
  if (p.updateBlocked) throw new GateError('This slug is already a story in Basehub. Re-run with --update-existing after reading the diff above.')
  if (p.payloadProblems.length) throw new GateError(`Payload invalid: ${p.payloadProblems.join('; ')}`)
  const item = await stage(p, token)
  log.ok('Staged in Basehub\'s working tree. Nothing is live yet.')
  console.log(c.bold('\n  To publish, a person commits in the Basehub dashboard:'))
  console.log(`    1. Open ${item._dashboardUrl ?? 'the Basehub dashboard'} and the Changes tab.`)
  console.log(`    2. Read every pending change. A commit publishes all of them, not only "${p.draft.fields.title}".`)
  console.log('    3. If you commit on a later day than today, set publishedAt to the commit date (when the field exists).')
  console.log('    4. Commit. Then: pnpm story:revalidate --base-url https://www.classicalvirtues.com --yes')
  console.log(`       and: pnpm story:verify ${slug} --base-url https://www.classicalvirtues.com --yes`)
}

if (isEntry(import.meta.url)) {
  main(cli, {
    meta: import.meta.url,
    args: [1, 1],
    flags: { yes: 'boolean', assets: 'boolean', 'update-existing': 'boolean' },
  })
}
