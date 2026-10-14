import { cn } from '@/lib/utils'

/**
 * A printer's rule: two hairlines and a lozenge, the same mark that closes
 * each story. Decorative only.
 */
export default function Ornament({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 132 12"
      width="132"
      height="12"
      aria-hidden="true"
      className={cn('block', className)}
    >
      <path d="M0 6h52M80 6h52" stroke="currentColor" strokeWidth="1" />
      <path d="M66 1.2 70.8 6 66 10.8 61.2 6Z" fill="currentColor" />
      <circle cx="56.5" cy="6" r="1.1" fill="currentColor" />
      <circle cx="75.5" cy="6" r="1.1" fill="currentColor" />
    </svg>
  )
}
