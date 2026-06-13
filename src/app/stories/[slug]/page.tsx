import { getAllStories, getStoryBySlug } from '@/lib/stories';
import { MDXRemote } from 'next-mdx-remote/rsc';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import Breadcrumbs from '@/components/Breadcrumbs';
import JsonLd from '@/components/JsonLd';
import LazyAudioPlayer from '@/components/LazyAudioPlayer';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next'

type Params = Promise<{ slug: string }>

export async function generateStaticParams() {
  const stories = await getAllStories();
  return stories.map((story) => ({
    slug: story.slug,
  }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params
  const story = await getStoryBySlug(slug)

  if (!story) {
    return {
      title: 'Story Not Found',
      description: 'The requested story could not be found.'
    }
  }

  const ogImage = `/api/og?title=${encodeURIComponent(story.title)}&virtue=${encodeURIComponent(story.virtueDescription)}`

  return {
    title: story.title,
    description: story.summary,
    alternates: {
      canonical: `/stories/${slug}`,
    },
    keywords: [story.virtue, 'virtue', 'moral story', 'classical virtues'],
    openGraph: {
      type: 'article',
      url: `https://classicalvirtues.com/stories/${slug}`,
      title: story.title,
      description: story.summary,
      images: [{
        url: ogImage,
        width: 1200,
        height: 630,
        alt: story.title
      }],
      siteName: 'Classical Virtues',
    },
    twitter: {
      card: 'summary_large_image',
      title: story.title,
      description: story.summary,
      images: [ogImage]
    }
  }
}

export default async function Post({ params }: { params: Params }) {
  const { slug } = await params
  const story = await getStoryBySlug(slug);

  if (!story) {
    notFound();
  }

  const articleStructuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": story.title,
    "description": story.summary,
    "image": story.image.startsWith('http') ? story.image : `https://classicalvirtues.com${story.image}`,
    "wordCount": story.wordCount,
    "inLanguage": "en",
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
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://classicalvirtues.com/stories/${slug}`
    },
    "articleSection": "Moral Stories",
    "keywords": [story.virtue, "virtue", "moral story", "classical virtues"],
    ...(story.audioUrl
      ? {
          "audio": {
            "@type": "AudioObject",
            "contentUrl": story.audioUrl,
            "name": story.title,
          },
        }
      : {})
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <Breadcrumbs title={story.title} slug={slug} />
      <div className="relative w-full h-80 mb-8 overflow-hidden rounded-[4px]">
        <Image
          src={story.image}
          alt={`Illustration for ${story.title}`}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 768px"
          style={{ objectFit: 'cover', objectPosition: 'top' }}
          className="rounded-[4px]"
        />
      </div>
      {story.audioUrl && (
        <LazyAudioPlayer audioUrl={story.audioUrl} title={story.title} image={story.image} />
      )}
      <h1 className="text-4xl font-bold mb-4 font-heading tracking-wide">{story.title}</h1>
      <div className="prose prose-lg max-w-none">
        {/* Check if content is MDX (contains JSX) or plain markdown */}
        {story.content.includes('<') || story.content.includes('import') ? (
          <MDXRemote source={story.content} />
        ) : (
          <div className="prose prose-lg max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {story.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
      <Card className="bg-accent text-accent-foreground mt-8">
        <CardContent className="p-8">
          <div className="space-y-6">
            <div className="flex items-baseline ">
              <span className="font-heading font-semibold text-2xl">Moral Of The Story</span>
            </div>
            <div className="border-t border-accent-foreground/20 pt-4">
              <p className="font-heading text-lg italic leading-relaxed">
                {story.virtueDescription}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <JsonLd data={articleStructuredData} />
    </div>
  );
}
