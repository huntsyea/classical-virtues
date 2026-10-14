'use client'

import { useCallback, useEffect, useRef, useSyncExternalStore, type MouseEvent } from 'react'
import {
  AUDIO_ELEMENT_ID,
  getNarrationAudio,
  getNarrationController,
  hasNarrationController,
  setNarrationButton,
  subscribeNarration,
} from '@/components/narration-store'
import { listenLabels, readPosition, RESUME_EDGE_SECONDS } from '@/components/narration-utils'
import { smartQuotes } from '@/components/typography'

const AUDIO_EVENTS = ['play', 'pause', 'playing', 'waiting', 'canplay', 'timeupdate', 'loadedmetadata', 'ended', 'emptied']

/** Snapshot of the element as a string, so React compares it cheaply. */
function audioSnapshot(): string {
  const audio = getNarrationAudio()
  if (!audio) return 'paused|0|0'
  const duration = Number.isFinite(audio.duration) ? Math.round(audio.duration) : 0
  // "loading": asked to play, no sound yet (not enough data buffered).
  const state = audio.paused ? 'paused' : audio.readyState < 3 ? 'loading' : 'playing'
  return `${state}|${Math.floor(audio.currentTime)}|${duration}`
}

function subscribeAudio(onChange: () => void) {
  const audio = getNarrationAudio()
  if (!audio) return () => {}
  for (const type of AUDIO_EVENTS) audio.addEventListener(type, onChange)
  return () => {
    for (const type of AUDIO_EVENTS) audio.removeEventListener(type, onChange)
  }
}

const noSubscribe = () => () => {}

/**
 * The inline Listen control: small, and hydrated with the page. It owns the
 * story's single <audio preload="none"> element, and a tap plays it
 * synchronously inside the gesture (as iOS Safari requires), whether or not
 * the player UI has loaded. Once the UI arrives it takes over the button.
 */
/** A square lock-screen image: Basehub's CDN crops; other hosts pass through. */
function squareArtwork(image: string | undefined): string | undefined {
  if (!image) return undefined
  try {
    const url = new URL(image)
    if (url.hostname !== 'assets.basehub.com') return image
    url.searchParams.set('width', '512')
    url.searchParams.set('height', '512')
    url.searchParams.set('fit', 'cover')
    return url.toString()
  } catch {
    return image
  }
}

export default function ListenControl({
  audioUrl,
  title: rawTitle,
  image,
  durationHint,
}: {
  audioUrl: string
  title: string
  image?: string
  durationHint?: number | null
}) {
  const title = smartQuotes(rawTitle)
  const artwork = squareArtwork(image)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const snapshot = useSyncExternalStore(subscribeAudio, audioSnapshot, () => 'paused|0|0')
  const [state, time, metaDuration] = snapshot.split('|')
  const isLoading = state === 'loading'
  // A tap now pauses, so the control reads "Pause" while loading too.
  const isPlaying = state === 'playing' || isLoading
  const uiReady = useSyncExternalStore(subscribeNarration, hasNarrationController, () => false)
  const currentTime = Number(time)
  const duration = Number(metaDuration) || (durationHint && durationHint > 0 ? durationHint : 0)
  const resumeAt = useSyncExternalStore(noSubscribe, () => readPosition(audioUrl), () => null)

  const { label, detail: playingDetail } = listenLabels({
    isPlaying,
    started: currentTime > 0,
    currentTime,
    resumeAt,
    duration,
  })
  const detail = isLoading ? 'Loading' : playingDetail

  useEffect(() => {
    setNarrationButton(buttonRef.current)
    // Hydrated: the page's inline early-tap script steps aside, and the
    // button's own state (read from the element) replaces its CSS flag.
    const w = window as { __cvEarlyOff?: () => void; __cvListenReady?: boolean }
    w.__cvEarlyOff?.()
    w.__cvListenReady = true
    document.documentElement.removeAttribute('data-cv-early')
    document.documentElement.removeAttribute('data-cv-resume')
    return () => setNarrationButton(null)
  }, [])

  const onClick = useCallback((event: MouseEvent) => {
    // The page's inline script already handled this very click (a tap in the
    // hydration window that React replays): toggling again would undo it.
    if ((event.nativeEvent as { __cvEarly?: number }).__cvEarly) return
    const controller = getNarrationController()
    if (controller) {
      controller.toggle()
      return
    }
    // The player UI has not loaded yet: play now, inside the gesture.
    const audio = getNarrationAudio()
    if (!audio) return
    if (!audio.paused) {
      audio.pause()
      return
    }
    const resume = readPosition(audioUrl)
    if (resume) {
      const seek = () => {
        if (resume < audio.duration - RESUME_EDGE_SECONDS) audio.currentTime = resume
      }
      if (audio.readyState >= 1) seek()
      else audio.addEventListener('loadedmetadata', seek, { once: true })
    }
    // The lock screen shows the story, not a bare file name, even before
    // the player UI (which owns Media Session) has loaded.
    if ('mediaSession' in navigator && typeof MediaMetadata !== 'undefined') {
      navigator.mediaSession.metadata = new MediaMetadata({
        title,
        artist: 'Classical Virtues',
        artwork: artwork ? [{ src: artwork, sizes: '512x512' }] : [],
      })
    }
    void audio.play().catch(() => {})
  }, [audioUrl, title, artwork])

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <audio id={AUDIO_ELEMENT_ID} src={audioUrl} preload="none" />
      {/* The name comes from the visible label plus the hidden tail ("Listen,
          narration of ..."). Before hydration the page's inline script flags
          <html data-cv-early>, and CSS swaps in the Pause/Resume words and
          glyph, so the button never lies about what a tap will do. */}
      <button
        ref={buttonRef}
        type="button"
        onClick={onClick}
        data-listen-button=""
        data-state={isPlaying ? 'playing' : 'paused'}
        aria-busy={isLoading || undefined}
        data-title={title}
        data-art={artwork}
        className="group/listen inline-flex min-h-12 items-center gap-3 rounded-full bg-[var(--listen)] py-1.5 pl-1.5 pr-5 text-foreground transition-colors hover:bg-[var(--listen-hover)] active:bg-[var(--listen-hover)]"
      >
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
          <svg viewBox="0 0 20 20" className="listen-glyph-play h-4 w-4" fill="currentColor" aria-hidden="true">
            <path d="M6.5 4.4v11.2a.6.6 0 0 0 .92.5l8.6-5.6a.6.6 0 0 0 0-1L7.42 3.9a.6.6 0 0 0-.92.5Z" />
          </svg>
          <svg viewBox="0 0 20 20" className="listen-glyph-pause h-4 w-4" fill="currentColor" aria-hidden="true">
            <rect x="5" y="4" width="3.4" height="12" rx=".6" />
            <rect x="11.6" y="4" width="3.4" height="12" rx=".6" />
          </svg>
        </span>
        <span className="font-body text-[0.9375rem] font-medium">
          <span className="sr-only">Narration of {title}: </span>
          <span className="listen-label">{label}</span>
          <span className="listen-early-pause">Pause</span>
          <span className="listen-early-paused">Resume</span>
        </span>
        <span className="font-body text-[0.875rem] tabular-nums text-ink-2" aria-hidden="true">
          <span className="listen-label">{detail}</span>
          <span className="listen-early-playing">Playing</span>
          <span className="listen-early-loading">Loading</span>
        </span>
      </button>
      {/* Only until the player UI loads; it has the page's status region. */}
      {!uiReady && (
        <span role="status" className="sr-only">
          {isLoading ? 'Loading the narration' : ''}
        </span>
      )}
    </div>
  )
}
