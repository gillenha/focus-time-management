import React, { useState, useEffect, useRef, useCallback } from 'react';
import AudioManager from '../utils/audioManager';

function ControlBar({ setTimerActive, volume, onVolumeChange, audioFiles }) {
  // Combined audio state
  const [audioState, setAudioState] = useState({
    isPlaying: false,
    currentIndex: null
  });
  
  const audioRef = useRef(null);

  // Single volume effect
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const getRandomTrackIndex = useCallback((currentIndex, totalTracks) => {
    if (totalTracks <= 1) return 0;
    return Math.floor(Math.random() * totalTracks);
  }, []);

  const handleNextTrack = useCallback(() => {
    if (!audioFiles?.length) return;
    
    const nextIndex = getRandomTrackIndex(audioState.currentIndex, audioFiles.length);
    setAudioState(prev => ({ ...prev, currentIndex: nextIndex }));
    playAudio(audioFiles[nextIndex]);
  }, [audioFiles, audioState.currentIndex, getRandomTrackIndex]);

  // Consolidated audio setup
  const setupAudioElement = useCallback((audio) => {
    audio.volume = volume;
    
    const handleEnded = () => handleNextTrack();
    const handleVolumeChange = () => {
      if (onVolumeChange && audio.volume !== volume) {
        onVolumeChange(audio.volume);
      }
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('volumechange', handleVolumeChange);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('volumechange', handleVolumeChange);
    };
  }, [volume, onVolumeChange, handleNextTrack]);

  const playAudio = useCallback(async (audioPath) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(AudioManager.getFullAudioUrl(audioPath));
    const cleanup = setupAudioElement(audio);

    try {
      await audio.play();
      setAudioState(prev => ({ ...prev, isPlaying: true }));
      setTimerActive(true);
      audioRef.current = audio;
      return cleanup;
    } catch (error) {
      console.error('Playback failed:', error);
      cleanup();
      handleNextTrack();
    }
  }, [setupAudioElement, setTimerActive, handleNextTrack]);

  // Single initialization effect
  useEffect(() => {
    if (audioFiles?.length && audioState.currentIndex === null) {
      const initialIndex = getRandomTrackIndex(-1, audioFiles.length);
      setAudioState(prev => ({ ...prev, currentIndex: initialIndex }));
      playAudio(audioFiles[initialIndex]);
    }
  }, [audioFiles, audioState.currentIndex, getRandomTrackIndex, playAudio]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  const handlePlayPauseClick = () => {
    if (!audioRef.current) return;

    if (audioState.isPlaying) {
      audioRef.current.pause();
      setTimerActive(false);
    } else {
      audioRef.current.play();
      setTimerActive(true);
    }
    setAudioState(prev => ({ ...prev, isPlaying: !audioState.isPlaying }));
  };

  return (
    <div className="tw-absolute tw-bottom-8 tw-left-0 tw-right-0 tw-flex tw-justify-center tw-gap-4 tw-h-[10%]">
      <button 
        onClick={handlePlayPauseClick}
        className="tw-w-12 tw-h-12 tw-flex tw-items-center tw-justify-center tw-bg-gray-600 tw-rounded-full tw-shadow-[0_4px_8px_rgba(0,0,0,0.25)] tw-border-0 tw-outline-none focus:tw-outline-none hover:tw-cursor-pointer tw-transition-all"
      >
        {audioState.isPlaying ? (
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
}

export default ControlBar;

