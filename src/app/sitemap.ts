import { getAllPosts } from '@/lib/posts'

export const revalidate = 60

export default async function sitemap() {
  const posts = getAllPosts()
  const baseUrl = 'https://classicalvirtues.com'

  const stories = posts.map((post) => ({
    url: `${baseUrl}/stories/${post.fileName.replace('.mdx', '')}`,
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
    ...stories,
  ]
}