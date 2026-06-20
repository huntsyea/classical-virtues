# SEO Contract

Standing rule for Classical Virtues. Derived from the **SEO Boundary** in
`@writing.md`; read this with `@writing.md` and `@PRODUCT.md`. This contract is
binding on Quinn (SEO), Margaret (Managing Editor), and Quill (writer), and on
any engineering work that touches story rendering, metadata, or structured data.

## Principle

SEO serves discoverability. It does not control the reading experience. The
public reading experience is anthology-first: a story must never read like an
SEO article. When ranking advice conflicts with story quality, the metadata /
structured-data path wins and Margaret decides the final editorial treatment.

## Allowed SEO surfaces

Search optimization lives **outside the story body**, in these surfaces only:

- **Slug** — short, lowercase, hyphenated, keyword-bearing, stable. Never change
  a live slug without a redirect plan (escalate to engineering).
- **Metadata title** — rendered from the story `title` via the
  `%s | Classical Virtues` template. Keep titles anthology-clean, not SEO
  subtitles.
- **Meta description** — rendered from the story `summary`. This is the only
  reader-facing copy that doubles as the search snippet.
- **Summary** — short reader-facing summary used for cards and metadata.
- **Structured data (JSON-LD)** — Article, BreadcrumbList, ItemList, WebSite,
  Organization, AudioObject. Keywords, author, and publisher signals live here.
- **OpenGraph / Twitter cards + OG image** — title, description, and the
  generated `/api/og` image.
- **Internal-link recommendations** — proposed outside the story body (related
  navigation is supplied by the site template, not written into the prose).
- **Brief notes** — search intent, target terms, and link maps for the editor
  and writer.

## Forbidden in the story body

The `content` field is **narrative only**. None of the following may appear
inside a story body:

- headings like `What is the moral of...`;
- FAQ / "people also ask" / snippet copy that interrupts the tale;
- forced phrases such as `story for kids` or `read aloud to your kids`;
- keyword-stuffed first paragraphs or keyword lists;
- related-reading / "you may also like" blocks;
- a duplicate moral heading (the moral lives once, in `virtueDescription`,
  rendered as the "The Moral of the Story" card);
- title subtitles added only for search.

## Roles

- **Quinn** recommends target terms, search intent, slugs, metadata copy, and
  internal-link maps; runs pre-publish SEO QA against this contract.
- **Margaret** decides how that guidance enters published content and owns the
  final editorial treatment.
- **Quill** keeps the story voice intact and the body free of SEO scaffolding.
- **Engineering** owns how metadata and structured data are implemented; Quinn
  specifies the SEO outcome, not the code.

## Pre-publish check (SEO half)

Before a story ships, confirm: slug is clean and stable; metadata title is
anthology-clean; meta description / summary reads naturally and fits the snippet;
structured data is present and correct; image alt text is meaningful; internal
links are recommended outside the body; and **the story body contains zero SEO
scaffolding** from the forbidden list above.
