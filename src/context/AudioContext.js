import React, { createContext, useContext, useState, useCallback } from 'react';
import AudioManager from '../utils/audioManager';

const AudioContext = createContext(null);

export function AudioProvider({ children }) {
  const [audioState, setAudioState] = useState({
    files: [],
    isVerified: false,
    isPlaying: false,
    currentIndex: null,
    shuffleQueue: [],
    currentQueueIndex: 0
  });

  const [audioRef, setAudioRef] = useState(null);

  // Initialize audio with files from manifest
  const initializeAudio = useCallback((files) => {
    console.log('Initializing audio with files:', files);
    if (!files || files.length === 0) {
      console.error('No audio files provided');
      return;
    }

    // Create initial shuffle queue immediately
    const indices = Array.from({ length: files.length }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    // Set initial state with first track selected
    setAudioState({
      files,
      isVerified: true,
      isPlaying: false,
      currentIndex: indices[0],  // Set initial track
      shuffleQueue: indices.slice(1),  // Rest of shuffled tracks
      currentQueueIndex: 0
    });
  }, []);

  const createShuffleQueue = useCallback((files) => {
    const indices = Array.from({ length: files.length }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  }, []);

  const initializeQueue = useCallback((files) => {
    console.log('Initializing queue with files:', files);
    const shuffledQueue = createShuffleQueue(files);
    setAudioState(prev => ({
      ...prev,
      files,
      shuffleQueue: shuffledQueue,
      currentQueueIndex: 0,
      currentIndex: shuffledQueue[0],  // Set initial track immediately
      isVerified: Boolean(files?.length)
    }));
  }, [createShuffleQueue]);

  const getNextTrack = useCallback(() => {
    setAudioState(prev => {
      if (prev.currentQueueIndex >= prev.shuffleQueue.length) {
        const newQueue = createShuffleQueue(prev.files);
        return {
          ...prev,
          shuffleQueue: newQueue,
          currentQueueIndex: 0,
          currentIndex: newQueue[0]
        };
      }
      
      return {
        ...prev,
        currentIndex: prev.shuffleQueue[prev.currentQueueIndex],
        currentQueueIndex: prev.currentQueueIndex + 1
      };
    });
  }, [createShuffleQueue]);

  const handleTrackEnd = useCallback(() => {
    setAudioState(prev => {
      const nextIndex = prev.currentQueueIndex >= prev.shuffleQueue.length
        ? createShuffleQueue(prev.files)[0]  // New shuffle if queue is empty
        : prev.shuffleQueue[prev.currentQueueIndex];

      return {
        ...prev,
        currentIndex: nextIndex,
        currentQueueIndex: prev.currentQueueIndex + 1,
        shuffleQueue: prev.currentQueueIndex >= prev.shuffleQueue.length
          ? createShuffleQueue(prev.files).slice(1)  // Rest of new shuffle
          : prev.shuffleQueue
      };
    });
  }, [createShuffleQueue]);

  const playTrack = useCallback(async (audio, trackPath) => {
    if (!trackPath) return null;
    
    const handleEnded = () => {
      console.log('Track ended, triggering next track');
      handleTrackEnd();
      // Get next track and play it
      const nextTrack = audioState.files[audioState.currentIndex];
      if (nextTrack) {
        const newAudio = new Audio(AudioManager.getFullAudioUrl(nextTrack));
        newAudio.volume = audio.volume;
        setAudioRef(newAudio);
        newAudio.play();
        setAudioState(prev => ({ ...prev, isPlaying: true }));
      }
    };

    audio.addEventListener('ended', handleEnded);
    
    try {
      await audio.play();
      return () => audio.removeEventListener('ended', handleEnded);
    } catch (error) {
      console.error('Playback failed:', error);
      audio.removeEventListener('ended', handleEnded);
      return null;
    }
  }, [handleTrackEnd, audioState.files, audioState.currentIndex, setAudioRef, setAudioState]);

  const value = {
    audioState,
    audioRef,
    setAudioRef,
    initializeAudio,
    initializeQueue,
    getNextTrack,
    setAudioState,
    playTrack
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
} 