# SETUP — Classical Virtues

Concise, verified quickstart for getting the repo running locally and shipping changes.
For the deep Basehub schema walkthrough see [BASEHUB-SETUP.md](./BASEHUB-SETUP.md); for
architecture conventions see [CLAUDE.md](./CLAUDE.md).

- **Repo:** https://github.com/huntsyea/classical-virtues
- **Live:** https://www.classicalvirtues.com/
- **Stack:** Next.js 16 (App Router, React 19, Turbopack) · Basehub CMS · Tailwind 3 · shadcn/ui

## Prerequisites

| Tool | Version | Notes |
| ---- | ------- | ----- |
| Node | `>=20.9.0` (per `package.json` engines) | Verified on Node 24.16.0 |
| pnpm | 10+ | Verified on pnpm 11.7.0; CI pins major 10 |

This project uses **pnpm only** (a `pnpm-lock.yaml` is committed; `package-lock.json` /
`yarn.lock` are git-ignored). Don't mix package managers.

## Install

```bash
pnpm install
```

Postinstall builds `sharp` and `unrs-resolver` (allow-listed in `pnpm-workspace.yaml`).
A clean install takes a few seconds and produces no errors.

## Environment

```bash
cp .env.example .env.local
```

`.env*.local` is git-ignored — never commit real tokens. Variables:

| Variable | Required? | Where it comes from |
| -------- | --------- | ------------------- |
| `BASEHUB_TOKEN` | For live content | Basehub dashboard → project → Settings → **Read tokens** (format `bshb_pk_…`) |
| `BASEHUB_WEBHOOK_SECRET` | For content-revalidation webhook | Basehub dashboard → **Webhooks** (Svix signing secret, format `whsec_…`) |
| `NEXT_PUBLIC_APP_URL` | No | Defaults to `http://localhost:3000` |
| `NEXT_PUBLIC_APP_NAME` | No | Display name |
| `NEXT_TELEMETRY_DISABLED` | No | Set to `1` to opt out of Next telemetry |

### Fastest path: pull secrets from Vercel

If you have access to the `dudesdesign/classical-virtues` Vercel project, you don't need
to copy tokens by hand — pull them straight into a git-ignored `.env.local`:

```bash
npx vercel link --yes --project classical-virtues --scope dudesdesign  # writes .vercel/ (git-ignored)
npx vercel env pull .env.local                                          # downloads development env vars
```

This populates `BASEHUB_TOKEN`, `BASEHUB_WEBHOOK_SECRET`, and `BLOB_READ_WRITE_TOKEN`.
Add `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_APP_NAME` from `.env.example` if you want them.

**Graceful degradation (verified):** with `BASEHUB_TOKEN` empty, the app still runs.
`getAllStories()` returns `[]` and `getStoryBySlug()` returns `null`
(see `src/lib/stories.ts`), so the home page, `/stories`, `/about`, and `/api/stories`
all render — just with no stories. This lets you work on layout/UI without a token.

## Commands

| Command | What it does |
| ------- | ------------ |
| `pnpm run dev` | `basehub dev & next dev` — dev server at http://localhost:3000 |
| `pnpm run build` | `basehub && next build` — production build (**requires `BASEHUB_TOKEN`**, see below) |
| `pnpm run build:local` | `next build` only — builds **without** a token using the committed `basehub-types.d.ts` |
| `pnpm run start` | Serve the production build |
| `pnpm run lint` | ESLint (currently clean) |
| `pnpm run basehub` | Regenerate `basehub-types.d.ts` from the Basehub schema (needs a token) |

### About the build and the Basehub token

The `build` and `dev` scripts call the `basehub` CLI, which **hard-fails without a
`BASEHUB_TOKEN`** (`🔴 Token not found`):

- `pnpm run dev` — the `basehub dev` half errors, but it's backgrounded (`&`), so
  `next dev` still boots normally. You'll just see the token warning.
- `pnpm run build` — the `basehub` codegen step runs first and exits non-zero **before**
  `next build`, so the full build fails without a token.
- `pnpm run build:local` — skips codegen and runs `next build` directly. This works
  token-less because `basehub-types.d.ts` is committed; the app then degrades gracefully.

In CI and on Vercel the token is present, so the standard `basehub && next build` is correct
there. Only regenerate types (`pnpm run basehub`) when the Basehub schema changes.

> Note: don't set `NODE_ENV` in `.env.local` — Next.js manages it and warns when it's set
> manually. It's intentionally omitted from `.env.example`.

## Adding a new virtue story

Content lives in **Basehub**, not in the repo — adding a story usually needs **no code
changes or deploy**.

1. Open the Basehub project dashboard and edit the **`stories`** collection.
2. Create a new entry and fill the fields the app reads (see `src/lib/basehub.ts` /
   the `StoryData` interface in `src/lib/stories.ts`):
   - **title** (entry title) · **virtue** (e.g. "Courage") · **image** (hero) ·
     **summary** · **virtueDescription** (the moral) · **audioUrl** (optional narration) ·
     **content** (rich text / Markdown or MDX).
3. **Publish.** ISR + the `/revalidate-sitemap` webhook pick it up; the story appears at
   `/stories/<slug>` and in the story grid, sitemap, and structured data automatically.
4. If you **added or renamed schema fields**, run `pnpm run basehub` locally to regenerate
   `basehub-types.d.ts`, wire the new field through `src/lib/basehub.ts` →
   `src/lib/stories.ts`, and commit those type changes.

See [BASEHUB-SETUP.md](./BASEHUB-SETUP.md) for the full field-by-field schema reference.

## Deploying (Vercel)

The repo is **not** yet linked locally (no `.vercel/` dir). To connect to the existing
`classicalvirtues.com` Vercel project (do **not** create a new project):

1. `vercel link` (or use the Vercel dashboard) to link this repo to the existing project.
2. Set environment variables in the Vercel project (Production + Preview):
   `BASEHUB_TOKEN`, `BASEHUB_WEBHOOK_SECRET` (+ optional `NEXT_PUBLIC_APP_URL`).
3. Build command: `basehub && next build` (the default `build` script). Install: `pnpm install`.
4. Point the Basehub webhook at `https://www.classicalvirtues.com/revalidate-sitemap`.

CI (`.github/workflows/ci-cd.yml`) runs lint + build on push/PR and needs a `BASEHUB_TOKEN`
repo secret for the build step to pass.
