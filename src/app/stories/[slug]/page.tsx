import { getAllStories, getStoryBySlug } from '@/lib/stories';
import { getVirtueSlugForStoryVirtue } from '@/lib/virtues';
import { compileMDX } from 'next-mdx-remote/rsc';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import Breadcrumbs from '@/components/Breadcrumbs';
import JsonLd from '@/components/JsonLd';
import LazyAudioPlayer from '@/components/LazyAudioPlayer';
import ShareStory from '@/components/ShareStory';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next'
import type { ReactNode } from 'react'

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

/**
 * Render story content. Content that looks like MDX (imports or JSX tags) is
 * compiled with MDX inside a try/catch; anything else, including MDX that
 * fails to compile (e.g. a literal '<' in plain prose), falls back to
 * Markdown so a stray character can never take the page down.
 */
async function renderStoryContent(content: string): Promise<ReactNode> {
  const looksLikeMdx = /^\s*(import\s|<[A-Za-z])/m.test(content)

  if (looksLikeMdx) {
    try {
      const { content: mdxContent } = await compileMDX({ source: content })
      return mdxContent
    } catch {
      // Fall through to plain Markdown rendering below.
    }
  }

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]}>
      {content}
    </ReactMarkdown>
  )
}

export default async function Post({ params }: { params: Params }) {
  const { slug } = await params
  const story = await getStoryBySlug(slug);

  if (!story) {
    notFound();
  }

  const allStories = await getAllStories();
  const otherStories = allStories.filter((s) => s.slug !== story.slug);
  const relatedStories = [
    ...otherStories.filter((s) => s.virtue === story.virtue),
    ...otherStories.filter((s) => s.virtue !== story.virtue),
  ].slice(0, 3);

  const minutes = Math.max(1, Math.round(story.wordCount / 140));
  const virtueSlug = getVirtueSlugForStoryVirtue(story.virtue);
  if (!virtueSlug) {
    // Fail loudly: an unmapped virtue silently drops the virtue-hub link. Surface
    // it in build/runtime logs so the editorial mismatch gets fixed, but keep the
    // page rendering (plain-text virtue) per the graceful-degradation principle.
    console.error(
      `[virtue-mapping] Story "${story.slug}" has virtue "${story.virtue}" which maps to no canon entry. ` +
        `The virtue-hub link will be missing. Set the story virtue to a canon name or alias (see src/data/virtues.json).`,
    );
  }
  const storyContent = await renderStoryContent(story.content);

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
    // Provenance as structured data (allowed SEO surface): the public-domain or
    // classical source this retelling is based on.
    ...(story.source ? { "isBasedOn": story.source } : {}),
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
      <header className="mb-8">
        <h1 className="text-4xl sm:text-5xl font-heading tracking-wide">{story.title}</h1>
        <p className="mt-3 text-muted-foreground">
          A story of{' '}
          {virtueSlug ? (
            <Link
              href={`/virtues/${virtueSlug}`}
              className="underline underline-offset-4 hover:text-foreground"
            >
              {story.virtue.toLowerCase()}
            </Link>
          ) : (
            story.virtue.toLowerCase()
          )}{' '}
          · About {minutes} {minutes === 1 ? 'minute' : 'minutes'}
        </p>
      </header>
      <div className="relative w-full h-80 mb-8 overflow-hidden">
        <Image
          src={story.image}
          alt={story.imageAlt}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 768px"
          style={{ objectFit: 'cover', objectPosition: 'top' }}
        />
      </div>
      {story.audioUrl && (
        <LazyAudioPlayer audioUrl={story.audioUrl} title={story.title} image={story.image} />
      )}
      <div className="prose prose-lg">
        {storyContent}
      </div>
      {story.source && (
        // Provenance line: a quiet, structured attribution kept outside the
        // narrative body and the moral card (SEO boundary, writing.md).
        <p className="mt-6 text-sm italic text-muted-foreground">
          Source: {story.source}
        </p>
      )}
      <Card className="bg-accent text-accent-foreground mt-8">
        <CardContent className="p-8">
          <div className="space-y-6">
            <h2 className="font-heading text-2xl">The Moral of the Story</h2>
            <div className="border-t border-accent-foreground/20 pt-4">
              <p className="font-heading text-lg italic leading-relaxed">
                {story.virtueDescription}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <ShareStory title={story.title} slug={slug} />
      {relatedStories.length > 0 && (
        <section aria-labelledby="read-another" className="mt-16 border-t border-border pt-10">
          <h2 id="read-another" className="font-heading text-2xl mb-6">Read another story</h2>
          <ul className="space-y-5">
            {relatedStories.map((related) => (
              <li key={related.slug}>
                <Link href={`/stories/${related.slug}`} className="group inline-block py-1">
                  <span className="font-heading text-xl underline-offset-4 group-hover:underline">
                    {related.title}
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    A story of {related.virtue.toLowerCase()}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-8">
            <Link href="/stories" className="inline-block py-2 underline underline-offset-4 text-primary">
              Browse the whole collection
            </Link>
          </p>
        </section>
      )}
      <JsonLd data={articleStructuredData} />
    </div>
  );
}
