"use client";

import { useEffect, useState } from 'react';

type ShareState = 'idle' | 'copied';

/**
 * A restrained share affordance for story pages. On devices with the native
 * share sheet (mostly mobile) it opens that; everywhere else it copies the
 * link and quietly confirms. No counts, no logos, no "share to X": just a
 * way to pass a story along.
 */
export default function ShareStory({ title, slug }: { title: string; slug: string }) {
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
      } catch {
        // The reader dismissed the sheet, or it failed. Fall through to copy.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setState('copied');
    } catch {
      // Clipboard unavailable (e.g. insecure context). Leave the label as-is.
    }
  }

  const label = state === 'copied' ? 'Link copied' : 'Share this story';

  return (
    <div className="mt-12 flex justify-center">
      <button
        type="button"
        onClick={handleShare}
        aria-live="polite"
        className="text-sm text-muted-foreground underline underline-offset-4 decoration-muted-foreground/40 hover:text-foreground hover:decoration-foreground transition-colors py-2"
      >
        {label}
      </button>
    </div>
  );
}
