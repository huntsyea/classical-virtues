import type { MetadataRoute } from 'next'
import { absoluteUrl } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  // Preview deployments must never be indexed; only production is crawlable.
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production') {
    return { rules: [{ userAgent: '*', disallow: '/' }] }
  }

  return {
    rules: [
      {
        userAgent: '*',
        // Share cards must stay fetchable; other API routes are machine-only.
        allow: ['/', '/api/og'],
        disallow: ['/api/', '/revalidate-sitemap'],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
  }
}
