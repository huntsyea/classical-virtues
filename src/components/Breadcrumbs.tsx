import Link from 'next/link'
import JsonLd from '@/components/JsonLd'

export default function Breadcrumbs({ title, slug }: { title: string; slug?: string }) {
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://classicalvirtues.com"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Stories",
        "item": "https://classicalvirtues.com/stories"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": title,
        ...(slug ? { "item": `https://classicalvirtues.com/stories/${slug}` } : {})
      }
    ]
  }

  return (
    <>
      <JsonLd data={breadcrumbSchema} />
      <nav aria-label="Breadcrumb" className="text-sm mb-6 text-muted-foreground">
        <Link href="/">Home</Link>
        <span className="mx-2" aria-hidden="true">/</span>
        <Link href="/stories">Stories</Link>
        <span className="mx-2" aria-hidden="true">/</span>
        <span aria-current="page">{title}</span>
      </nav>
    </>
  )
}
