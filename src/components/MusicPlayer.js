import React, { useState, useCallback, useEffect } from 'react';
import './MusicPlayer.css';
import ControlBar from './ControlBar';
import SessionInput from './SessionInput';
import AudioManager from '../utils/audioManager';

function MusicPlayer({ 
  isFreeflow, 
  onBeginClick, 
  stopAudio, 
  setTimerActive, 
  volume, 
  onVolumeChange,
  playlistTracks,
  sessionInputValue,
  setSessionInputValue,
  sessionStarted,
  setSessionStarted
}) {
  const [isAudioVerified, setIsAudioVerified] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [slideIn, setSlideIn] = useState(sessionStarted);

  useEffect(() => {
    if (sessionStarted) {
      verifyAudio();
    }
  }, [sessionStarted]);

  const verifyAudio = async () => {
    if (playlistTracks.length === 0) {
      console.error('No tracks available to play');
      setIsAudioVerified(false);
      return false;
    }

    try {
      const audioPath = process.env.NODE_ENV === 'production'
        ? playlistTracks[0].fileName
        : `/mp3s/${playlistTracks[0].fileName}`;
      
      console.log('Verifying first track:', audioPath);
      const fullUrl = AudioManager.getFullAudioUrl(audioPath);
      const isValid = await AudioManager.verifyAudio(fullUrl);
      
      if (!isValid) {
        console.error('Audio verification failed. Please check if the audio files are available in the correct location.');
        if (process.env.NODE_ENV === 'development') {
          console.info('Development mode: Make sure your audio files are in the /mp3s directory and your development server is configured correctly.');
        }
      }
      
      setIsAudioVerified(isValid);
      return isValid;
    } catch (error) {
      console.error('Audio verification failed:', error);
      setIsAudioVerified(false);
      return false;
    }
  };

  const handleBeginSession = async () => {
    console.log('Beginning session...');
    const audioVerified = await verifyAudio();
    
    if (!audioVerified) {
      console.error('Cannot start session: Audio verification failed');
      return;
    }

    try {
      const bellUrl = AudioManager.getBellAudioUrl();
      console.log('Verifying bell sound:', bellUrl);
      const isValid = await AudioManager.verifyAudio(bellUrl);
      
      if (isValid) {
        const audio = new Audio(bellUrl);
        await audio.play();
      } else {
        console.warn('Bell sound verification failed, continuing without bell sound');
      }
    } catch (error) {
      console.error('Bell sound failed:', error);
    }
    
    setSlideIn(true);
    setSessionStarted(true);
    onBeginClick(sessionInputValue);
  };

  const handleInputChange = (event) => {
    setSessionInputValue(event.target.value);
  };

  const handleTrackEnd = useCallback(() => {
    setCurrentTrackIndex(prevIndex => {
      return prevIndex >= playlistTracks.length - 1 ? 0 : prevIndex + 1;
    });
  }, [playlistTracks.length]);

  const handleCleanup = useCallback((cleanup) => {
    window.audioCleanup = cleanup;
  }, []);

  const getAudioFiles = useCallback(() => {
    return playlistTracks.map(track => 
      process.env.NODE_ENV === 'production'
        ? track.fileName
        : `/mp3s/${track.fileName}`
    );
  }, [playlistTracks]);

  return (
    <div className={`
      tw-relative tw-flex tw-flex-col tw-items-center tw-justify-center 
      tw-w-full tw-h-full
      ${isFreeflow ? 'tw-animate-fadeIn' : 'tw-animate-fadeOut'}
    `}>
      <div className="tw-bg-black/30 tw-backdrop-blur-md tw-rounded-xl tw-p-8 tw-flex tw-flex-col tw-items-center tw-gap-6 tw-w-[90%] tw-max-w-[384px] tw-h-[400px] tw-min-h-[400px] sm:tw-w-96 tw-overflow-hidden">
        <p className={`
          tw-text-white tw-font-medium tw-text-2xl tw-absolute
          tw-left-1/2 tw-transform tw-transition-all tw-duration-500
          tw-ease-out tw--translate-x-1/2
          ${slideIn ? 'tw-top-1/3 tw-scale-150 tw-opacity-100' : 'tw-top-0 tw-scale-100 tw-opacity-70'}
        `}>
          Time to focus
        </p>

        {!sessionStarted && (
          <SessionInput
            inputValue={sessionInputValue}
            onInputChange={handleInputChange}
            onBeginClick={handleBeginSession}
            fadeOut={slideIn}
          />
        )}

        {sessionStarted && (
          <ControlBar
            setTimerActive={setTimerActive}
            volume={volume}
            onVolumeChange={onVolumeChange}
            audioFiles={getAudioFiles()}
            onCleanup={handleCleanup}
            currentTrackIndex={currentTrackIndex}
            onTrackEnd={handleTrackEnd}
            isSequential={true}
          />
        )}
      </div>
    </div>
  );
}

export default MusicPlayer;
