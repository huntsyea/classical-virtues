import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/react';
import { cn } from '@/lib/utils';
import ErrorBoundary from '@/components/ErrorBoundary';
import './globals.css';
import { fontHeading, fontBody } from '@/lib/fonts';
import { defaultMetadata } from '@/lib/seo';

export const metadata: Metadata = { ...defaultMetadata };

interface SchemaData {
  '@context': string;
  '@type': string;
  name: string;
  url: string;
  description: string;
}

const JsonLd = ({ data }: { data: SchemaData }) => (
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
  />
);

const websiteSchema: SchemaData = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Classical Virtues',
  url: 'https://classicalvirtues.com',
  description:
    'Discover timeless virtues through classical stories. Our collection of moral tales teaches enduring values of character, ethics, and wisdom for modern times.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={cn(
          'min-h-screen bg-background font-body antialiased',
          fontHeading.variable,
          fontBody.variable,
          fontHeading.className || 'font-serif',
          fontBody.className || 'font-sans'
        )}
      >
        <ErrorBoundary>{children}</ErrorBoundary>
        <Analytics />
        <JsonLd data={websiteSchema} />
      </body>
    </html>
  );
}
