'use client'

import { useSyncExternalStore } from 'react'
import { cn } from '@/lib/utils'
import { THEME_COLORS, THEME_KEY } from '@/components/theme'

function applyTheme(dark: boolean) {
  const root = document.documentElement
  root.classList.toggle('dark', dark)
  const color = dark ? THEME_COLORS.dark : THEME_COLORS.light
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => meta.setAttribute('content', color))
}

function isDark() {
  return document.documentElement.classList.contains('dark')
}

/** Re-render whenever the root `dark` class changes, from any toggle. */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => observer.disconnect()
}

/**
 * "Night reading" switch: warm dark paper for bedtime. A real toggle button
 * (aria-pressed) with a text label, so its state is never icon-only.
 */
export default function ThemeToggle({
  className,
  showLabel = false,
}: {
  className?: string
  showLabel?: boolean
}) {
  const dark = useSyncExternalStore(subscribe, isDark, () => false)

  function toggle() {
    const next = !document.documentElement.classList.contains('dark')
    applyTheme(next)
    try {
      localStorage.setItem(THEME_KEY, next ? 'dark' : 'light')
    } catch {
      // Storage unavailable; the choice lasts for this page only.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={dark}
      className={cn(
        'inline-flex min-h-11 min-w-11 items-center justify-center gap-2 text-sm text-foreground transition-colors hover:text-primary',
        className,
      )}
    >
      <svg
        viewBox="0 0 20 20"
        width="18"
        height="18"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* A crescent that fills when night reading is on. */}
        <path
          d="M16.5 12.2A7 7 0 0 1 7.8 3.5a7 7 0 1 0 8.7 8.7Z"
          fill={dark ? 'currentColor' : 'none'}
        />
      </svg>
      <span className={showLabel ? '' : 'sr-only'}>Night reading</span>
    </button>
  )
}
