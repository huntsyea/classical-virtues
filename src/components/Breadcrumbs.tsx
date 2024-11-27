import Link from 'next/link'

export default function Breadcrumbs({ title }: { title: string }) {
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "item": {
          "@id": "https://classicalvirtues.com",
          "name": "Home"
        }
      },
      {
        "@type": "ListItem",
        "position": 2,
        "item": {
          "@id": "https://classicalvirtues.com/stories",
          "name": "Stories"
        }
      },
      {
        "@type": "ListItem",
        "position": 3,
        "item": {
          "name": title
        }
      }
    ]
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <nav className="text-sm mb-6 text-muted-foreground">
        <Link href="/">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/stories">Stories</Link>
        <span className="mx-2">/</span>
        <span>{title}</span>
      </nav>
    </>
  )
} 