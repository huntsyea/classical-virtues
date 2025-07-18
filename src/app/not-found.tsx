import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-8">
      <h1 className="text-5xl font-heading mb-4">Page Not Found</h1>
      <p className="mb-8 text-muted-foreground">The page you are looking for does not exist.</p>
      <Link href="/" className="underline text-primary">
        Return Home
      </Link>
    </div>
  )
}
