import { cn } from '@/lib/utils'

/**
 * The collection's seal: a C and an italic V set in a lozenge, the same shape
 * as the mark that closes each story. Decorative; the wordmark carries the name.
 */
export default function Seal({ className, size = 44 }: { className?: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-flex items-center justify-center text-primary', className)}
      style={{ width: size, height: size }}
    >
      <span
        className="flex h-[72%] w-[72%] rotate-45 items-center justify-center border border-current"
      >
        <span
          className="-rotate-45 font-heading leading-none tracking-[-0.1em]"
          style={{ fontSize: size * 0.36 }}
        >
          C<span className="ml-[-0.04em] italic">V</span>
        </span>
      </span>
    </span>
  )
}
