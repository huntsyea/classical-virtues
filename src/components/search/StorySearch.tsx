'use client'

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { searchDocs, type SearchDoc } from '@/lib/search'

/**
 * Story search box.
 *
 * - Without JavaScript it is a plain GET form to `/search?q=`, which renders
 *   results on the server.
 * - With JavaScript it becomes an ARIA combobox with instant results. The index
 *   (`/api/search-index`) loads on first focus. Queries go to Basehub Search
 *   with the collection's public `_searchKey` when the server reports it is
 *   live; otherwise they run against the bundled local index.
 */

type IndexPayload = { searchKey: string | null; docs: SearchDoc[] }

let indexPromise: Promise<IndexPayload> | null = null
function loadIndex(): Promise<IndexPayload> {
  indexPromise ??= fetch('/api/search-index')
    .then((r) => (r.ok ? (r.json() as Promise<IndexPayload>) : { searchKey: null, docs: [] }))
    .catch(() => {
      indexPromise = null
      return { searchKey: null, docs: [] }
    })
  return indexPromise
}

let basehubFailed = false
async function queryBasehub(index: IndexPayload, q: string): Promise<SearchDoc[] | null> {
  if (!index.searchKey || basehubFailed) return null
  try {
    const { search } = await import('basehub/search')
    const result = await search<Record<string, unknown>>(index.searchKey, q, {
      queryBy: ['_title', 'summary', 'virtue', 'source', 'content'],
      perPage: 8,
    })
    const bySlug = new Map(index.docs.map((d) => [d.slug, d]))
    const docs = result.hits
      .map((hit) => bySlug.get(hit.document._slug ?? ''))
      .filter((d): d is SearchDoc => Boolean(d))
    return docs.length ? docs : null
  } catch {
    basehubFailed = true
    return null
  }
}

async function runSearch(q: string): Promise<SearchDoc[]> {
  const index = await loadIndex()
  return (await queryBasehub(index, q)) ?? searchDocs(index.docs, q, 8).map((m) => m.doc)
}

interface StorySearchProps {
  /** Prefill (the `/search` page passes the current `q`). */
  initialQuery?: string
  placeholder?: string
  /** Visible label text; hidden visually unless `showLabel`. */
  label?: string
  showLabel?: boolean
  className?: string
}

export default function StorySearch({
  initialQuery = '',
  placeholder = 'Search stories, virtues, sources',
  label = 'Search the stories',
  showLabel = false,
  className = '',
}: StorySearchProps) {
  const router = useRouter()
  const id = useId()
  const inputId = `${id}-input`
  const listId = `${id}-list`
  const [query, setQuery] = useState(initialQuery)
  // Results are stored with the query they answer, so stale ones never show.
  const [answer, setAnswer] = useState<{ q: string; docs: SearchDoc[] }>({ q: '', docs: [] })
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const requestRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const rootRef = useRef<HTMLFormElement>(null)

  const trimmed = query.trim()
  const searched = trimmed !== '' && answer.q === trimmed
  const results = searched ? answer.docs : []

  function scheduleSearch(value: string) {
    clearTimeout(timerRef.current)
    const q = value.trim()
    if (!q) return
    const request = ++requestRef.current
    timerRef.current = setTimeout(async () => {
      const docs = await runSearch(q)
      if (request !== requestRef.current) return
      setAnswer({ q, docs })
      setActive(-1)
    }, 120)
  }

  useEffect(() => () => clearTimeout(timerRef.current), [])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const showList = open && searched

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const q = query.trim()
    if (active >= 0 && results[active]) {
      router.push(`/stories/${results[active].slug}`)
    } else if (q) {
      router.push(`/search?q=${encodeURIComponent(q)}`)
    }
    setOpen(false)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActive((i) => (results.length ? (i + 1) % results.length : -1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((i) => (results.length ? (i <= 0 ? results.length - 1 : i - 1) : -1))
    } else if (event.key === 'Escape') {
      if (open) {
        event.preventDefault()
        setOpen(false)
        setActive(-1)
      } else {
        setQuery('')
      }
    }
  }

  const status = !searched
    ? ''
    : results.length
      ? `${results.length} ${results.length === 1 ? 'story' : 'stories'} found`
      : 'No stories match'

  return (
    <form
      ref={rootRef}
      role="search"
      action="/search"
      method="get"
      onSubmit={onSubmit}
      className={`relative ${className}`}
    >
      <label htmlFor={inputId} className={showLabel ? 'mb-2 block text-sm text-muted-foreground' : 'sr-only'}>
        {label}
      </label>
      <input
        id={inputId}
        type="search"
        name="q"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          scheduleSearch(e.target.value)
        }}
        onFocus={() => {
          void loadIndex()
          setOpen(true)
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="search"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        className="w-full min-h-11 border border-border bg-background px-4 py-2.5 text-base text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      />
      <p aria-live="polite" className="sr-only">
        {status}
      </p>
      <ul
        id={listId}
        role="listbox"
        aria-label="Matching stories"
        hidden={!showList}
        className="absolute inset-x-0 top-full z-40 mt-1 max-h-[70vh] overflow-y-auto border border-border bg-background shadow-lg"
      >
        {results.map((doc, i) => (
          <li key={doc.slug} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
            <Link
              href={`/stories/${doc.slug}`}
              tabIndex={-1}
              onClick={() => setOpen(false)}
              onPointerEnter={() => setActive(i)}
              className={`block border-b border-border px-4 py-3 last:border-b-0 ${i === active ? 'bg-muted' : ''}`}
            >
              <span className="block font-heading text-lg leading-snug text-foreground">{doc.title}</span>
              <span className="mt-0.5 block text-sm text-muted-foreground">
                {[doc.canonicalVirtue ?? doc.virtue, `${doc.readAloudMinutes} min`, doc.hasAudio ? 'Narrated' : null]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </Link>
          </li>
        ))}
        {showList && results.length === 0 && (
          <li role="presentation" className="px-4 py-3 text-sm text-muted-foreground">
            No stories match &ldquo;{query.trim()}&rdquo;.
          </li>
        )}
      </ul>
    </form>
  )
}
