import { getAllPosts, getPostBySlug } from '@/lib/posts';
import { MDXRemote } from 'next-mdx-remote/rsc';
import Image from 'next/image';
import { Card, CardContent, CardTitle } from '@/components/ui/card';

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({
    slug: post.fileName.replace('.mdx', ''),
  }));
}

export default async function Post({ params }: { params: { slug: string } }) {
  const post = getPostBySlug(params.slug);

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
      {post.audioUrl && (
        <Card className="my-8 p-4 bg-transparent">
          <h2 className="text-2xl font-bold mb-4 font-heading">Listen to the Story</h2>
          <audio controls className="w-full">
            <source src={post.audioUrl} type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
        </Card>
      )}
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
