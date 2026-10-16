/** @type {import('next').NextConfig} */
const nextConfig = {
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
