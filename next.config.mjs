/** @type {import('next').NextConfig} */
const nextConfig = {
  // Basehub's Preview button appends `?bshb-preview=<token>` to the page URL.
  // Send it through /api/draft so Draft Mode is enabled server-side; pages stay
  // static for everyone else.
  async redirects() {
    return [
      {
        source: '/:path((?!api/).*)',
        has: [{ type: 'query', key: 'bshb-preview' }],
        // Once Draft Mode is on, let the URL through to the page; without this a
        // token-bearing URL would redirect forever.
        missing: [{ type: 'cookie', key: '__prerender_bypass' }],
        destination: '/api/draft?to=/:path',
        permanent: false,
      },
    ]
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
