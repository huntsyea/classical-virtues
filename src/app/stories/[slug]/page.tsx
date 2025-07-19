import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { getAllPosts, getPostBySlug } from '@/lib/posts';
import { MDXRemote } from 'next-mdx-remote/rsc';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import Breadcrumbs from '@/components/Breadcrumbs';
import type { Metadata } from 'next'

// Lazy load the AudioPlayer
const AudioPlayer = dynamic(
  () => import('@/components/AudioPlayer'),
  {
    loading: () => (
      <Card className="my-8 p-4 bg-transparent w-full border">
        <h2 className="text-2xl font-bold mb-1 font-heading">Listen to the Story</h2>
        <div className="bg-background rounded-lg p-4 w-full h-[100px] animate-pulse" />
      </Card>
    ),
    ssr: false // Disable SSR for audio player
  }
);

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

  const ogImage = `/api/og?title=${encodeURIComponent(post.title)}&virtue=${encodeURIComponent(post.virtueDescription)}`

  return {
    title: post.title,
    description: post.summary,
    alternates: {
      canonical: `/stories/${params.slug}`,
    },
    keywords: [post.virtue, 'virtue', 'moral story', 'classical virtues'],
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

interface JsonLdProps {
  data: {
    '@context': string;
    '@type': string;
    headline: string;
    description: string;
    image: string;
    author: {
      '@type': string;
      name: string;
    };
    publisher: {
      '@type': string;
      name: string;
      logo: {
        '@type': string;
        url: string;
      };
    };
    datePublished: string;
    mainEntityOfPage: {
      '@type': string;
      '@id': string;
    };
  }
}

const JsonLd = ({ data }: JsonLdProps) => (
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
  />
)

export default function Post({ params }: { params: { slug: string } }) {
  const post = getPostBySlug(params.slug);

  if (!post) {
    return <div>Post not found</div>; // Error handling for missing post
  }

  const articleStructuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.title,
    "description": post.summary,
    "image": `https://classicalvirtues.com${post.image}`,
    "wordCount": post.wordCount,
    "author": {
      "@type": "Organization",
      "name": "Classical Virtues",
      "url": "https://classicalvirtues.com"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Classical Virtues",
      "url": "https://classicalvirtues.com",
      "logo": {
        "@type": "ImageObject",
        "url": "https://classicalvirtues.com/logo.png"
      }
    },
    "datePublished": new Date().toISOString(),
    "dateModified": new Date().toISOString(),
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://classicalvirtues.com/stories/${params.slug}`
    },
    "articleSection": "Moral Stories",
    "keywords": [post.virtue, "virtue", "moral story", "classical virtues"],
    ...(post.audioUrl
      ? {
          "audio": {
            "@type": "AudioObject",
            "contentUrl": post.audioUrl,
          },
        }
      : {})
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <Breadcrumbs title={post.title} />
      <div className="relative w-full h-80 mb-8 overflow-hidden rounded-lg">
        <Image
          src={post.image}
          alt={post.title}
          fill
          style={{ objectFit: 'cover', objectPosition: 'top' }}
          className="rounded-lg"
        />
      </div>
      {post.audioUrl && (
        <Suspense fallback={
          <Card className="my-8 p-4 bg-transparent w-full border">
            <h2 className="text-2xl font-bold mb-1 font-heading">Listen to the Story</h2>
            <div className="bg-background rounded-lg p-4 w-full h-[100px] animate-pulse" />
          </Card>
        }>
          <AudioPlayer audioUrl={post.audioUrl} title={post.title} image={post.image} />
        </Suspense>
      )}
      <h1 className="text-4xl font-bold mb-4 font-heading">{post.title}</h1>
      <div className="prose prose-lg max-w-none">
        <MDXRemote source={post.content} />
      </div>
      <Card className="bg-accent text-accent-foreground mt-8">
        <CardContent className="p-8">
          <div className="space-y-6">
            <div className="flex items-baseline ">
              <span className="font-heading font-semibold text-2xl mr-1">Virtue:</span>
              <span className="font-heading text-2xl">{post.virtue}</span>
            </div>
            <div className="border-t border-accent-foreground/20 pt-4">
              <p className="font-heading text-lg italic leading-relaxed">
                {post.virtueDescription}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <JsonLd data={articleStructuredData} />
    </div>
  );
}