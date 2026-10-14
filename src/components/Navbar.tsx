'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import ThemeToggle from '@/components/ThemeToggle'
import { roman } from '@/components/roman'
import Wordmark from '@/components/Wordmark'
import StorySearch from '@/components/search/StorySearch'

const links = [
  { href: '/stories', label: 'Stories' },
  { href: '/virtues', label: 'Virtues' },
  { href: '/about', label: 'About' },
]

export interface NavVirtue {
  slug: string
  title: string
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M3 6h14M3 10h14M3 14h14" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M5 5l10 10M15 5L5 15" />
    </svg>
  )
}

export function SearchIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="8.75" cy="8.75" r="5.25" />
      <path d="M12.75 12.75L17 17" />
    </svg>
  )
}

/**
 * Publication masthead. Sticky, with the wordmark centred. On the home page
 * the large masthead wordmark lives in the page itself; the header's copy
 * fades in only once that one has scrolled away, so the bar "condenses" the
 * masthead without shifting any layout.
 */
export default function Navbar({
  virtues = [],
  search,
}: {
  virtues?: NavVirtue[]
  /** Slot for a header search control; defaults to a link to the search page. */
  search?: ReactNode
}) {
  const pathname = usePathname() || '/'
  const isHome = pathname === '/'
  const [mastheadVisible, setMastheadVisible] = useState(true)
  const showMark = !isHome || !mastheadVisible
  const menuRef = useRef<HTMLDialogElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)

  // Reveal the header wordmark when the home masthead leaves the viewport.
  useEffect(() => {
    if (!isHome) return
    const masthead = document.getElementById('masthead')
    if (!masthead || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      ([entry]) => setMastheadVisible(entry.isIntersecting),
      { rootMargin: '-56px 0px 0px 0px', threshold: 0 },
    )
    io.observe(masthead)
    return () => io.disconnect()
  }, [isHome])

  // On story pages the bar steps aside while reading down and returns on any
  // scroll up, giving the text the whole screen.
  // Story pages only: not the /stories/virtue/* and /stories/narrated indexes.
  const isStory = /^\/stories\/(?!virtue\/|narrated$)[^/]+$/.test(pathname)
  const [tucked, setTucked] = useState(false)
  useEffect(() => {
    if (!isStory) return
    let frame = 0
    let lastY = window.scrollY
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const y = window.scrollY
        const menuOpen = menuRef.current?.open
        if (menuOpen || y < 160) setTucked(false)
        else if (y > lastY + 6) setTucked(true)
        else if (y < lastY - 6) setTucked(false)
        lastY = y
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
    }
  }, [isStory])
  const hidden = isStory && tucked

  // Close the menu on navigation, and send focus to the new page's content
  // rather than back to the menu button.
  const navigatedRef = useRef(false)
  useEffect(() => {
    if (menuRef.current?.open) {
      navigatedRef.current = true
      menuRef.current.close()
    }
  }, [pathname])

  function openMenu() {
    const dialog = menuRef.current
    if (!dialog) return
    dialog.showModal()
    document.documentElement.style.overflow = 'hidden'
  }

  function closeMenu() {
    menuRef.current?.close()
  }

  function onDialogClose() {
    document.documentElement.style.overflow = ''
    if (navigatedRef.current) {
      navigatedRef.current = false
      document.getElementById('main')?.focus({ preventScroll: true })
    } else {
      menuButtonRef.current?.focus()
    }
  }

  const searchSlot = search ?? (
    <Link
      href="/search"
      className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 text-sm transition-colors hover:text-primary"
    >
      <SearchIcon />
      <span className="sr-only lg:not-sr-only">Search</span>
    </Link>
  )

  return (
    <header
      className={cn(
        'paper-glass sticky top-0 z-40 border-b border-rule transition-transform duration-200 ease-out motion-reduce:transition-none',
        hidden && '-translate-y-full focus-within:translate-y-0',
      )}
    >
      <div aria-hidden="true" className="h-[3px] bg-primary" />
      <div className="page-wrap grid h-14 grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="flex items-center gap-1 lg:gap-5">
          <button
            ref={menuButtonRef}
            type="button"
            onClick={openMenu}
            aria-haspopup="dialog"
            aria-controls="site-menu"
            className="-ml-2.5 inline-flex min-h-11 min-w-11 items-center justify-center gap-2 text-sm transition-colors hover:text-primary lg:ml-0 lg:min-w-0"
          >
            <MenuIcon />
            <span className="sr-only">Menu</span>
          </button>
          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex items-center gap-6">
              {links.map(({ href, label }) => {
                const isCurrent = pathname === href
                const inSection = isCurrent || pathname.startsWith(`${href}/`)
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={isCurrent ? 'page' : undefined}
                      className={cn(
                        'inline-flex min-h-11 items-center text-sm underline-offset-[6px] transition-colors hover:text-primary',
                        inSection && 'underline decoration-1',
                      )}
                    >
                      {label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
        </div>

        <Link
          href="/"
          aria-label="Classical Virtues, home"
          tabIndex={showMark ? undefined : -1}
          aria-hidden={showMark ? undefined : true}
          className={cn(
            'inline-flex min-h-11 items-center transition-[opacity,transform] duration-300 ease-out',
            showMark ? 'opacity-100' : 'pointer-events-none translate-y-1 opacity-0',
          )}
        >
          <Wordmark className="text-[1.375rem] leading-none sm:text-[1.625rem]" />
        </Link>

        <div className="-mr-2.5 flex items-center justify-end gap-1 lg:mr-0 lg:gap-4">
          {searchSlot}
          <ThemeToggle />
        </div>
      </div>

      <dialog
        id="site-menu"
        ref={menuRef}
        aria-label="Site menu"
        onClose={onDialogClose}
        onClick={(e) => {
          // A click on the backdrop lands on the dialog element itself.
          if (e.target === e.currentTarget) closeMenu()
        }}
        className="menu-sheet"
      >
        <div className="flex h-full flex-col overflow-y-auto">
          <div aria-hidden="true" className="h-[3px] shrink-0 bg-primary" />
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-rule px-5">
            <Link href="/" onClick={closeMenu} className="inline-flex min-h-11 items-center">
              <Wordmark className="text-[1.375rem] leading-none" />
            </Link>
            <button
              type="button"
              onClick={closeMenu}
              className="-mr-2.5 inline-flex min-h-11 min-w-11 items-center justify-center hover:text-primary"
            >
              <CloseIcon />
              <span className="sr-only">Close menu</span>
            </button>
          </div>

          <div className="flex-1 px-5 pb-10 pt-6">
            <StorySearch placeholder="Search stories, virtues, sources" />

            <nav aria-label="Menu" className="mt-8">
              <ul className="border-t border-rule">
                {[{ href: '/', label: 'Home' }, ...links].map(({ href, label }) => (
                  <li key={href} className="border-b border-rule">
                    <Link
                      href={href}
                      onClick={closeMenu}
                      aria-current={pathname === href ? 'page' : undefined}
                      className="flex min-h-14 items-center font-heading text-[1.625rem] leading-none transition-colors hover:text-primary aria-[current=page]:text-primary"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {virtues.length > 0 && (
              <section aria-labelledby="menu-virtues" className="mt-10">
                <p id="menu-virtues" className="kicker font-body">
                  The seven virtues
                </p>
                <ul className="mt-3 grid grid-flow-col grid-cols-2 grid-rows-4 gap-x-6">
                  {virtues.map((virtue, i) => (
                    <li key={virtue.slug}>
                      <Link
                        href={`/virtues/${virtue.slug}`}
                        onClick={closeMenu}
                        className="flex min-h-11 items-baseline gap-2.5 py-1 text-[1.0625rem] transition-colors hover:text-primary"
                      >
                        <span aria-hidden="true" className="w-6 font-heading text-sm text-muted-foreground">
                          {roman(i + 1)}
                        </span>
                        <span className="font-heading text-lg">{virtue.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="mt-10 border-t border-rule pt-4">
              <ThemeToggle showLabel className="-ml-0.5 justify-start" />
            </div>
          </div>
        </div>
      </dialog>
    </header>
  )
}
