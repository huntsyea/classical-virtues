'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * A horizontally scrolling strip (tabs, section names) for narrow screens.
 * On mount it brings the current item (`aria-current="page"`) into view, and
 * it marks whether there is more to scroll on either side so the edge fades
 * appear only when something is actually hidden. Without JavaScript it is a
 * plain scrollable list with a right-hand fade.
 */
export default function ScrollStrip({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLUListElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const current = el.querySelector<HTMLElement>('[aria-current="page"]')
    if (current && el.scrollWidth > el.clientWidth) {
      // Rects, not offsetLeft: list items are positioned, so offsets are local.
      const strip = el.getBoundingClientRect()
      const item = current.getBoundingClientRect()
      const left = el.scrollLeft + (item.left - strip.left) - (strip.width - item.width) / 2
      el.scrollLeft = Math.max(0, left)
    }
    const update = () => {
      const overflow = el.scrollWidth > el.clientWidth + 2
      el.dataset.atStart = String(!overflow || el.scrollLeft <= 2)
      el.dataset.atEnd = String(!overflow || el.scrollLeft + el.clientWidth >= el.scrollWidth - 2)
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      el.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return (
    <ul ref={ref} data-at-start="true" data-at-end="false" className={cn('scroller scroller-fade', className)}>
      {children}
    </ul>
  )
}
