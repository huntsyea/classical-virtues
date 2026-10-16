/**
 * The one narration per story page, shared between the small eagerly
 * hydrated Listen control (which owns the <audio> element and the button)
 * and the lazily loaded player UI (mini-player, scrubber, Media Session).
 *
 * The control plays audio synchronously inside the reader's tap, which iOS
 * Safari requires, whether or not the player UI has loaded yet. When the UI
 * arrives it registers a controller and takes over the button's taps.
 */

export const AUDIO_ELEMENT_ID = 'story-audio'

export interface NarrationController {
  toggle: () => void
}

interface NarrationStore {
  controller: NarrationController | null
  button: HTMLButtonElement | null
}

const store: NarrationStore = { controller: null, button: null }
const listeners = new Set<() => void>()

function notify() {
  for (const listener of listeners) listener()
}

export function subscribeNarration(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getNarrationAudio(): HTMLAudioElement | null {
  if (typeof document === 'undefined') return null
  return document.getElementById(AUDIO_ELEMENT_ID) as HTMLAudioElement | null
}

export function setNarrationController(controller: NarrationController | null) {
  store.controller = controller
  notify()
}

export function getNarrationController() {
  return store.controller
}

export function hasNarrationController() {
  return store.controller !== null
}

export function setNarrationButton(button: HTMLButtonElement | null) {
  store.button = button
}

export function getNarrationButton() {
  return store.button
}
