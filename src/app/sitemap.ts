import { getAllPosts } from '@/lib/posts'

export default async function sitemap() {
  const posts = getAllPosts()
  const baseUrl = 'https://classicalvirtues.com'

  const stories = posts.map((post) => ({
    url: `${baseUrl}/stories/${post.fileName.replace('.mdx', '')}`,
    lastModified: new Date().toISOString(),
  }))

  return [
    {
      url: baseUrl,
      lastModified: new Date().toISOString(),
    },
    ...stories,
  ]
} 