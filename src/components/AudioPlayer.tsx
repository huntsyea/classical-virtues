"use client";

import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card } from '@/components/ui/card';

interface AudioPlayerProps {
  audioUrl: string;
}

export default function AudioPlayer({ audioUrl }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(e => console.error("Playback failed", e));
      }
      setIsPlaying(!isPlaying);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      setCurrentTime(audio.currentTime);
    };

    const setAudioData = () => {
      setDuration(audio.duration);
    };

    const handlePlayPause = () => {
      setIsPlaying(!audio.paused);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', setAudioData);
    audio.addEventListener('play', handlePlayPause);
    audio.addEventListener('pause', handlePlayPause);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', setAudioData);
      audio.removeEventListener('play', handlePlayPause);
      audio.removeEventListener('pause', handlePlayPause);
    };
  }, []);

  const handleSliderChange = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  return (
    <Card className="my-8 p-4 bg-transparent w-full border">
      <h2 className="text-2xl font-bold mb-1 font-heading">Listen to the Story</h2>
      <div className="bg-background rounded-lg p-4 w-full">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={togglePlayPause} aria-label={isPlaying ? "Pause" : "Play"}>
            {isPlaying ? (
              <PauseIcon className="w-5 h-5 text-muted-foreground" />
            ) : (
              <PlayIcon className="w-5 h-5 text-muted-foreground" />
            )}
          </Button>
          <Slider
            value={[currentTime]}
            min={0}
            max={duration || 100}
            step={0.1}
            onValueChange={handleSliderChange}
            aria-label="Seek"
            className="flex-grow"
          />
          <div className="text-sm text-muted-foreground whitespace-nowrap">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
        <audio ref={audioRef} src={audioUrl} />
      </div>
    </Card>
  );
}

function PlayIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="6 3 20 12 6 21 6 3" />
    </svg>
  );
}

function PauseIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  );
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}
