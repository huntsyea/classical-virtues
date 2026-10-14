'use client'

import { useEffect, useRef } from 'react'

/**
 * A hairline of olive along the top of the viewport that fills as the reader
 * moves through the story body. Purely visual (aria-hidden): the scrollbar and
 * the text itself already tell assistive tech where the reader is. Drawn with a
 * transform so it never triggers layout.
 */
export default function ReadingProgress({ targetId }: { targetId: string }) {
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const target = document.getElementById(targetId)
    const bar = barRef.current
    if (!target || !bar) return

    let frame = 0
    const update = () => {
      frame = 0
      const rect = target.getBoundingClientRect()
      const viewport = window.innerHeight
      const total = rect.height - viewport * 0.6
      const read = -rect.top + viewport * 0.25
      const progress = total > 0 ? Math.min(1, Math.max(0, read / total)) : 0
      bar.style.transform = `scaleX(${progress})`
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [targetId])

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[45] h-[3px]">
      <div
        ref={barRef}
        className="h-full origin-left bg-foreground"
        style={{ transform: 'scaleX(0)' }}
      />
    </div>
  )
}
