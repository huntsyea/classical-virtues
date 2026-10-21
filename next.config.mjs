/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cache Components is Next 16's caching model, and the one Basehub's own
  // Next 16 playground uses: `'use cache'` scopes (see src/lib/basehub.ts)
  // replace the old route segment configs (`revalidate`, `dynamic`), and
  // runtime data (the Toolbar, preview cookies) streams through <Suspense>.
  cacheComponents: true,
  // Partial Prefetching (new in Next 16.4) stays off, which is the documented
  // setting for an app that adopted Cache Components before it existed:
  // leaving the option unset behaves like `false` and warns on every build.
  // Turning it on changes prefetching app-wide (one App Shell per route) and
  // needs its own per-route App Shell validation and Lighthouse run, so it is
  // a separate change, not a Next upgrade side effect.
  partialPrefetching: false,
  // Basehub content changes only when an editor publishes, and
  // `POST /api/revalidate` (plus Basehub's own on-demand revalidation) expires
  // the `basehub:content` tag, so this profile is only a safety net: serve up to
  // 5 minutes, revalidate in the background, expire the entry after a year.
  // Route shells take the shortest profile in their render, so a page that also
  // reads the footer year (weeks) expires its shell in 30 days.
  cacheLife: {
    content: { stale: 300, revalidate: 300, expire: 31536000 },
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    // 85 is reserved for the large painted heroes (story page, home lead).
    qualities: [75, 85],
    remotePatterns: [
      { protocol: 'https', hostname: 'assets.basehub.com' },
      { protocol: 'https', hostname: 'classicalvirtues.com' },
      { protocol: 'https', hostname: 'www.classicalvirtues.com' },
    ],
  },
}

export default nextConfig
