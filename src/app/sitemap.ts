import type { MetadataRoute } from 'next'
import { getAllStories } from '@/lib/stories'

const BASE_URL = 'https://classicalvirtues.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const stories = await getAllStories()

  return [
    {
      url: BASE_URL,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${BASE_URL}/stories`,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/about`,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    ...stories.map((story) => ({
      url: `${BASE_URL}/stories/${story.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ]
}
