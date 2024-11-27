"use client";

import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card } from '@/components/ui/card';
import { PlayIcon, PauseIcon } from 'lucide-react';

interface AudioPlayerProps {
  audioUrl: string;
}

export default function AudioPlayer({ audioUrl }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.src = audioUrl;
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoaded(true);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [audioUrl]);

  const initializeAudio = async () => {
    if (!audioRef.current) return;
    
    try {
      if (!isLoaded) {
        await audioRef.current.load();
        setIsLoaded(true);
      }
    } catch (error) {
      console.error('Error loading audio:', error);
    }
  };

  const togglePlayPause = async () => {
    if (!isLoaded) {
      await initializeAudio();
    }

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        try {
          await audioRef.current.play();
        } catch (error) {
          console.error('Playback failed:', error);
        }
      }
      setIsPlaying(!isPlaying);
    }
  };

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

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}
