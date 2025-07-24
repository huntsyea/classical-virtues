import type { Metadata } from 'next';

export const defaultMetadata: Metadata = {
  metadataBase: new URL('https://classicalvirtues.com'),
  title: {
    default: 'Classical Virtues | Timeless Stories of Character',
    template: '%s | Classical Virtues',
  },
  description:
    'Discover timeless virtues through classical stories. Our collection of moral tales teaches enduring values of character, ethics, and wisdom for modern times.',
  keywords: [
    'virtues',
    'classical stories',
    'moral stories',
    'ethics',
    'character building',
    'wisdom tales',
    'moral education',
    'virtue stories',
    'character development',
    'traditional values',
  ],
  authors: [{ name: 'Classical Virtues' }],
  creator: 'Classical Virtues',
  publisher: 'Classical Virtues',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://classicalvirtues.com',
    siteName: 'Classical Virtues',
    title: 'Classical Virtues | Timeless Stories of Character',
    description:
      'Discover timeless virtues through classical stories. Our collection of moral tales teaches enduring values of character, ethics, and wisdom for modern times.',
    images: [
      {
        url: '/api/og',
        width: 1200,
        height: 630,
        alt: 'Classical Virtues - Timeless Stories of Character',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Classical Virtues | Timeless Stories of Character',
    description:
      'Discover timeless virtues through classical stories. Our collection of moral tales teaches enduring values of character, ethics, and wisdom for modern times.',
    images: ['/api/og'],
    creator: '@classicalvirtues',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: '/',
  },
  manifest: '/manifest.json',
};
