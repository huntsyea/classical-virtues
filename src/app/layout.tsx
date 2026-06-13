import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next"
import { cn } from '@/lib/utils'
import ErrorBoundary from '@/components/ErrorBoundary'
import JsonLd from '@/components/JsonLd'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import './globals.css'
import { fontHeading, fontBody, fontText } from '@/lib/fonts'

export const metadata: Metadata = {
  metadataBase: new URL('https://classicalvirtues.com'),
  title: {
    default: "Classical Virtues | Timeless Stories of Character",
    template: "%s | Classical Virtues"
  },
  description: "Discover timeless virtues through classical stories. Our collection of moral tales teaches enduring values of character, ethics, and wisdom for modern times.",
  applicationName: "Classical Virtues",
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

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#eff0e6',
}

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://classicalvirtues.com/#organization",
  "name": "Classical Virtues",
  "url": "https://classicalvirtues.com",
  "logo": {
    "@type": "ImageObject",
    "url": "https://classicalvirtues.com/logo.png",
    "width": 512,
    "height": 512
  }
}

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://classicalvirtues.com/#website",
  "name": "Classical Virtues",
  "url": "https://classicalvirtues.com",
  "description": "Discover timeless virtues through classical stories. Our collection of moral tales teaches enduring values of character, ethics, and wisdom for modern times.",
  "inLanguage": "en",
  "publisher": {
    "@id": "https://classicalvirtues.com/#organization"
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={cn(
        'flex min-h-screen flex-col bg-background font-body antialiased',
        fontHeading.variable,
        fontBody.variable,
        fontText.variable,
        fontHeading.className || 'font-serif',
        fontBody.className || 'font-sans'
      )}>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-background focus:px-4 focus:py-3"
        >
          Skip to content
        </a>
        <Navbar />
        <main id="main" className="flex-1">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
        <Footer />
        <Analytics />
        <JsonLd data={websiteSchema} />
        <JsonLd data={organizationSchema} />
      </body>
    </html>
  );
}
