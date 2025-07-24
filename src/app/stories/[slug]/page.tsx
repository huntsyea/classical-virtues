import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { getAllStories, getStoryBySlug } from '@/lib/stories';
import { MDXRemote } from 'next-mdx-remote/rsc';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import Breadcrumbs from '@/components/Breadcrumbs';
import type { Metadata } from 'next';
import { defaultMetadata } from '@/lib/seo';

// Lazy load the AudioPlayer
const AudioPlayer = dynamic(() => import('@/components/AudioPlayer'), {
  loading: () => (
    <Card className="my-8 p-4 bg-transparent w-full border">
      <h2 className="text-2xl font-bold mb-1 font-heading">
        Listen to the Story
      </h2>
      <div className="bg-background rounded-lg p-4 w-full h-[100px] animate-pulse" />
    </Card>
  ),
  ssr: false, // Disable SSR for audio player
});

export async function generateStaticParams() {
  const stories = await getAllStories();
  return stories.map(story => ({
    slug: story.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const story = await getStoryBySlug(params.slug);

  if (!story) {
    return {
      title: 'Story Not Found',
      description: 'The requested story could not be found.',
    };
  }

  const ogImage = `/api/og?title=${encodeURIComponent(story.title)}&virtue=${encodeURIComponent(story.virtueDescription)}`;

  return {
    ...defaultMetadata,
    title: story.title,
    description: story.summary,
    alternates: {
      canonical: `/stories/${params.slug}`,
    },
    keywords: [
      ...(defaultMetadata.keywords || []),
      story.virtue,
      'virtue',
      'moral story',
      'classical virtues',
    ],
    openGraph: {
      ...defaultMetadata.openGraph,
      type: 'article',
      url: `https://classicalvirtues.com/stories/${params.slug}`,
      title: story.title,
      description: story.summary,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: story.title,
        },
      ],
      publishedTime: new Date().toISOString(),
    },
    twitter: {
      ...defaultMetadata.twitter,
      title: story.title,
      description: story.summary,
      images: [ogImage],
    },
  };
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
  };
}

const JsonLd = ({ data }: JsonLdProps) => (
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
  />
);

// Use BaseHub's built-in caching

export default async function Post({ params }: { params: { slug: string } }) {
  const story = await getStoryBySlug(params.slug);

  if (!story) {
    return <div>Story not found</div>; // Error handling for missing story
  }

  const articleStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: story.title,
    description: story.summary,
    image: story.image.startsWith('http')
      ? story.image
      : `https://classicalvirtues.com${story.image}`,
    wordCount: story.wordCount,
    author: {
      '@type': 'Organization',
      name: 'Classical Virtues',
      url: 'https://classicalvirtues.com',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Classical Virtues',
      url: 'https://classicalvirtues.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://classicalvirtues.com/logo.png',
      },
    },
    datePublished: new Date().toISOString(),
    dateModified: new Date().toISOString(),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://classicalvirtues.com/stories/${params.slug}`,
    },
    articleSection: 'Moral Stories',
    keywords: [story.virtue, 'virtue', 'moral story', 'classical virtues'],
    ...(story.audioUrl
      ? {
          audio: {
            '@type': 'AudioObject',
            contentUrl: story.audioUrl,
          },
        }
      : {}),
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <Breadcrumbs title={story.title} />
      <div className="relative w-full h-80 mb-8 overflow-hidden rounded-lg">
        <Image
          src={story.image}
          alt={story.title}
          fill
          style={{ objectFit: 'cover', objectPosition: 'top' }}
          className="rounded-lg"
        />
      </div>
      {story.audioUrl && (
        <Suspense
          fallback={
            <Card className="my-8 p-4 bg-transparent w-full border">
              <h2 className="text-2xl font-bold mb-1 font-heading">
                Listen to the Story
              </h2>
              <div className="bg-background rounded-lg p-4 w-full h-[100px] animate-pulse" />
            </Card>
          }
        >
          <AudioPlayer
            audioUrl={story.audioUrl}
            title={story.title}
            image={story.image}
          />
        </Suspense>
      )}
      <h1 className="text-4xl font-bold mb-4 font-heading">{story.title}</h1>
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
              <span className="font-heading font-semibold text-2xl">
                Moral Of The Story
              </span>
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
