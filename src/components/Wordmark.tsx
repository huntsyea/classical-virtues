import { cn } from '@/lib/utils'

/**
 * The publication's logotype: "Classical" in roman, "Virtues" in the display
 * italic, set in Newsreader. Reads as one name to assistive tech.
 */
export default function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('font-heading tracking-[-0.015em]', className)}>
      Classical <span className="italic tracking-[-0.01em]">Virtues</span>
    </span>
  )
}
