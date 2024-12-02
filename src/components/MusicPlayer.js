import React, { useState, useEffect, useCallback } from 'react';
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
  playlistTracks
}) {
  const [sessionState, setSessionState] = useState({
    started: false,
    slideIn: false,
    inputValue: ''
  });
  
  const [isAudioVerified, setIsAudioVerified] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);

  const verifyAudio = async () => {
    if (playlistTracks.length === 0) {
      setIsAudioVerified(false);
      return false;
    }

    try {
      const firstTrack = `/mp3s/${playlistTracks[0].fileName}`;
      const isValid = await AudioManager.verifyAudio(firstTrack);
      setIsAudioVerified(isValid);
      return isValid;
    } catch (error) {
      console.error('Audio verification failed:', error);
      setIsAudioVerified(false);
      return false;
    }
  };

  const handleBeginSession = async () => {
    const audioVerified = await verifyAudio();
    if (!audioVerified) return;

    try {
      const bellUrl = AudioManager.getBellAudioUrl();
      const isValid = await AudioManager.verifyAudio(bellUrl);
      
      if (isValid) {
        const audio = new Audio(bellUrl);
        await audio.play();
      }
    } catch (error) {
      console.error('Bell sound failed:', error);
    }
    
    setSessionState(prev => ({
      ...prev,
      started: true,
      slideIn: true
    }));
    onBeginClick(sessionState.inputValue);
  };

  const handleInputChange = (event) => {
    setSessionState(prev => ({
      ...prev,
      inputValue: event.target.value
    }));
  };

  const handleTrackEnd = useCallback(() => {
    setCurrentTrackIndex(prevIndex => {
      return prevIndex >= playlistTracks.length - 1 ? 0 : prevIndex + 1;
    });
  }, [playlistTracks.length]);

  const handleCleanup = useCallback((cleanup) => {
    window.audioCleanup = cleanup;
  }, []);

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
          ${sessionState.slideIn ? 'tw-top-1/3 tw-scale-150 tw-opacity-100' : 'tw-top-0 tw-scale-100 tw-opacity-70'}
        `}>
          Time to focus
        </p>

        {!sessionState.started && (
          <SessionInput
            inputValue={sessionState.inputValue}
            onInputChange={handleInputChange}
            onBeginClick={handleBeginSession}
            fadeOut={sessionState.slideIn}
          />
        )}

        {sessionState.started && isAudioVerified && (
          <ControlBar
            setTimerActive={setTimerActive}
            volume={volume}
            onVolumeChange={onVolumeChange}
            audioFiles={playlistTracks.map(track => `/mp3s/${track.fileName}`)}
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
