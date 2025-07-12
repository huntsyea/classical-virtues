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
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.src = audioUrl;
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoaded(true);
      setError(null);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleError = () => {
      setError('Failed to load audio. Please try again later.');
      setIsLoaded(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('error', handleError);
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
        setError(null);
      }
    } catch (error) {
      console.error('Error loading audio:', error);
      setError('Failed to load audio. Please check your connection.');
    }
  };

  const togglePlayPause = async () => {
    if (error) {
      await initializeAudio();
      return;
    }

    if (!isLoaded) {
      await initializeAudio();
    }

    if (audioRef.current && !error) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        try {
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (playError) {
          console.error('Playback failed:', playError);
          setError('Playback failed. Please try again.');
          setIsPlaying(false);
        }
      }
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
        {error ? (
          <div className="text-center py-8">
            <p className="text-red-500 mb-2">{error}</p>
            <Button onClick={() => {
              setError(null);
              initializeAudio();
            }} variant="outline">
              Try Again
            </Button>
          </div>
        ) : (
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
        )}
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
