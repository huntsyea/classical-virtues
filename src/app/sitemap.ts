import type { MetadataRoute } from 'next'
import { getAllStories } from '@/lib/stories'
import { getVirtueSlugs } from '@/lib/virtues'

const BASE_URL = 'https://classicalvirtues.com'

// ISR: keep the sitemap fresh with newly published stories, no rebuild (PRO-86).
export const revalidate = 300

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
      url: `${BASE_URL}/virtues`,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/about`,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    ...getVirtueSlugs().map((slug) => ({
      url: `${BASE_URL}/virtues/${slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    ...stories.map((story) => ({
      url: `${BASE_URL}/stories/${story.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ]
}
