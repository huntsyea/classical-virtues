import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/api/og'],
        disallow: ['/api/', '/revalidate-sitemap'],
      },
    ],
    sitemap: 'https://classicalvirtues.com/sitemap.xml',
  }
}
