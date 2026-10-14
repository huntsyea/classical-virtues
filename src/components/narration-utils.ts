/** Shared by the Listen control and the player UI. Client-side only. */

const POSITION_KEY_PREFIX = 'cv:audio-position:'
export const RESUME_EDGE_SECONDS = 3

export function savePosition(url: string, time: number) {
  try {
    window.localStorage.setItem(POSITION_KEY_PREFIX + url, String(time))
  } catch {
    // Storage unavailable (private mode, quota); resume is best-effort.
  }
}

export function readPosition(url: string): number | null {
  try {
    const raw = window.localStorage.getItem(POSITION_KEY_PREFIX + url)
    if (raw === null) return null
    const value = Number.parseFloat(raw)
    return Number.isFinite(value) && value > RESUME_EDGE_SECONDS ? value : null
  } catch {
    return null
  }
}

export function clearPosition(url: string) {
  try {
    window.localStorage.removeItem(POSITION_KEY_PREFIX + url)
  } catch {
    // Ignore; stale positions are harmless.
  }
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes}:${secs < 10 ? '0' : ''}${secs}`
}

/** The inline control's words: Listen 2:58, Resume from 0:11, Pause 0:15 / 2:58. */
export function listenLabels({
  isPlaying,
  started,
  currentTime,
  resumeAt,
  duration,
}: {
  isPlaying: boolean
  started: boolean
  currentTime: number
  resumeAt: number | null
  duration: number
}): { label: 'Listen' | 'Resume' | 'Pause'; detail: string } {
  const label = isPlaying ? 'Pause' : (started && currentTime > 0) || resumeAt ? 'Resume' : 'Listen'
  const detail =
    isPlaying || (started && currentTime > 0)
      ? `${formatTime(currentTime)}${duration ? ` / ${formatTime(duration)}` : ''}`
      : resumeAt
        ? `from ${formatTime(resumeAt)}`
        : duration
          ? formatTime(duration)
          : 'to the narration'
  return { label, detail }
}
