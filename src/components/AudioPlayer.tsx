"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { PlayIcon, PauseIcon, Loader2, RotateCcw, RotateCw } from 'lucide-react';

interface AudioPlayerProps {
  audioUrl: string;
  title: string;
  image: string;
}

const SKIP_SECONDS = 15;
const POSITION_KEY_PREFIX = 'cv:audio-position:';
const SAVE_INTERVAL_SECONDS = 5;
const RESUME_EDGE_SECONDS = 3;

function savePosition(url: string, time: number) {
  try {
    window.localStorage.setItem(POSITION_KEY_PREFIX + url, String(time));
  } catch {
    // Storage unavailable (private mode, quota); resume is best-effort.
  }
}

function readPosition(url: string): number | null {
  try {
    const raw = window.localStorage.getItem(POSITION_KEY_PREFIX + url);
    if (raw === null) return null;
    const value = Number.parseFloat(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function clearPosition(url: string) {
  try {
    window.localStorage.removeItem(POSITION_KEY_PREFIX + url);
  } catch {
    // Ignore; stale positions are harmless.
  }
}

export default function AudioPlayer({ audioUrl, title, image }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastSavedRef = useRef(0);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.src = audioUrl;
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoaded(true);
      setError(null);

      // Resume where an interrupted listener left off.
      const stored = readPosition(audioUrl);
      if (
        stored !== null &&
        stored > RESUME_EDGE_SECONDS &&
        Number.isFinite(audio.duration) &&
        stored < audio.duration - RESUME_EDGE_SECONDS
      ) {
        audio.currentTime = stored;
        lastSavedRef.current = stored;
        setCurrentTime(stored);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (Math.abs(audio.currentTime - lastSavedRef.current) >= SAVE_INTERVAL_SECONDS) {
        lastSavedRef.current = audio.currentTime;
        savePosition(audioUrl, audio.currentTime);
      }
    };

    const handlePlay = () => {
      // The 'play' event fires on intent; audio may still be buffering, so
      // hold the spoken status at "Loading…" until 'playing' confirms sound.
      setIsPlaying(true);
    };

    const handlePlaying = () => {
      setIsBuffering(false);
      setStatus('Playing');
    };

    const handleWaiting = () => {
      setIsBuffering(true);
      setStatus('Loading…');
    };

    const handleCanPlay = () => {
      setIsBuffering(false);
    };

    const handlePause = () => {
      setIsPlaying(false);
      setIsBuffering(false);
      if (!audio.ended) {
        setStatus('Paused');
        if (audio.currentTime > RESUME_EDGE_SECONDS) {
          lastSavedRef.current = audio.currentTime;
          savePosition(audioUrl, audio.currentTime);
        }
      }
    };

    const handleEnded = () => {
      // Reset to the start, paused, so playing again is one tap.
      setIsPlaying(false);
      setIsBuffering(false);
      audio.currentTime = 0;
      lastSavedRef.current = 0;
      setCurrentTime(0);
      clearPosition(audioUrl);
      setStatus('Finished');
    };

    const handleError = () => {
      setError('Failed to load audio. Please try again later.');
      setIsLoaded(false);
      setIsPlaying(false);
      setIsBuffering(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.pause();
      audio.removeAttribute('src');
      audioRef.current = null;
    };
  }, [audioUrl]);

  const seekBy = useCallback((delta: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration)) return;
    const next = Math.min(Math.max(0, audio.currentTime + delta), audio.duration);
    audio.currentTime = next;
    setCurrentTime(next);
  }, []);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title,
        artist: 'Classical Virtues',
        artwork: [{ src: image, sizes: '512x512', type: 'image/png' }]
      });

      navigator.mediaSession.setActionHandler('play', () => {
        audioRef.current?.play().catch(() => {
          setError('Playback failed. Please try again.');
        });
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        audioRef.current?.pause();
      });

      navigator.mediaSession.setActionHandler('seekto', (event) => {
        if (audioRef.current && event.seekTime != null) {
          audioRef.current.currentTime = event.seekTime;
          setCurrentTime(event.seekTime);
        }
      });

      navigator.mediaSession.setActionHandler('seekbackward', () => {
        seekBy(-SKIP_SECONDS);
      });

      navigator.mediaSession.setActionHandler('seekforward', () => {
        seekBy(SKIP_SECONDS);
      });
    }
  }, [title, image, seekBy]);

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      return;
    }

    try {
      setIsBuffering(true);
      setStatus('Loading…');
      await audio.play();
    } catch (playError) {
      console.error('Playback failed:', playError);
      setError('Playback failed. Please try again.');
      setIsBuffering(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setStatus('');
    audioRef.current?.load();
  };

  const handleSliderChange = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  return (
    <section className="my-8 w-full border border-border bg-background p-4 sm:p-5">
      <h2 className="mb-3 font-heading text-2xl">Listen to the Story</h2>
      <p aria-live="polite" className="sr-only">
        {error ?? status}
      </p>
      {error ? (
        <div role="alert" className="py-6 text-center">
          <p className="mb-3 text-destructive">{error}</p>
          <Button onClick={handleRetry} variant="outline">
            Try Again
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 shrink-0"
            onClick={() => seekBy(-SKIP_SECONDS)}
            disabled={!isLoaded}
            aria-label="Skip back 15 seconds"
          >
            <RotateCcw className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 shrink-0"
            onClick={togglePlayPause}
            aria-label={isPlaying ? "Pause narration" : "Play narration"}
          >
            {isBuffering ? (
              <Loader2
                className="h-5 w-5 animate-spin text-muted-foreground motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : isPlaying ? (
              <PauseIcon className="h-5 w-5 text-foreground" aria-hidden="true" />
            ) : (
              <PlayIcon className="h-5 w-5 text-foreground" aria-hidden="true" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 shrink-0"
            onClick={() => seekBy(SKIP_SECONDS)}
            disabled={!isLoaded}
            aria-label="Skip forward 15 seconds"
          >
            <RotateCw className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          </Button>
          <Slider
            value={[currentTime]}
            min={0}
            max={Number.isFinite(duration) && duration > 0 ? duration : 100}
            step={5}
            onValueChange={handleSliderChange}
            disabled={!isLoaded}
            aria-label="Seek through the story"
            aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
            className="mx-2 flex-grow"
          />
          <div className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
      )}
    </section>
  );
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}
