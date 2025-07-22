import { getAllStories } from '@/lib/stories'

export const revalidate = 3600 // Revalidate every hour

export default async function sitemap() {
  const stories = await getAllStories()
  const baseUrl = 'https://classicalvirtues.com'

  const storyUrls = stories.map((story) => ({
    url: `${baseUrl}/stories/${story.slug}`,
    lastModified: new Date().toISOString(),
    changefreq: 'monthly' as const,
    priority: 0.8,
  }))

  return [
    {
      url: baseUrl,
      lastModified: new Date().toISOString(),
      changefreq: 'weekly' as const,
      priority: 1.0,
    },
    ...storyUrls,
  ]
}