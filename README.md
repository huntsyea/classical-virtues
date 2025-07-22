# Classical Virtues

![Vercel Deploy](https://deploy-badge.vercel.app/vercel/classical-virtues)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-blue)](https://tailwindcss.com)
[![MDX](https://img.shields.io/badge/MDX-3.0-yellow)](https://mdxjs.com)
[![shadcn/ui](https://img.shields.io/badge/shadcn/ui-latest-purple)](https://ui.shadcn.com)

A modern web application exploring classical virtues through interactive storytelling and content. Built with Next.js and enhanced with beautiful typography and responsive design.

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with Castoro and Inter via `next/font`
- **UI Components**: shadcn/ui
- **Content**: MDX for rich content authoring
- **Analytics**: Vercel Analytics
- **Deployment**: Vercel Platform
- **Performance**: Optimized fonts and images with next/font and next/image
- **SEO**: Built-in sitemap and robots.txt generation

## Getting Started

First, install the dependencies:

```bash
pnpm install
```

Then, run the development server:

```bash
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Development

- `src/app/*` - Main application routes and pages
- `src/components/*` - Reusable UI components
- `src/stories/*` - MDX content for virtue stories
- `public/*` - Static assets

## Deployment

The application is deployed on Vercel. Each commit to the main branch triggers an automatic deployment.

## Basehub CMS Integration

This project can pull stories from [Basehub](https://basehub.com) and automatically refresh the sitemap when new content is committed.

1. Add `BASEHUB_TOKEN` and `BASEHUB_WEBHOOK_SECRET` to `.env.local` (see `.env.example`).
2. In Basehub create a workflow triggered when a commit happens. Add a Webhook block pointing to `https://YOUR_DOMAIN.com/revalidate-sitemap` and enable signature verification with the same secret.
3. Deploy the site so the variables are available.

When the webhook is received, the endpoint verifies the signature and revalidates the sitemap and story pages:

```ts
revalidatePath('/sitemap.xml')
revalidatePath('/stories')
```

New URLs will appear in `/sitemap.xml` after the next request.


## Learn More

To learn more about the technologies used in this project:

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [MDX](https://mdxjs.com)

## License

MIT
