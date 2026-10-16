'use client'

import dynamic from 'next/dynamic'
import ListenControl from '@/components/ListenControl'
import type { AudioPlayerProps } from '@/components/AudioPlayer'

// The heavy player UI (mini-player, scrubber, speed, Media Session) loads
// after the page, client-side only. next/dynamic with ssr: false must live in
// a client component in Next 15+. It renders nothing in place until needed,
// so its arrival shifts nothing.
const AudioPlayer = dynamic(() => import('@/components/AudioPlayer'), {
  loading: () => null,
  ssr: false,
})

/**
 * Story narration: the small Listen control, hydrated with the page and able
 * to start playback on the very first tap, plus the player UI, which attaches
 * to the same <audio> element when it arrives.
 */
export default function LazyAudioPlayer(props: AudioPlayerProps) {
  return (
    <>
      <ListenControl audioUrl={props.audioUrl} title={props.title} image={props.image} durationHint={props.durationHint} />
      <AudioPlayer {...props} />
    </>
  )
}
