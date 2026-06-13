import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Page Not Found',
  description: 'The page you followed is not in the collection, but the stories are all still here.',
}

export default function NotFound() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-24 text-center">
      <h1 className="text-4xl sm:text-5xl font-heading mb-6">This page has wandered off</h1>
      <p className="mb-10 text-muted-foreground leading-relaxed">
        The page you followed is not in the collection, but the stories are all still here.
      </p>
      <p>
        <Link
          href="/stories"
          className="inline-block bg-primary text-primary-foreground px-8 py-4 hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Browse the stories
        </Link>
      </p>
      <p className="mt-6">
        <Link href="/" className="inline-block px-4 py-3 underline underline-offset-4 text-primary">
          Return home
        </Link>
      </p>
    </div>
  )
}
