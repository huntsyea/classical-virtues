import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react"
import { Cormorant_Garamond } from 'next/font/google'
import { Nunito } from 'next/font/google'
import { cn } from '@/lib/utils'
import './globals.css'

const fontHeading = Cormorant_Garamond({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-heading',
  weight: ['300', '400', '500', '600', '700']
})

const fontBody = Nunito({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
  weight: ['200', '300', '400', '500', '600', '700', '800', '900']
})

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
  }
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
        fontBody.variable
      )}>
        {children}
        <Analytics />
        <JsonLd data={websiteSchema} />
      </body>
    </html>
  );
}
