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

**Caching.** Use Basehub's documented caching as-is. Call
`basehub().query(...)` with no `cache` or `next` options: the SDK tags each query
with its own `basehub-<hash>` string, Next caches those fetches during
prerendering, and Basehub's own `<Toolbar />` (mounted in `src/app/layout.tsx`)
provides the Server Action Basehub's servers call on commit to `revalidateTag`
those exact tags. Passing `next`/`cache` to `basehub()` replaces the tag and opts
the query out of that automatic revalidation, so do not add cache wrappers
(`unstable_cache`, `'use cache'`, custom tags) around SDK queries. See the header
of `src/lib/basehub.ts` for the full mechanism.

**`export const dynamic = 'force-static'`** is required on every route that reads
Basehub and is not itself request-dependent (`page.tsx` and route-handler files;
not `/search`, `/api/og`, `/api/revalidate`). The SDK resolves a ref with a
`cache: 'no-store'` fetch before each call, and the Toolbar does the same while
the root layout renders, so without this directive Next marks whichever routes
happen to run that fetch first in each build worker as dynamic (`ƒ`), varying
from build to build and dropping them out of the CDN cache. The directive is
Next's documented way to declare a route prerendered: it does not affect the
SDK's tags or Draft Mode. Pinning the ref (`ref`, `BASEHUB_REF`,
`setGlobalConfig({ ref })`) does not skip that fetch, so it is not an
alternative.

Known trade-off: `force-static` makes `cookies()` empty on those routes, so the
Toolbar's branch preview reads the resolved ref (main) rather than the selected
branch; the SDK reads the `bshb-preview-ref-<repoHash>` cookie for branch
overrides. Draft Mode itself, and draft preview of main, work normally. No
supported setup has both fully static pages and cookie-based branch preview:
dropping the directive puts the routes back to `ƒ`. Verify with `pnpm build`
twice: the route table must be identical both times, with `ƒ` only on the
request-dependent routes above.

- `declareContentTag()` (`src/lib/basehub.ts`) runs on every content read and
declares `basehub:content` on the route that is rendering. Next collects the tags
of every fetch made during a render onto that route's cache entry, which is how
our own webhook gets a tag it can expire: a caller-supplied `next.tags`
*replaces* the SDK's tag (verified against `basehub@9.6.0` and by build output),
so it cannot ride on the content queries without opting them out of Basehub's
automatic revalidation. Do not add cache wrappers around SDK queries.
- `POST /api/revalidate` expires `basehub:content` with the `'max'`
  (stale-while-revalidate) profile, so a purge while Basehub is unreachable keeps
serving the last good render instead of hard-expiring pages into 500s. Do not
switch it to `revalidatePath` or `{ expire: 0 }`; see `src/lib/revalidate.ts`.
- Draft mode (preview) is inferred by the SDK: in `next dev`, and whenever Next's
  Draft Mode is on (toggled by the Toolbar), queries read drafts with `no-store`
  and routes render per request; see `src/lib/basehub.ts`

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
