import type { Metadata } from "next";
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
  title: "Classical Virtues",
  description: "Stories from the past, for the present, and into the future.",
};

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
      </body>
    </html>
  );
}
