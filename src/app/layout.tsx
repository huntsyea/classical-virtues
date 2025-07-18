import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react"
import { cn } from '@/lib/utils'
import { fontHeading, fontBody } from '@/lib/fonts'
import ErrorBoundary from '@/components/ErrorBoundary'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://classicalvirtues.com'),
  title: {
    default: "Classical Virtues | Timeless Stories of Character",
    template: "%s | Classical Virtues"
  },
  description: "Discover timeless virtues through classical stories. Our collection of moral tales teaches enduring values of character, ethics, and wisdom for modern times.",
  keywords: [
    "virtues",
    "classical stories",
    "moral stories",
    "ethics",
    "character building",
    "wisdom tales",
    "moral education",
    "virtue stories",
    "character development",
    "traditional values"
  ],
  authors: [{ name: "Classical Virtues" }],
  creator: "Classical Virtues",
  publisher: "Classical Virtues",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://classicalvirtues.com",
    siteName: "Classical Virtues",
    title: "Classical Virtues | Timeless Stories of Character",
    description: "Discover timeless virtues through classical stories. Our collection of moral tales teaches enduring values of character, ethics, and wisdom for modern times.",
    images: [{
      url: "/api/og",
      width: 1200,
      height: 630,
      alt: "Classical Virtues - Timeless Stories of Character"
    }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Classical Virtues | Timeless Stories of Character",
    description: "Discover timeless virtues through classical stories. Our collection of moral tales teaches enduring values of character, ethics, and wisdom for modern times.",
    images: ["/api/og"],
    creator: "@classicalvirtues"
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
  manifest: '/manifest.json'
}

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
)

const websiteSchema: SchemaData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Classical Virtues",
  "url": "https://classicalvirtues.com",
  "description": "Discover timeless virtues through classical stories. Our collection of moral tales teaches enduring values of character, ethics, and wisdom for modern times."
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={cn(
        'min-h-screen bg-background font-body antialiased',
        fontHeading.variable,
        fontBody.variable,
        fontHeading.className || 'font-serif',
        fontBody.className || 'font-sans'
      )}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
        <Analytics />
        <JsonLd data={websiteSchema} />
      </body>
    </html>
  );
}
