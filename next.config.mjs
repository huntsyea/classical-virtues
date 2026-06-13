/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'assets.basehub.com' },
      { protocol: 'https', hostname: 'classicalvirtues.com' },
    ],
  },
}

export default nextConfig
