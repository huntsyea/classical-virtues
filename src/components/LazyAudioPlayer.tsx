'use client'

import dynamic from 'next/dynamic'
import { Card } from '@/components/ui/card'

// next/dynamic with ssr: false must live in a client component in Next 15+
const LazyAudioPlayer = dynamic(() => import('@/components/AudioPlayer'), {
  loading: () => (
    <Card className="my-8 p-4 bg-transparent w-full border">
      <h2 className="text-2xl font-bold mb-1 font-heading">Listen to the Story</h2>
      <div className="bg-background rounded-[4px] p-4 w-full h-[100px] animate-pulse" />
    </Card>
  ),
  ssr: false,
})

export default LazyAudioPlayer
