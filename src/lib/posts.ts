import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const postsDirectory = path.join(process.cwd(), 'src/stories');

export interface PostData {
  fileName: string;
  title: string;
  topic: string;
  image: string;
  summary: string;
  content: string;
  virtue: string;
  audioUrl: string;
}

export function getAllPosts(): PostData[] {
  const fileNames = fs.readdirSync(postsDirectory);
  const allPostsData = fileNames.map((fileName) => {
    const slug = fileName.replace('.mdx', '');
    return getPostBySlug(slug);
  });

  return allPostsData;
}

export function getPostBySlug(slug: string): PostData {
  const fullPath = path.join(postsDirectory, `${slug}.mdx`);
  const fileContents = fs.readFileSync(fullPath, 'utf8');

  const { data, content } = matter(fileContents);

  return {
    fileName: `${slug}.mdx`,
    title: data.title || '',
    topic: data.topic || '',
    image: data.image || '',
    summary: data.summary || '',
    virtue: data.virtue || '',
    audioUrl: data.audioUrl || '',
    content,
  };
}
