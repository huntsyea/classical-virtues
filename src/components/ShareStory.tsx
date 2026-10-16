"use client";

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

type ShareState = 'idle' | 'copied';

/**
 * A restrained share affordance for story pages. On devices with the native
 * share sheet (mostly mobile) it opens that; everywhere else it copies the
 * link and quietly confirms. No counts, no logos, no "share to X": just a
 * way to pass a story along.
 */
export default function ShareStory({
  title,
  slug,
  className,
}: {
  title: string;
  slug: string;
  className?: string;
}) {
  const [state, setState] = useState<ShareState>('idle');

  const url = `https://classicalvirtues.com/stories/${slug}`;

  // Reset the "Link copied" confirmation after a short, calm pause.
  useEffect(() => {
    if (state !== 'copied') return;
    const timer = setTimeout(() => setState('idle'), 2500);
    return () => clearTimeout(timer);
  }, [state]);

  async function handleShare() {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text: `“${title}”: a story from Classical Virtues`, url });
        return;
      } catch (error) {
        // Dismissing the sheet is a choice, not a failure: do nothing.
        if ((error as DOMException)?.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setState('copied');
    } catch {
      // Clipboard unavailable (e.g. insecure context). Leave the label as-is.
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className={cn(
        'inline-flex min-h-11 items-center gap-2 font-body text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-foreground transition-colors hover:text-primary',
        className,
      )}
    >
      <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 12.5V3M6.5 6.5L10 3l3.5 3.5" />
        <path d="M6 9.5H4.5v7.5h11V9.5H14" />
      </svg>
      <span aria-live="polite">{state === 'copied' ? 'Link copied' : 'Share'}</span>
    </button>
  );
}

/** Print the story: the print stylesheet sets it as a clean page. */
export function PrintStory({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={cn(
        'inline-flex min-h-11 items-center gap-2 font-body text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-foreground transition-colors hover:text-primary',
        className,
      )}
    >
      <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
        <path d="M5.5 7.5V3h9v4.5" />
        <rect x="2.5" y="7.5" width="15" height="7" rx="1" />
        <path d="M5.5 12h9v5h-9z" fill="var(--background)" />
      </svg>
      Print
    </button>
  );
}
