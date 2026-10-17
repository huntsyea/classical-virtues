import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Suspense } from 'react'
import { Analytics } from "@vercel/analytics/next"
import { cn } from '@/lib/utils'
import ErrorBoundary from '@/components/ErrorBoundary'
import JsonLd from '@/components/JsonLd'
import { Toolbar } from 'basehub/next-toolbar'
import { hasBasehubToken } from '@/lib/basehub'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import './globals.css'
import { fontHeading, fontBody, fontText } from '@/lib/fonts'
import { SITE } from '@/lib/site'
import { FEED_ALTERNATES, brandedOgImage, siteJsonLd } from '@/lib/seo'
import { themeInitScript } from '@/components/theme'
import virtuesData from '@/data/virtues.json'

// Seven-virtue canon for the menu and footer, in canonical order.
const navVirtues = (virtuesData as { slug: string; title: string; order: number }[])
  .slice()
  .sort((a, b) => a.order - b.order)
  .map(({ slug, title }) => ({ slug, title }))

// Root metadata. Pages restate canonical/openGraph/twitter through
// `pageMetadata()` in src/lib/seo.ts, because Next.js merges metadata shallowly.
// No root canonical: it would leak `/` onto any page that forgets its own.
export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: SITE.title,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  authors: [{ name: SITE.name, url: SITE.url }],
  creator: SITE.name,
  publisher: SITE.name,
  openGraph: {
    type: 'website',
    locale: SITE.ogLocale,
    url: '/',
    siteName: SITE.name,
    title: SITE.title,
    description: SITE.description,
    images: [brandedOgImage('home')],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE.title,
    description: SITE.description,
    images: [brandedOgImage('home').url],
  },
  // Large image previews and full snippets for every crawler, not only Google.
  robots: {
    index: true,
    follow: true,
    'max-image-preview': 'large',
    'max-snippet': -1,
    'max-video-preview': -1,
  },
  alternates: {
    types: FEED_ALTERNATES,
  },
  // Keep iOS from turning dates and numbers in the prose into phone links.
  formatDetection: { telephone: false, email: false, address: false },
  manifest: '/manifest.json'
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Browser chrome follows the reading theme; an explicit night-reading choice
  // overrides both (see src/components/theme.ts).
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f9f7f1' },
    { media: '(prefers-color-scheme: dark)', color: '#191713' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(fontHeading.variable, fontBody.variable, fontText.variable)}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-screen flex-col bg-background font-body antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:bg-foreground focus:px-4 focus:py-3 focus:text-background"
        >
          Skip to content
        </a>
        <Navbar virtues={navVirtues} />
        <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
        <Footer virtues={navVirtues} />
        <Analytics />
        {/* Umami analytics — self-hosted, public website-id (no secret).
            Skipped in local dev (NODE_ENV !== 'production') to avoid polluting
            traffic data; loads on production and preview builds. */}
        {process.env.NODE_ENV === 'production' && (
          <Script
            src="https://analytics.dudesdesign.com/script.js"
            data-website-id="3ec4b765-4eef-445d-89d8-db485a2eeba5"
            strategy="afterInteractive"
          />
        )}
        <JsonLd data={siteJsonLd()} />
        {/* Basehub's own Toolbar, mounted in the root layout exactly as the
            caching docs and Basehub's own Next 16 playground prescribe, inside
            the <Suspense> boundary Cache Components requires for request-time
            data: the Toolbar reads Draft Mode and resolves a ref per request,
            so it is the route's streaming hole while everything cached in
            `'use cache'` scopes stays in the prerendered shell.

            The `hasBasehubToken` and try/catch guards keep a missing token or a
            Basehub outage from failing every page in the site: the Toolbar's own
            ref lookup rejects when Basehub is unreachable, and it throws without
            a token. They do not change what is cached; see src/lib/basehub.ts. */}
        <Suspense>
          <BasehubToolbar />
        </Suspense>
      </body>
    </html>
  );
}

/**
 * The Toolbar, guarded so it can never fail a public page: it throws without
 * `BASEHUB_TOKEN`, and its uncached ref lookup rejects when Basehub is down.
 * A failed lookup must not take the whole page down with it; without the
 * Toolbar an editor can still publish, they just lose the in-context controls.
 */
async function BasehubToolbar() {
  if (!hasBasehubToken()) return null
  try {
    return await Toolbar({})
  } catch {
    return null
  }
}
