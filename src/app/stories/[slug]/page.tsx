import { getAllPosts, getPostBySlug } from '@/lib/posts';
import { MDXRemote } from 'next-mdx-remote/rsc';
import Image from 'next/image';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import AudioPlayer from '@/components/AudioPlayer'; // Import the client component
import type { Metadata } from 'next'

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({
    slug: post.fileName.replace('.mdx', ''),
  }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = getPostBySlug(params.slug)
  
  if (!post) {
    return {
      title: 'Story Not Found',
      description: 'The requested story could not be found.'
    }
  }

  const ogImage = `/api/og?title=${encodeURIComponent(post.title)}&virtue=${encodeURIComponent(post.virtue)}`

  return {
    title: post.title,
    description: post.summary,
    keywords: [post.topic, 'virtue', 'moral story', 'classical virtues'],
    openGraph: {
      type: 'article',
      url: `https://classicalvirtues.com/stories/${params.slug}`,
      title: post.title,
      description: post.summary,
      images: [{
        url: ogImage,
        width: 1200,
        height: 630,
        alt: post.title
      }],
      siteName: 'Classical Virtues',
      publishedTime: new Date().toISOString(),
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.summary,
      images: [ogImage]
    }
  }
}

export default function Post({ params }: { params: { slug: string } }) {
  const post = getPostBySlug(params.slug);

  if (!post) {
    return <div>Post not found</div>; // Error handling for missing post
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="relative w-full h-80 mb-8 overflow-hidden rounded-lg">
        <Image
          src={post.image}
          alt={post.title}
          fill
          style={{ objectFit: 'cover', objectPosition: 'top' }}
          className="rounded-lg"
        />
      </div>
      {post.audioUrl && <AudioPlayer audioUrl={post.audioUrl} />} {/* Use the client component */}
      <h1 className="text-4xl font-bold mb-4 font-heading">{post.title}</h1>
      <div className="prose prose-lg max-w-none">
        <MDXRemote source={post.content} />
      </div>
      <Card className="bg-accent text-accent-foreground mt-8">
        <CardContent className="p-6">
          <CardTitle className="mb-2 p-4 italic font-heading">{post.virtue}</CardTitle>
        </CardContent>
      </Card>
    </div>
  );
}