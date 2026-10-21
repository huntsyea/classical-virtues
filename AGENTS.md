# AGENTS.md

This file provides guidance to coding agents when working with code in this repository.

## Product And Editorial Sources

Read these before changing story content, story rendering, virtue pages,
Basehub schema usage, publishing scripts, metadata generation, or anything that
affects the public reading experience:

- `@PRODUCT.md` — product purpose, audience, brand, design principles, and the
  seven-virtue canon.
- `@writing.md` — prose voice, approved story structure, field contract, canon
  mapping, and SEO boundaries.
- `content/vault/new-virtue-checklist.md` — turnkey steps for adding a story so
  it lands on the right canon hub and conforms to the field contract. Adding a
  new sub-virtue angle requires one line in `SUB_VIRTUE_TO_CANON_SLUG`
  (`src/lib/virtues.ts`); see also `content/vault/catalog-audit.md`.
- `content/story-format.md`: the draft file contract (`content/drafts/<slug>.md`)
  shared by the writing skills, the linter, and the publish and audio scripts.
- Story skills in `.claude/skills/`: `virtue-story-research` (source and brief),
  `virtue-story-writer` (drafting craft), `virtue-story-editor` (the vault gate,
  with the `scripts/lint-story.mjs` linter).

Story prose (title, summary, body, and `virtueDescription`) must contain no em or
en dashes (`—`, `–`); they read as a machine-writing tell. Recast with standard
punctuation and verify with `grep -nP "—|–"` before publish. See the punctuation
rule in `@writing.md`.

Engineering work must preserve approved editorial content unless the task
explicitly asks for editorial changes. Do not rewrite story prose, titles,
summaries, or moral reflections while fixing code, scripts, schema adapters, or
rendering bugs. If approved content cannot render or publish safely, report the
technical blocker and route editorial decisions back to the editor of record.

## Development Commands

- `pnpm install` - Install dependencies
- `pnpm run dev` - Start development server (runs `basehub dev & next dev`)
- `pnpm run build` - Build for production (runs `basehub && next build`)
- `pnpm run start` - Start production server
- `pnpm run lint` - Run ESLint
- `pnpm run basehub` - Run Basehub CLI commands

## Architecture Overview

This is a Next.js 16 application (React 19) using the App Router that displays classical virtue stories through interactive storytelling.

### Content Strategy
All content comes from **Basehub CMS**. Content access logic is in `src/lib/stories.ts`, which checks for the `BASEHUB_TOKEN` environment variable and degrades gracefully (empty story list / null story) when Basehub is unavailable, so builds never fail on missing content.

The public reading experience is anthology-first. SEO should be handled through
metadata, summaries, slugs, structured data, and internal-link systems rather
than reader-facing SEO scaffolding in story bodies.

### Key Architecture Components

**Content Abstraction Layer** (`src/lib/stories.ts`):
- `getAllStories()` and `getStoryBySlug()` provide unified interface
- Converts Basehub content to the common `StoryData` interface
- Handles missing-token and error recovery

**Font System** (`src/lib/fonts.ts`):
- Newsreader (headline/wordmark, `--font-heading`), Literata (story prose,
  `--font-text`, not preloaded so the hero stays the LCP element) and Inter
  (UI and metadata, `--font-body`), all via `next/font/google`
- Font variables are set in root layout and available globally

**Component Structure**:
- `src/components/` - The site's own components; the design system lives in
  `src/app/globals.css` and `tailwind.config.ts`, not in a component library
- `src/components/ui/` - shadcn/ui sources, of which only `slider.tsx` (used by
  `AudioPlayer`) is still imported; everything else there was deleted
- Dynamic imports used for heavy components (AudioPlayer)

**Content Rendering**:
- Story pages (`src/app/stories/[slug]/page.tsx`) support both MDX and Markdown content from Basehub
- MDX content (with JSX) uses `next-mdx-remote`
- Plain Markdown uses `react-markdown` with GitHub Flavored Markdown

### Basehub Integration

When `BASEHUB_TOKEN` is set:
- `basehub.config.ts` configures the global Basehub client
- `src/lib/basehub.ts` defines Story interface and API functions
- Webhook endpoint at `/api/revalidate` for content updates (`/revalidate-sitemap`
  is kept as a legacy alias)

**Caching.** Basehub's documented setup plus Next 16's Cache Components model,
which is what Basehub's own Next 16 playground uses: `cacheComponents: true`
(`next.config.mjs`), the SDK's `<Toolbar />` in the root layout inside the
`<Suspense>` boundary Cache Components requires, and a `'use cache'` scope with
an explicit `cacheLife` and `cacheTag` for every reader in `src/lib/basehub.ts`.

- Call `basehub().query(...)` with no `cache`/`next` options. The SDK tags each
  query with `basehub-<hash>` and those fetch tags propagate into the enclosing
  `'use cache'` entry, which is what Basehub's Toolbar revalidates on commit.
  Passing `next`/`cache` replaces that tag and drops the `x-basehub-cache-tag`
  header, so do not add cache wrappers or tags around SDK queries.
- `cacheTag(BASEHUB_CONTENT_TAG)` is ours, declared by each reader, and
  `POST /api/revalidate` expires it with the `'max'` profile: stale-while-
  revalidate, so a purge during a Basehub outage keeps serving the last good
  entry instead of hard-expiring pages into 500s. Never use `revalidatePath` or
  `{ expire: 0 }` there.
- `cacheLife('content')` (next.config.mjs) is the time-based safety net: 5-minute
  revalidate, one-year expire on the cache entries, matching the window the
  readers had before Cache Components. A route's shell lifetime is the shortest
  profile in its render, so pages that also read the footer year (`weeks`)
  expire their shell after 30 days. Set an explicit `cacheLife` in every
  `'use cache'` scope.
- Route segment configs (`revalidate`, `dynamic`, `fetchCache`, `dynamicParams`)
  are gone: they fail the build with Cache Components. Uncached or request-time
  data goes inside `<Suspense>` instead (the Toolbar), and the clock is read
  inside a cache scope (`src/lib/copyright.ts`), never during prerender.
- `/search` is the one place that declares `instant = false` (a Cache Components
  route segment config, named `unstable_instant` before Next 16.3) instead of
  streaming its `searchParams` read, and it is the documented "this segment is
  allowed to block" opt-in. Its contract is a plain `GET /search?q=` form that
  renders results on the server with JavaScript off, which a `<Suspense>`
  boundary cannot keep: a streamed boundary only becomes visible through React's
  client runtime (the resolved nodes ship in a hidden div and are moved in by
  `$RC`), so a no-JS reader would land on an empty results area with an empty
  search box. The route is dynamic and noindex; do not convert it to `<Suspense>`.
- Draft mode (preview) works: `'use cache'` scopes re-execute per request under
  Draft Mode and store nothing, and the SDK queries drafts with `no-store`.
  **Branch preview does not**: the SDK reads the `bshb-preview-ref-<repoHash>`
  cookie with `cookies()`, which Cache Components forbids inside a `'use cache'`
  scope, so a preview session shows the resolved ref (main). The documented
  workaround (read the cookie outside the scope, pass it in as `ref`) works, but
  it makes the page content a request-time streaming hole, which measured 88
  Lighthouse performance on `/stories` against the 90 budget, so it is not in
  the code.
- Known limitation, upstream: Basehub's native Toolbar revalidation calls
  `revalidateTag(tag)` with no profile (`basehub@9.6.0`), which hard-expires the
  page instead of serving stale-while-revalidate. During a Basehub outage that
  path can turn pages into 500s; our `POST /api/revalidate` does not. No newer
  Basehub release exists, so this is documented rather than worked around (an
  issue draft lives in thread storage).

### SEO & Performance
- Comprehensive metadata and OpenGraph tags
- Dynamic OG image generation at `/api/og`; publisher logo served at `/logo.png` via `ImageResponse`
- Native App Router `sitemap.ts` (includes Basehub story URLs) and `robots.ts`
- Structured data (JSON-LD) for articles, breadcrumbs, item lists, website, and organization (shared `src/components/JsonLd.tsx`)
- Static site generation with `generateStaticParams`
- Optimized images (AVIF/WebP, `sizes`, priority hero) and fonts

## Environment Variables

Required for Basehub integration:
- `BASEHUB_TOKEN` - API token from Basehub dashboard
- `BASEHUB_WEBHOOK_SECRET` - For webhook signature verification

## Content Schema

Stories follow this interface:
```typescript
interface StoryData {
  id: string
  slug: string
  title: string
  virtue: string
  image: string
  summary: string
  content: string
  virtueDescription: string
  audioUrl: string
  wordCount: number
}
```

When extending this schema, prefer structured fields for editorial intent over
embedding control text in Markdown. In particular, keep story narrative,
moral/reflection, related links, canonical virtue mapping, source notes, and
image alt text distinct when the CMS model allows it.

## Important Patterns

- Use the unified story interface from `src/lib/stories.ts` rather than calling Basehub directly
- Always handle the case where content sources might be unavailable
- Audio components should be dynamically imported with SSR disabled via a client wrapper (`src/components/LazyAudioPlayer.tsx`) — `ssr: false` is not allowed in Server Components in Next 15+
- Font classes use CSS variables: `font-heading`, `font-text` and `font-body`
- Prefer the documented best practice and built-in features of our libraries and
  frameworks (Basehub, Next.js, Vercel, and so on) over custom replacements.
  Check the current docs before building a custom version of something the
  library already ships, and say why in the code comment when a deviation is
  unavoidable.
