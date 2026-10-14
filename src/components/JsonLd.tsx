type JsonLdData = Record<string, unknown> | Record<string, unknown>[]

/**
 * Serialize schema.org data into a JSON-LD script tag. `<` is escaped so a
 * CMS string containing `</script>` can never break out of the tag.
 */
export default function JsonLd({ data }: { data: JsonLdData }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}
