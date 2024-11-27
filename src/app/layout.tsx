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
    default: "Classical Virtues",
    template: "%s | Classical Virtues"
  },
  description: "Stories from the past, for the present, and into the future.",
  keywords: ["virtues", "classical stories", "moral stories", "ethics", "character building"],
  authors: [{ name: "Classical Virtues" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://classicalvirtues.com",
    siteName: "Classical Virtues",
    title: "Classical Virtues",
    description: "Stories from the past, for the present, and into the future.",
    images: [{
      url: "/api/og",
      width: 1200,
      height: 630,
      alt: "Classical Virtues"
    }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Classical Virtues",
    description: "Stories from the past, for the present, and into the future.",
    images: ["/api/og"]
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png"
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
        'min-h-screen bg-background font-body antialiased',
        fontHeading.variable,
        fontBody.variable
      )}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
