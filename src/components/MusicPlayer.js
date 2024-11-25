import React, { useState, useEffect, useRef, useCallback } from 'react';
import './MusicPlayer.css';
import ControlBar from './ControlBar';
import SessionInput from './SessionInput';
import AudioManager from '../utils/audioManager';

function MusicPlayer({ isFreeflow, onBeginClick, stopAudio, setTimerActive, volume, onVolumeChange }) {
  // Session state
  const [sessionStarted, setSessionStarted] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [slideIn, setSlideIn] = useState(false);
  
  // Audio state management moved to ControlBar
  const [mp3DirectoryVerified, setMp3DirectoryVerified] = useState(false);

  // Verify MP3 directory on mount
  useEffect(() => {
    const verifyMp3Directory = async () => {
      try {
        const manifest = await AudioManager.getManifest();
        if (manifest && manifest.length > 0) {
          console.log('MP3 directory verified, found files:', manifest);
          setMp3DirectoryVerified(true);
        } else {
          console.error('MP3 directory is empty or inaccessible');
          setMp3DirectoryVerified(false);
        }
      } catch (error) {
        console.error('Failed to verify MP3 directory:', error);
        setMp3DirectoryVerified(false);
      }
    };

    verifyMp3Directory();
  }, []);

  const handleBeginSession = async () => {
    if (!mp3DirectoryVerified) {
      console.error('Cannot start session: MP3 directory not verified');
      return;
    }

    console.log('Beginning session with focus:', inputValue);
    
    try {
      // Play bell sound
      const bellUrl = AudioManager.getBellAudioUrl();
      const isValid = await AudioManager.verifyAudio(bellUrl);
      
      if (isValid) {
        const audio = new Audio(bellUrl);
        await audio.play();
      }
      
      // Start session transition
      setTimeout(() => {
        setSlideIn(true);
        setSessionStarted(true);
        onBeginClick(inputValue);
      }, 1000);
      
    } catch (error) {
      console.error('Session start error:', error);
      // Fallback to starting session without bell sound
      setSlideIn(true);
      setSessionStarted(true);
      onBeginClick(inputValue);
    }
  };

  const handleInputChange = (event) => {
    setInputValue(event.target.value);
  };

  return (
    <div className={`
      tw-relative 
      tw-flex 
      tw-flex-col 
      tw-items-center 
      tw-justify-center 
      tw-w-full 
      tw-h-full
      ${isFreeflow ? 'tw-animate-fadeIn' : 'tw-animate-fadeOut'}
    `}>
      <div className="tw-bg-black/30 tw-backdrop-blur-md tw-rounded-xl tw-p-8 tw-flex tw-flex-col tw-items-center tw-gap-6 tw-w-[90%] tw-max-w-[384px] tw-h-[400px] tw-min-h-[400px] sm:tw-w-96 tw-overflow-hidden">
        <p className={`
          tw-text-white
          tw-font-medium
          tw-text-2xl
          tw-absolute
          tw-left-1/2
          tw-transform
          tw-transition-all
          tw-duration-500
          tw-ease-out
          tw--translate-x-1/2
          ${slideIn ? 
            'tw-top-1/3 tw-scale-150 tw-opacity-100' 
            : 
            'tw-top-0 tw-scale-100 tw-opacity-70'}
        `}>
          Time to focus
        </p>

        {!sessionStarted && (
          <SessionInput
            inputValue={inputValue}
            onInputChange={handleInputChange}
            onBeginClick={handleBeginSession}
            fadeOut={slideIn}
          />
        )}

        {sessionStarted && mp3DirectoryVerified && (
          <ControlBar
            setTimerActive={setTimerActive}
            volume={volume}
            onVolumeChange={onVolumeChange}
          />
        )}
      </div>
    </div>
  );
}

export default MusicPlayer;
