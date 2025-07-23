import { getAboutPage } from '@/lib/about';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About',
  description: 'Learn about Classical Virtues',
  alternates: {
    canonical: '/about',
  },
};

export default async function AboutPage() {
  const about = await getAboutPage();

  if (!about) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <h1 className="text-4xl font-heading font-bold">{about._title}</h1>
      <p className="italic">{about.subtitle}</p>
      <div dangerouslySetInnerHTML={{ __html: about.content.markdown }} />
    </div>
  );
}

