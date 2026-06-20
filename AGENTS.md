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

Engineering work must preserve approved editorial content unless the task
explicitly asks for editorial changes. Do not rewrite story prose, titles,
summaries, or moral reflections while fixing code, scripts, schema adapters, or
rendering bugs. If approved content cannot render or publish safely, report the
technical blocker and route editorial decisions back to Margaret.

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
- Uses Instrument Serif (serif/heading) and Inter (sans/body) fonts via `next/font`
- Font variables are set in root layout and available globally

**Component Structure**:
- `src/components/` - Reusable UI components using shadcn/ui
- `src/components/ui/` - Base UI components from shadcn/ui
- Dynamic imports used for heavy components (AudioPlayer)

**Content Rendering**:
- Story pages (`src/app/stories/[slug]/page.tsx`) support both MDX and Markdown content from Basehub
- MDX content (with JSX) uses `next-mdx-remote`
- Plain Markdown uses `react-markdown` with GitHub Flavored Markdown

### Basehub Integration

When `BASEHUB_TOKEN` is set:
- `basehub.config.ts` configures the global Basehub client
- `src/lib/basehub.ts` defines Story interface and API functions
- Draft mode enabled in development environment
- Webhook endpoint at `/revalidate-sitemap` for content updates

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
- Font classes use CSS variables: `font-heading` and `font-body`
