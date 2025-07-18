import SummaryCard from '@/components/summaryCard'
import { getAllPosts } from '@/lib/posts'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Stories',
  description: 'Browse all classical virtue stories',
  alternates: {
    canonical: '/stories',
  },
}

export default function StoriesIndex() {
  const posts = getAllPosts()

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <h1 className="text-4xl font-heading font-bold mb-4">Stories</h1>
      <p className="text-muted-foreground mb-8">Discover our collection of timeless stories, each highlighting a unique virtue.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {posts.map(post => (
          <SummaryCard key={post.fileName} fileName={post.fileName} image={post.image} title={post.title} summary={post.summary} />
        ))}
      </div>
    </div>
  )
}
