# Classical Virtues

![Vercel Deploy](https://deploy-badge.vercel.app/vercel/classical-virtues)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-blue)](https://tailwindcss.com)
[![BaseHub](https://img.shields.io/badge/BaseHub-9.2-green)](https://basehub.com)
[![shadcn/ui](https://img.shields.io/badge/shadcn/ui-latest-purple)](https://ui.shadcn.com)

A modern web application exploring classical virtues through interactive storytelling and content. Built with Next.js, powered by BaseHub CMS, and enhanced with beautiful typography and responsive design.

## 🏗️ Architecture Overview

This project implements a **dual-content architecture** with BaseHub CMS as the primary content source and MDX fallback capabilities:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   BaseHub CMS   │────│  Next.js App     │────│  Static Site    │
│                 │    │                  │    │                 │
│ • Stories       │    │ • ISR Caching    │    │ • SEO Optimized │
│ • Images        │    │ • Type Safety    │    │ • Performance   │
│ • Rich Content  │    │ • Webhooks       │    │ • Responsive    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🚀 Tech Stack

**Core Framework:**
- **Next.js 14** with App Router and TypeScript
- **BaseHub CMS** for headless content management
- **Tailwind CSS** with custom design system

**Content & Media:**
- **BaseHub** for story content, images, and metadata
- **MDX** support for rich content authoring
- **Next/Image** for optimized image delivery
- **Audio Player** component for story narration

**Developer Experience:**
- **TypeScript** with BaseHub's generated types
- **shadcn/ui** component library
- **ESLint** and **Prettier** for code quality
- **Vercel** deployment with automatic CI/CD

**Performance & SEO:**
- **ISR (Incremental Static Regeneration)** caching
- **Dynamic sitemap** generation
- **OpenGraph** and **Twitter Card** meta tags
- **JSON-LD** structured data
- **Vercel Analytics** integration

## 🛠️ Getting Started

> **New here?** [SETUP.md](./SETUP.md) is the concise, verified quickstart (prerequisites,
> install, env vars, commands, and how to add a new virtue story). The notes below are an overview.

### Prerequisites

- Node.js `>=20.9.0` (verified on Node 24) and pnpm 10+
- BaseHub account and project setup (optional locally — the app degrades gracefully without a token)
- Vercel account for deployment

### Local Development

1. **Clone and install dependencies:**
   ```bash
   git clone <your-repo>
   cd classical-virtues
   pnpm install
   ```

2. **Environment setup:**
   ```bash
   cp .env.example .env.local
   # Add your BaseHub token and webhook secret
   ```

3. **Generate BaseHub types and start development:**
   ```bash
   pnpm run dev  # Runs: basehub dev & next dev
   ```

4. **Open [http://localhost:3000](http://localhost:3000)**

### Available Commands

```bash
pnpm run dev      # Start development server with BaseHub type generation
pnpm run build    # Generate types and build for production
pnpm run start    # Start production server
pnpm run lint     # Run ESLint
pnpm run basehub  # Generate BaseHub types only
```

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Home page with story grid
│   ├── stories/[slug]/    # Dynamic story pages
│   ├── sitemap.ts         # Dynamic sitemap generation
│   └── revalidate-sitemap/ # BaseHub webhook endpoint
├── components/            # Reusable UI components
│   ├── ui/               # shadcn/ui components
│   ├── AudioPlayer.tsx   # Story audio narration
│   └── summaryCard.tsx   # Story preview cards
├── lib/                  # Core utilities and data layer
│   ├── basehub.ts        # BaseHub API client and types
│   └── stories.ts        # Unified story data interface
└── types/               # TypeScript definitions
```

## 🔗 BaseHub CMS Integration

### Content Architecture

**BaseHub Schema:**
- **Stories Collection**: Main content with rich text, images, audio
- **Generated Types**: Full TypeScript safety with auto-generated interfaces
- **Draft Mode**: Development preview of unpublished content

**Data Flow:**
```
BaseHub CMS → basehub().query() → Type-safe data → Next.js pages → Static site
```

### Webhook Setup

The project includes automated content revalidation when BaseHub content changes:

1. **Configure BaseHub Webhook:**
   - URL: `https://your-domain.com/revalidate-sitemap`
   - Method: `POST`
   - Enable Svix signature verification
   - Secret: Set `BASEHUB_WEBHOOK_SECRET` environment variable

2. **Webhook Security:**
   - Uses **Svix HMAC-SHA256** signature verification
   - Implements timestamp validation (5-minute window)
   - Validates all required headers (`svix-id`, `svix-timestamp`, `svix-signature`)

3. **Revalidation Behavior:**
   ```ts
   // src/app/revalidate-sitemap/route.ts
   revalidatePath('/sitemap.xml')  # Updates sitemap with new stories
   revalidatePath('/stories')      # Clears story list cache
   ```

### Environment Variables

```bash
# Required for BaseHub integration
BASEHUB_TOKEN=bshb_pk_...           # BaseHub API token
BASEHUB_WEBHOOK_SECRET=whsec_...    # Webhook signature secret

# Optional
NEXT_PUBLIC_VERCEL_URL=...          # For absolute URLs in production
```


## 🚀 Deployment

### Vercel Deployment

1. **Connect repository to Vercel**
2. **Configure environment variables:**
   ```bash
   BASEHUB_TOKEN=bshb_pk_...
   BASEHUB_WEBHOOK_SECRET=whsec_...
   ```
3. **Deploy automatically on git push**

### Production Considerations

- **ISR Caching**: Stories are statically generated with on-demand revalidation
- **Image Optimization**: BaseHub images are automatically optimized by Next.js
- **SEO**: Dynamic sitemaps and meta tags are generated from BaseHub content
- **Performance**: Lazy-loaded audio player and optimized font loading

## 🔮 Future Improvements

### Phase 1: Real-time Content Updates

**Implement BaseHub Pump Component:**
```tsx
// Potential implementation in src/app/stories/[slug]/page.tsx
import { Pump } from 'basehub/next-pump'

export default function StoryPage() {
  return (
    <Pump
      queries={[{ stories: { items: { /* fields */ } } }]}
      next={{ revalidate: 60 }}
    >
      {async ([data]) => {
        // Real-time content rendering
        return <StoryContent story={data.stories.items[0]} />
      }}
    </Pump>
  )
}
```

**Benefits:**
- Real-time content updates without full page reloads
- Automatic cache management
- Better developer experience for content editing
- Reduced server load with intelligent caching

### Phase 2: Architecture Simplification

**Option A: Remove Abstraction Layer**
```tsx
// Direct BaseHub usage in components
import { basehub } from 'basehub'
import type { StoriesItem } from '../../../basehub-types'

// Components use BaseHub's native field names (_title, _slug)
function StoryCard({ story }: { story: StoriesItem }) {
  return <h2>{story._title}</h2>  // Direct BaseHub field access
}
```

**Option B: Enhanced Abstraction**
```tsx
// Improved abstraction with better type inference
export const useStories = () => {
  return useMemo(() => basehub().query(STORIES_QUERY), [])
}
```

### Phase 3: Advanced Features

**Content Management Enhancements:**
- **Rich text editor** integration for BaseHub
- **Image gallery** component for multiple story images  
- **Category/tag system** for story organization
- **Search functionality** with full-text search
- **Content scheduling** for timed story releases

**Performance Optimizations:**
- **Edge caching** strategy with Vercel Edge Functions
- **Prefetching** for story navigation
- **Image placeholder** generation
- **Progressive Web App** features

**Developer Experience:**
- **Storybook** integration for component development
- **E2E testing** with Playwright
- **Performance monitoring** with Core Web Vitals
- **Content validation** schemas

### Phase 4: Advanced CMS Features

**Multi-language Support:**
```tsx
// i18n with BaseHub
const { stories } = await basehub().query({
  stories: {
    __args: { filter: { locale: { eq: 'es' } } }
  }
})
```

**Advanced Analytics:**
- Story reading time tracking
- Popular content analytics
- User engagement metrics
- A/B testing for content presentation

## 🛠️ Current Implementation Status

✅ **Completed Features:**
- BaseHub CMS integration with type safety
- Webhook-based content revalidation
- SEO optimization with dynamic sitemaps
- Audio player for story narration
- Responsive design with Tailwind CSS
- Vercel deployment with CI/CD

🔄 **In Progress:**
- Content workflow optimization
- Performance monitoring setup

📋 **Planned:**
- Pump component integration for real-time updates
- Abstraction layer evaluation and potential simplification
- Enhanced content management features

## 📚 Learn More

**Core Technologies:**
- [Next.js Documentation](https://nextjs.org/docs) - Framework fundamentals
- [BaseHub Documentation](https://basehub.com/docs) - Headless CMS integration
- [Tailwind CSS](https://tailwindcss.com/docs) - Utility-first styling
- [shadcn/ui](https://ui.shadcn.com) - Modern component library

**Advanced Concepts:**
- [BaseHub Pump](https://basehub.com/docs/api-reference/pump) - Real-time content updates
- [Next.js ISR](https://nextjs.org/docs/basic-features/data-fetching/incremental-static-regeneration) - Caching strategies
- [Vercel Analytics](https://vercel.com/analytics) - Performance monitoring

## 📄 License

MIT
