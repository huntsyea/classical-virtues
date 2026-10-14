"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BaseHubImage as Image } from 'basehub/next-image';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { smartQuotes } from '@/components/typography';
import { clearPosition, formatTime, listenLabels, readPosition, RESUME_EDGE_SECONDS, savePosition } from '@/components/narration-utils';
import {
  getNarrationAudio,
  getNarrationButton,
  setNarrationController,
} from '@/components/narration-store';
import { RotateCcw, RotateCw } from 'lucide-react';

export interface AudioPlayerProps {
  audioUrl: string;
  title: string;
  image: string;
  /** Narration length in seconds, when the CMS knows it (shown before load). */
  durationHint?: number | null;
  /** A short label under the title in the desktop bar (the story's virtue). */
  label?: string;
}

const SKIP_SECONDS = 15;
const RATE_KEY = 'cv:audio-rate';
const SAVE_INTERVAL_SECONDS = 5;
const RATES = [1, 1.25, 1.5, 0.75] as const;

function readRate(): number {
  try {
    const value = Number.parseFloat(window.localStorage.getItem(RATE_KEY) ?? '1');
    return (RATES as readonly number[]).includes(value) ? value : 1;
  } catch {
    return 1;
  }
}

function spokenTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0 seconds';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (m) parts.push(`${m} ${m === 1 ? 'minute' : 'minutes'}`);
  parts.push(`${s} ${s === 1 ? 'second' : 'seconds'}`);
  return parts.join(' ');
}

function rateLabel(rate: number): string {
  return `${rate}×`;
}

/**
 * Lock-screen artwork. Basehub's asset CDN crops to a true square
 * (`width`/`height`/`fit=cover`), which is what lock screens expect. Other
 * hosts go through the Next optimizer, which keeps the painting's 3:2 shape,
 * so their declared sizes say 3:2 rather than claiming a square.
 */
function artworkFor(image: string): MediaImage[] {
  if (!image) return [];
  try {
    const url = new URL(image);
    if (url.hostname === 'assets.basehub.com') {
      return [256, 512].map((size) => {
        const square = new URL(image);
        square.searchParams.set('width', String(size));
        square.searchParams.set('height', String(size));
        square.searchParams.set('fit', 'cover');
        return { src: square.toString(), sizes: `${size}x${size}` };
      });
    }
  } catch {
    // Relative or malformed URL: fall through to the optimizer.
  }
  const src = (w: number) => `/_next/image?url=${encodeURIComponent(image)}&w=${w}&q=75`;
  return [
    { src: src(256), sizes: '256x171' },
    { src: src(640), sizes: '640x427' },
  ];
}

/* ---------- Icons (stroke icons drawn to the type, not a stock set) ---------- */

function PlayGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={className} fill="currentColor">
      <path d="M6.5 4.4v11.2a.6.6 0 0 0 .92.5l8.6-5.6a.6.6 0 0 0 0-1L7.42 3.9a.6.6 0 0 0-.92.5Z" />
    </svg>
  );
}

function PauseGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={className} fill="currentColor">
      <rect x="5" y="4" width="3.4" height="12" rx=".6" />
      <rect x="11.6" y="4" width="3.4" height="12" rx=".6" />
    </svg>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={cn('animate-spin motion-reduce:animate-none', className)} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M10 3a7 7 0 1 1-7 7" strokeLinecap="round" />
    </svg>
  );
}

function SkipGlyph({ direction }: { direction: 'back' | 'forward' }) {
  const Arc = direction === 'back' ? RotateCcw : RotateCw;
  return (
    <span className="relative inline-flex h-7 w-7 items-center justify-center" aria-hidden="true">
      <Arc className="h-7 w-7" strokeWidth={1.4} />
      <span className="absolute inset-0 flex items-center justify-center pt-px font-body text-[0.5625rem] font-semibold tabular-nums leading-none">
        {SKIP_SECONDS}
      </span>
    </span>
  );
}

function CloseGlyph() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" />
    </svg>
  );
}

/**
 * Story narration.
 *
 * Renders an inline "Listen" control where it is placed (beside the headline),
 * and once playback starts, a persistent mini-player fixed to the bottom of the
 * viewport, inside the thumb zone on a phone. Both share one <audio> element.
 *
 * - preload="none": nothing downloads until the reader presses play.
 * - Resume: position is saved per story in localStorage and restored on play.
 * - Playback speed persists across stories.
 * - Media Session: lock-screen title, artwork, play/pause, and 15s skips.
 * - Every state change is announced through a polite live region.
 */
export default function AudioPlayer({ audioUrl, title: rawTitle, image, durationHint, label }: AudioPlayerProps) {
  const title = smartQuotes(rawTitle);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const lastSavedRef = useRef(0);
  const pendingResumeRef = useRef<number | null>(null);
  const closingRef = useRef(false);

  // The <audio> element belongs to the Listen control and may already be
  // playing (a tap before this UI loaded), so initial state comes from it.
  const [initial] = useState(() => {
    // The element is the truth: a tap that was paused (or refused) before
    // this loaded leaves it paused at 0, and no player bar appears.
    const audio = getNarrationAudio();
    return {
      playing: Boolean(audio && !audio.paused),
      buffering: Boolean(audio && !audio.paused && audio.readyState < 3),
      started: Boolean(audio && (!audio.paused || audio.currentTime > 0)),
      time: audio?.currentTime ?? 0,
      duration: audio && Number.isFinite(audio.duration) ? audio.duration : 0,
      loaded: Boolean(audio && audio.readyState >= 1),
    };
  });
  const [started, setStarted] = useState(initial.started);
  const [dismissed, setDismissed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(initial.playing);
  const [isBuffering, setIsBuffering] = useState(initial.buffering);
  const [currentTime, setCurrentTime] = useState(initial.time);
  const [duration, setDuration] = useState<number>(initial.duration || (durationHint && durationHint > 0 ? durationHint : 0));
  const [isLoaded, setIsLoaded] = useState(initial.loaded);
  // Client-only component (loaded with ssr: false), so storage is safe to read here.
  const [rate, setRate] = useState(readRate);
  const [resumeAt, setResumeAt] = useState<number | null>(() => readPosition(audioUrl));
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  // Announce an early start after mount: a live region that mounts with text
  // already in it is not read by most screen readers.
  useEffect(() => {
    if (!initial.playing) return;
    const frame = requestAnimationFrame(() => setStatus(initial.buffering ? 'Loading' : 'Playing'));
    return () => cancelAnimationFrame(frame);
  }, [initial.playing, initial.buffering]);

  const showBar = started && !dismissed;
  const [inlinePassed, setInlinePassed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Once the inline Listen control scrolls up out of view (and nothing is
  // playing yet), a compact Listen pill stays within thumb reach, but only
  // while it is wanted: for the first stretch after the control leaves, and
  // whenever the reader scrolls back up. A parent reading aloud who keeps
  // scrolling down is never left with a button sitting on the text.
  const [pillWanted, setPillWanted] = useState(false);
  useEffect(() => {
    const el = getNarrationButton();
    if (!el) return;
    let passedAt: number | null = null;
    let lastY = window.scrollY;
    let frame = 0;
    const evaluate = () => {
      frame = 0;
      const y = window.scrollY;
      const rect = el.getBoundingClientRect();
      const passed = rect.bottom < 0;
      if (!passed) {
        passedAt = null;
        setInlinePassed(false);
        setPillWanted(false);
      } else {
        if (passedAt === null) passedAt = y;
        setInlinePassed(true);
        const early = y - passedAt < window.innerHeight * 1.5;
        if (y < lastY - 4) setPillWanted(true);
        else if (y > lastY + 4) setPillWanted(early);
      }
      lastY = y;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(evaluate);
    };
    evaluate();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  // Attach to the story's one <audio preload="none"> element (rendered by the
  // Listen control); nothing downloads until play.
  useEffect(() => {
    const audio = getNarrationAudio();
    if (!audio) return;
    audioRef.current = audio;

    const onLoadedMetadata = () => {
      if (Number.isFinite(audio.duration)) setDuration(audio.duration);
      setIsLoaded(true);
      setError(null);
      const resume = pendingResumeRef.current;
      if (resume !== null && Number.isFinite(audio.duration) && resume < audio.duration - RESUME_EDGE_SECONDS) {
        audio.currentTime = resume;
        lastSavedRef.current = resume;
        setCurrentTime(resume);
      }
      pendingResumeRef.current = null;
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (Math.abs(audio.currentTime - lastSavedRef.current) >= SAVE_INTERVAL_SECONDS) {
        lastSavedRef.current = audio.currentTime;
        savePosition(audioUrl, audio.currentTime);
      }
      if ('mediaSession' in navigator && Number.isFinite(audio.duration) && navigator.mediaSession.setPositionState) {
        try {
          navigator.mediaSession.setPositionState({
            duration: audio.duration,
            playbackRate: audio.playbackRate,
            position: Math.min(audio.currentTime, audio.duration),
          });
        } catch {
          // Some browsers reject position updates mid-seek; harmless.
        }
      }
    };

    const onPlay = () => {
      setIsPlaying(true);
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
    };
    const onPlaying = () => {
      setIsBuffering(false);
      setStatus('Playing');
    };
    const onWaiting = () => {
      setIsBuffering(true);
      setStatus('Loading');
    };
    const onCanPlay = () => setIsBuffering(false);
    const onPause = () => {
      setIsPlaying(false);
      setIsBuffering(false);
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
      if (!audio.ended) {
        // A pause caused by closing the player is announced as the close.
        if (!closingRef.current) setStatus(`Paused at ${spokenTime(audio.currentTime)}`);
        if (audio.currentTime > RESUME_EDGE_SECONDS) {
          lastSavedRef.current = audio.currentTime;
          savePosition(audioUrl, audio.currentTime);
          setResumeAt(audio.currentTime);
        }
      }
      closingRef.current = false;
    };
    const onEnded = () => {
      setIsPlaying(false);
      setIsBuffering(false);
      audio.currentTime = 0;
      lastSavedRef.current = 0;
      setCurrentTime(0);
      setResumeAt(null);
      clearPosition(audioUrl);
      setStatus('The story has finished');
    };
    const onError = () => {
      if (!audio.getAttribute('src')) return;
      setError('The narration could not be loaded.');
      setIsLoaded(false);
      setIsPlaying(false);
      setIsBuffering(false);
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      if (audio.currentTime > RESUME_EDGE_SECONDS && !audio.ended) {
        savePosition(audioUrl, audio.currentTime);
      }
      audioRef.current = null;
    };
  }, [audioUrl]);

  // Keep the element's speed in step with state.
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, [rate]);

  const seekTo = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration)) return;
    const next = Math.min(Math.max(0, time), audio.duration);
    audio.currentTime = next;
    setCurrentTime(next);
  }, []);

  const seekBy = useCallback((delta: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    seekTo(audio.currentTime + delta);
    setStatus(delta < 0 ? `Back ${SKIP_SECONDS} seconds` : `Forward ${SKIP_SECONDS} seconds`);
  }, [seekTo]);

  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    setStarted(true);
    setDismissed(false);
    setError(null);
    if (!isLoaded && audio.readyState === 0) {
      pendingResumeRef.current = readPosition(audioUrl);
    }
    audio.playbackRate = rate;
    try {
      setIsBuffering(true);
      setStatus('Loading');
      await audio.play();
    } catch (playError) {
      if ((playError as DOMException)?.name === 'AbortError') return;
      setError('Playback could not start.');
      setIsBuffering(false);
    }
  }, [audioUrl, isLoaded, rate]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) pause();
    else void play();
  }, [isPlaying, pause, play]);

  // Take over the Listen button: its taps now come here.
  useEffect(() => {
    setNarrationController({ toggle });
    return () => setNarrationController(null);
  }, [toggle]);

  // Keyboard, once the narration has started: K toggles anywhere; J and L
  // skip 15 seconds while it plays (or from inside the player). Arrow keys
  // and Space act only with focus inside the player, so the page keeps its
  // own scrolling keys. Never while typing, on a slider, or in the menu.
  useEffect(() => {
    if (!started || dismissed) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"], [role="slider"], dialog[open]')) return;
      const inPlayer = Boolean(target?.closest('[aria-label="Narration player"]'));
      const key = event.key.toLowerCase();
      const act = (fn: () => void) => {
        event.preventDefault();
        fn();
      };
      if (key === 'k') act(toggle);
      else if (key === ' ' && inPlayer && target?.tagName !== 'BUTTON') act(toggle);
      else if (key === 'j' && (isPlaying || inPlayer)) act(() => seekBy(-SKIP_SECONDS));
      else if (key === 'l' && (isPlaying || inPlayer)) act(() => seekBy(SKIP_SECONDS));
      else if (key === 'arrowleft' && inPlayer) act(() => seekBy(-SKIP_SECONDS));
      else if (key === 'arrowright' && inPlayer) act(() => seekBy(SKIP_SECONDS));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [started, dismissed, isPlaying, toggle, seekBy]);

  // Media Session: lock screen and headset controls, with artwork.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    // Narration may already be playing (started before this UI loaded).
    navigator.mediaSession.playbackState = audioRef.current && !audioRef.current.paused ? 'playing' : 'paused';
    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist: 'Classical Virtues',
      album: 'Stories for reading aloud',
      artwork: artworkFor(image),
    });
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => void play()],
      ['pause', () => pause()],
      ['seekbackward', () => seekBy(-SKIP_SECONDS)],
      ['seekforward', () => seekBy(SKIP_SECONDS)],
      ['seekto', (details) => {
        if (details.seekTime != null) seekTo(details.seekTime);
      }],
      ['stop', () => pause()],
    ];
    for (const [action, handler] of handlers) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Action unsupported in this browser.
      }
    }
    return () => {
      for (const [action] of handlers) {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {
          // Ignore.
        }
      }
    };
  }, [title, image, play, pause, seekBy, seekTo]);

  // Reserve room at the bottom of the page for the mini-player.
  useLayoutEffect(() => {
    const root = document.documentElement;
    const bar = barRef.current;
    if (!showBar || !bar) {
      root.style.setProperty('--player-h', '0px');
      return;
    }
    const update = () => root.style.setProperty('--player-h', `${bar.offsetHeight}px`);
    update();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    ro?.observe(bar);
    return () => {
      ro?.disconnect();
      root.style.setProperty('--player-h', '0px');
    };
  }, [showBar]);

  function cycleRate() {
    const index = (RATES as readonly number[]).indexOf(rate);
    const next = RATES[(index + 1) % RATES.length];
    setRate(next);
    setStatus(`Speed ${next} times`);
    try {
      window.localStorage.setItem(RATE_KEY, String(next));
    } catch {
      // Ignore.
    }
  }

  function dismiss() {
    closingRef.current = Boolean(audioRef.current && !audioRef.current.paused);
    pause();
    setExpanded(false);
    // Keep focus where the reader is: the inline control if it is on screen.
    // Never scroll; the bar is about to unmount.
    requestAnimationFrame(() => {
      const button = getNarrationButton();
      const rect = button?.getBoundingClientRect();
      const onScreen = rect && rect.bottom > 0 && rect.top < window.innerHeight;
      if (button && onScreen) {
        button.focus({ preventScroll: true });
        return;
      }
      // Otherwise the first story paragraph or end-of-story heading (the
      // moral, Read next, the footer) whose top is on screen. Never anything
      // that starts above the viewport or below it.
      const candidates = Array.from(
        document.querySelectorAll<HTMLElement>('#story-body > p, [data-after-story]'),
      );
      const inView = (el: HTMLElement) => {
        const r = el.getBoundingClientRect();
        return r.top >= 0 && r.top < window.innerHeight - 40;
      };
      // A paragraph taller than the screen: the one being read.
      const spanning = (el: HTMLElement) => {
        const r = el.getBoundingClientRect();
        return r.top < 0 && r.bottom > window.innerHeight;
      };
      const target = candidates.find(inView) ?? candidates.find(spanning);
      if (!target) return;
      if (target.tagName === 'P') {
        target.setAttribute('tabindex', '-1');
        target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
      }
      target.focus({ preventScroll: true });
    });
    setDismissed(true);
    setStatus('Narration closed. Listen again from the button under the title.');
  }

  function retry() {
    setError(null);
    setStatus('');
    audioRef.current?.load();
    void play();
  }

  const knownDuration = duration > 0 ? duration : 0;
  const { label: inlineLabel, detail: inlineDetail } = listenLabels({
    isPlaying,
    started,
    currentTime,
    resumeAt,
    duration: knownDuration,
  });

  const playIcon = (size: string) =>
    isBuffering ? <Spinner className={size} /> : isPlaying ? <PauseGlyph className={size} /> : <PlayGlyph className={size} />;

  const progress = knownDuration ? Math.min(1, currentTime / knownDuration) : 0;
  // Once the reader closes the narration, the pill stays away for this page
  // view; only a new tap on the inline control brings audio back.
  const showPill = !showBar && !dismissed && inlinePassed && pillWanted && !error;
  // Same name grammar as the inline control: "Narration of <title>: Listen".
  const inlineAria = `Narration of ${title}: ${inlineLabel}`;

  const transportButton = (size: 'sm' | 'lg') => (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-transform active:scale-95',
        size === 'lg' ? 'h-12 w-12' : 'h-11 w-11',
      )}
    >
      {playIcon('h-5 w-5')}
      <span className="sr-only">{isPlaying ? 'Pause' : 'Play'}</span>
    </button>
  );

  const skipButton = (direction: 'back' | 'forward') => (
    <button
      type="button"
      onClick={() => seekBy(direction === 'back' ? -SKIP_SECONDS : SKIP_SECONDS)}
      disabled={!isLoaded}
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center transition-colors hover:text-primary disabled:opacity-40"
    >
      <SkipGlyph direction={direction} />
      <span className="sr-only">{direction === 'back' ? 'Back' : 'Forward'} {SKIP_SECONDS} seconds</span>
    </button>
  );

  const speedButton = (
    <button
      type="button"
      onClick={cycleRate}
      aria-label={`Playback speed ${rateLabel(rate)}, change speed`}
      className="inline-flex h-11 min-w-11 shrink-0 items-center justify-center px-1 font-body text-sm font-semibold tabular-nums hover:text-primary"
    >
      {rateLabel(rate)}
    </button>
  );

  const closeButton = (
    <button
      type="button"
      onClick={dismiss}
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center transition-colors hover:text-primary"
    >
      <CloseGlyph />
      <span className="sr-only">Close player</span>
    </button>
  );

  const scrubber = (
    <div className="flex items-center gap-3">
      <span className="meta w-10 shrink-0 text-xs md:text-[0.8125rem]">{formatTime(currentTime)}</span>
      <Slider
        value={[currentTime]}
        min={0}
        max={knownDuration || 100}
        step={1}
        onValueChange={(v) => seekTo(v[0])}
        disabled={!isLoaded}
        aria-label="Position in the narration"
        aria-valuetext={`${spokenTime(currentTime)} of ${spokenTime(knownDuration)}`}
        className="flex-1"
      />
      <span className="meta w-10 shrink-0 text-right text-xs md:text-[0.8125rem]">
        {knownDuration ? formatTime(knownDuration) : '--:--'}
      </span>
    </div>
  );

  const artwork = (box: string) =>
    image ? (
      <div className={cn('image-well shrink-0', box)}>
        <Image src={image} alt="" fill sizes="48px" className="object-cover" />
      </div>
    ) : null;

  return (
    <>
      <p aria-live="polite" role="status" className="sr-only">
        {error ?? status}
      </p>

      {error && !showBar && (
        <p role="alert" className="meta mt-2 text-destructive">
          {error}{' '}
          <button type="button" onClick={retry} className="text-link inline-flex min-h-11 items-center">
            Try again
          </button>
        </p>
      )}

      {/* Ready state: a Listen pill in the thumb zone once the control scrolls away. */}
      {inlinePassed && !showBar && (
        <button
          type="button"
          onClick={() => void play()}
          aria-label={inlineAria}
          aria-hidden={showPill ? undefined : true}
          tabIndex={showPill ? undefined : -1}
          className={cn(
            "fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-40 inline-flex h-12 items-center gap-2.5 rounded-full bg-foreground pl-1.5 pr-5 text-background shadow-[0_4px_16px_-8px_rgb(20_18_14/0.4)] transition-[opacity,transform] delay-150 duration-200 ease-out md:hidden",
            showPill ? "opacity-100" : "pointer-events-none translate-y-2 opacity-0 delay-0",
          )}
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-background text-foreground">
            <PlayGlyph className="h-4 w-4" />
          </span>
          <span className="font-body text-[0.9375rem] font-medium">{inlineLabel}</span>
          <span className="font-body text-sm tabular-nums opacity-75" aria-hidden="true">{inlineDetail}</span>
        </button>
      )}

      {/* Persistent mini-player */}
      {showBar && (
        <div
          ref={barRef}
          role="region"
          aria-label="Narration player"
          className="fixed inset-x-0 bottom-0 z-50 border-t border-rule-strong bg-background pb-[env(safe-area-inset-bottom)] motion-safe:animate-[rise-in_0.32s_cubic-bezier(0.2,0.7,0.2,1)]"
        >
          {/* Progress hairline along the top edge (compact phone layout) */}
          <div aria-hidden="true" className="absolute inset-x-0 -top-px h-[2px] bg-rule md:hidden">
            <div className="h-full origin-left bg-primary" style={{ transform: `scaleX(${progress})` }} />
          </div>
          <div className="page-wrap">
            {error ? (
              <div role="alert" className="flex min-h-16 items-center justify-between gap-4 py-3">
                <p className="text-sm text-destructive">{error}</p>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={retry} className="button-quiet">
                    Try again
                  </button>
                  {closeButton}
                </div>
              </div>
            ) : (
              <>
                {/* Phone: one 64px row; expands for the full controls. */}
                <div className="md:hidden">
                  <div className="flex h-16 items-center gap-2">
                    {artwork('h-10 w-10 max-[399px]:hidden')}
                    {/* Tapping the title block shows the full controls. */}
                    <button
                      type="button"
                      onClick={() => setExpanded((v) => !v)}
                      aria-expanded={expanded}
                      aria-controls="player-more"
                      className="ml-1 flex min-h-11 min-w-0 flex-1 flex-col justify-center text-left"
                    >
                      <span className="block truncate font-heading text-[0.9375rem] leading-tight">{title}</span>
                      <span className="meta flex items-center gap-1 text-xs">
                        {formatTime(currentTime)}
                        {knownDuration ? ` / ${formatTime(knownDuration)}` : ''}
                        {rate !== 1 ? ` · ${rateLabel(rate)}` : ''}
                        <svg viewBox="0 0 20 20" width="12" height="12" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={cn('ml-0.5 transition-transform', expanded && 'rotate-180')}>
                          <path d="M5 12.5l5-5 5 5" />
                        </svg>
                      </span>
                      <span className="sr-only">{expanded ? 'Fewer controls' : 'More controls'}</span>
                    </button>
                    {!expanded && skipButton('back')}
                    {!expanded && transportButton('sm')}
                    {!expanded && (
                      // A hairline and space keep Close well apart from Pause.
                      <span className="ml-2 flex border-l border-rule pl-2">{closeButton}</span>
                    )}
                  </div>
                  {expanded && (
                    <div id="player-more" className="border-t border-rule pb-3 pt-1">
                      {scrubber}
                      <div className="mt-1 grid grid-cols-[2.75rem_1fr_2.75rem] items-center">
                        {speedButton}
                        <div className="flex items-center justify-center gap-6">
                          {skipButton('back')}
                          {transportButton('lg')}
                          {skipButton('forward')}
                        </div>
                        {closeButton}
                      </div>
                    </div>
                  )}
                </div>

                {/* Tablet and desktop: a single bar. */}
                <div className="hidden grid-cols-[minmax(0,15rem)_auto_1fr_auto_auto] items-center gap-x-6 py-3 md:grid">
                  <div className="flex min-w-0 items-center gap-3">
                    {artwork('h-11 w-11')}
                    <div className="min-w-0">
                      <p className="truncate font-heading text-[1.0625rem] leading-tight">{title}</p>
                      <p className="kicker mt-0.5 text-[0.6875rem]">{label ?? 'Narration'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {skipButton('back')}
                    {transportButton('lg')}
                    {skipButton('forward')}
                  </div>
                  {scrubber}
                  {speedButton}
                  {closeButton}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
