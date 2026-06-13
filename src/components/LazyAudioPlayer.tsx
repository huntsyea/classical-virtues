'use client'

import dynamic from 'next/dynamic'

// next/dynamic with ssr: false must live in a client component in Next 15+
// The skeleton mirrors the rendered player chrome (same container, heading,
// and 44px control row) so loading causes no layout shift.
const LazyAudioPlayer = dynamic(() => import('@/components/AudioPlayer'), {
  loading: () => (
    <section className="my-8 w-full border border-border bg-background p-4 sm:p-5">
      <h2 className="mb-3 font-heading text-2xl">Listen to the Story</h2>
      <div
        className="h-11 w-full animate-pulse bg-muted motion-reduce:animate-none"
        aria-hidden="true"
      />
    </section>
  ),
  ssr: false,
})

export default LazyAudioPlayer
