import React, { useState, useEffect, useRef, useCallback } from 'react';
import AudioManager from '../utils/audioManager';

function ControlBar({ setTimerActive, volume, onVolumeChange }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioFiles, setAudioFiles] = useState([]);
  const [currentAudioIndex, setCurrentAudioIndex] = useState(0);
  const audioRef = useRef(null);

  // Update audio volume when volume prop changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Load audio files on mount
  useEffect(() => {
    let mounted = true;

    const loadAudioFiles = async () => {
      try {
        const files = await AudioManager.getManifest();
        if (mounted) {
          console.log('Audio files loaded:', files);
          setAudioFiles(files);
          // Auto-start first track
          if (files.length > 0) {
            playAudio(files[0]);
          }
        }
      } catch (error) {
        console.error('Failed to load audio files:', error);
      }
    };

    loadAudioFiles();
    return () => { mounted = false; };
  }, []);

  const playAudio = useCallback(async (audioPath) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audioUrl = AudioManager.getFullAudioUrl(audioPath);
    const audio = new Audio(audioUrl);
    audio.volume = volume; // Set initial volume

    try {
      await audio.play();
      setIsPlaying(true);
      setTimerActive(true);
      audioRef.current = audio;

      // Add volume change listener
      audio.addEventListener('volumechange', () => {
        if (onVolumeChange && audio.volume !== volume) {
          onVolumeChange(audio.volume);
        }
      });
    } catch (error) {
      console.error('Audio playback error:', error);
      handleNextTrack();
    }
  }, [volume, setTimerActive, onVolumeChange]);

  // Add a utility function to get random track
  const getRandomTrackIndex = useCallback((currentIndex, totalTracks) => {
    if (totalTracks <= 1) return 0;
    
    // Generate random index that's different from current
    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * totalTracks);
    } while (randomIndex === currentIndex);
    
    return randomIndex;
  }, []);

  // Modified handleNextTrack to use random selection
  const handleNextTrack = useCallback(() => {
    if (audioFiles.length === 0) return;
    
    const nextIndex = getRandomTrackIndex(currentAudioIndex, audioFiles.length);
    setCurrentAudioIndex(nextIndex);
    playAudio(audioFiles[nextIndex]);
  }, [audioFiles, currentAudioIndex, playAudio, getRandomTrackIndex]);

  const handlePlayPauseClick = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setTimerActive(false);
    } else {
      audioRef.current.play();
      setTimerActive(true);
    }
    setIsPlaying(!isPlaying);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

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
}

export default ControlBar;

