import React, { useState, useEffect, useRef, useCallback, forwardRef } from 'react';
import AudioManager from '../utils/audioManager';
import { playEffect } from '../utils/soundEffects';

const FADE_DURATION_MS = 1500;
const FADE_STEPS = 30;

const ControlBar = forwardRef(({ setTimerActive, volume, audioFiles, onCleanup, currentTrackIndex, onTrackEnd }, ref) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const hasInitialized = useRef(false);

  const fadeIntervalRef = useRef(null);
  const isFadingRef = useRef(false);
  const volumeRef = useRef(volume);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  const stopFade = useCallback(() => {
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
    isFadingRef.current = false;
  }, []);

  const fadeIn = useCallback((audio) => {
    stopFade();
    isFadingRef.current = true;
    audio.volume = 0;
    let step = 0;
    fadeIntervalRef.current = setInterval(() => {
      step++;
      const target = volumeRef.current;
      audio.volume = Math.min(target, (target * step) / FADE_STEPS);
      if (step >= FADE_STEPS) {
        audio.volume = volumeRef.current;
        stopFade();
      }
    }, FADE_DURATION_MS / FADE_STEPS);
  }, [stopFade]);

  const fadeOut = useCallback((audio) => new Promise((resolve) => {
    stopFade();
    isFadingRef.current = true;
    const startVolume = audio.volume;
    let step = 0;
    fadeIntervalRef.current = setInterval(() => {
      step++;
      audio.volume = Math.max(0, startVolume * (1 - step / FADE_STEPS));
      if (step >= FADE_STEPS) {
        audio.volume = 0;
        stopFade();
        resolve();
      }
    }, FADE_DURATION_MS / FADE_STEPS);
  }), [stopFade]);

  // Expose audioRef through forwarded ref
  useEffect(() => {
    if (ref) {
      ref.current = {
        audioRef
      };
    }
  }, [ref]);

  // The slider is the only source of truth for the music-track volume; we don't
  // mirror audio.volume changes back to the slider. (A volumechange listener
  // here would fire asynchronously after every fade tick — leaking ramp values
  // into the slider, which is the bug that pinned it to 0 between tracks.)
  const setupAudioElement = useCallback((audio) => {
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, []);

  // Add seek function
  const seekToPosition = useCallback((position) => {
    if (audioRef.current) {
      audioRef.current.currentTime = position;
    }
  }, []);

  // Expose seek function and duration through ref
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.seekToPosition = seekToPosition;
      audioRef.current.getDuration = () => duration;
    }
  }, [seekToPosition, duration]);

  // Real-time volume control — but don't fight an in-progress fade
  useEffect(() => {
    if (audioRef.current && !isFadingRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const playAudio = useCallback(async (audioPath, options = {}) => {
    const { fadeInOnStart = false, _retry = 0 } = options;

    if (audioRef.current) {
      stopFade();
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }

    const audio = new Audio(AudioManager.getFullAudioUrl(audioPath));
    // Fetch the full file immediately so play() has data ready and the media
    // pipeline doesn't sit in its "still classifying" load phase — that's the
    // window where Chrome can emit a misleading "video-only background media"
    // AbortError.
    audio.preload = 'auto';
    const cleanup = setupAudioElement(audio);

    try {
      audioRef.current = audio;
      audio.volume = fadeInOnStart ? 0 : volumeRef.current;
      await audio.play();
      if (fadeInOnStart) {
        fadeIn(audio);
      }
      setIsPlaying(true);
      setTimerActive(true);
      return cleanup;
    } catch (error) {
      // AbortError on initial play() is usually a transient race during load.
      // Retry once before giving up so the user doesn't end up in a silent
      // "session started but no audio" state.
      if (error && error.name === 'AbortError' && _retry === 0) {
        console.warn(`Play interrupted, retrying: ${audioPath}`);
        cleanup();
        await new Promise((r) => setTimeout(r, 150));
        return playAudio(audioPath, { fadeInOnStart, _retry: 1 });
      }
      console.error('Playback failed:', error);
      cleanup();
      return null;
    }
  }, [setupAudioElement, setTimerActive, stopFade, fadeIn]);

  // Initialize first track only once when session starts
  useEffect(() => {
    if (audioFiles?.length && !hasInitialized.current) {
      hasInitialized.current = true;
      playAudio(audioFiles[0], { fadeInOnStart: true });
    }
  }, [audioFiles, playAudio]);

  // Handle track end with continuous playback (fade in next track)
  useEffect(() => {
    if (audioRef.current) {
      const handleEnded = () => {
        onTrackEnd();
        const nextIndex = currentTrackIndex >= audioFiles.length - 1 ? 0 : currentTrackIndex + 1;
        playAudio(audioFiles[nextIndex], { fadeInOnStart: true });
      };

      audioRef.current.addEventListener('ended', handleEnded);
      return () => audioRef.current?.removeEventListener('ended', handleEnded);
    }
  }, [currentTrackIndex, audioFiles, onTrackEnd, playAudio]);

  // Next track handler — fade out current, fade in next
  const handleNextTrack = useCallback(async () => {
    if (!audioFiles?.length) return;
    playEffect('next-track.mp3');
    if (audioRef.current) {
      await fadeOut(audioRef.current);
    }
    onTrackEnd();
    const nextIndex = currentTrackIndex >= audioFiles.length - 1 ? 0 : currentTrackIndex + 1;
    await playAudio(audioFiles[nextIndex], { fadeInOnStart: true });
  }, [audioFiles, currentTrackIndex, onTrackEnd, playAudio, fadeOut]);

  // Play/Pause handler
  const handlePlayPauseClick = useCallback(() => {
    playEffect('play-pause.mp3');
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setTimerActive(false);
    } else {
      audioRef.current.play();
      setTimerActive(true);
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, setTimerActive]);

  // Cleanup function
  useEffect(() => {
    if (onCleanup) {
      onCleanup(() => {
        stopFade();
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = '';
          audioRef.current = null;
        }
        setIsPlaying(false);
      });
    }
  }, [onCleanup, stopFade]);

  return (
    <div className="tw-absolute tw-bottom-8 tw-left-0 tw-right-0 tw-flex tw-justify-center tw-gap-4 tw-h-[10%]">
      <button
        onClick={handlePlayPauseClick}
        className="tw-w-12 tw-h-12 tw-flex tw-items-center tw-justify-center tw-bg-gray-600 tw-rounded-full tw-shadow-[0_4px_8px_rgba(0,0,0,0.25)] tw-border-0 tw-outline-none focus:tw-outline-none hover:tw-cursor-pointer tw-transition-all"
      >
        {isPlaying ? (
          <svg
            stroke="currentColor"
            fill="currentColor"
            strokeWidth="0"
            viewBox="0 0 448 512"
            className="tw-text-slate-200 tw-scale-105"
            height="1em"
            width="1em"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M144 479H48c-26.5 0-48-21.5-48-48V79c0-26.5 21.5-48 48-48h96c26.5 0 48 21.5 48 48v352c0 26.5-21.5 48-48 48zm304-48V79c0-26.5-21.5-48-48-48h-96c-26.5 0-48 21.5-48 48v352c0 26.5 21.5 48 48 48h96c26.5 0 48-21.5 48-48z" />
          </svg>
        ) : (
          <svg
            stroke="currentColor"
            fill="currentColor"
            strokeWidth="0"
            viewBox="0 0 448 512"
            className="tw-text-slate-200 tw-scale-105"
            height="1em"
            width="1em"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M424.4 214.7L72.4 6.6C43.8-10.3 0 6.1 0 47.9V464c0 37.5 40.7 60.1 72.4 41.3l352-208c31.4-18.5 31.5-64.1 0-82.6z" />
          </svg>
        )}
      </button>
      <button
        onClick={handleNextTrack}
        className="tw-w-12 tw-h-12 tw-flex tw-flex-row tw-items-center tw-gap-2 tw-justify-center tw-bg-gray-600 tw-rounded-full hover:tw-cursor-pointer tw-transition-all tw-border-0 tw-outline-none focus:tw-outline-none tw-shadow-[0_4px_8px_rgba(0,0,0,0.25)]"
      >
        <svg
          className="tw-w-6 tw-h-6 tw-fill-white"
          viewBox="0 0 24 24"
        >
          <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
        </svg>
      </button>
    </div>
  );
});

export default ControlBar;
