import React, { useState, useCallback, useEffect, useRef } from 'react';
import './MusicPlayer.css';
import ControlBar from './ControlBar';
import SessionInput from './SessionInput';
import AudioManager from '../utils/audioManager';
import { fetchQuotes } from '../services/quotesService';
import { toast } from 'react-toastify';

const QUOTE_ROTATION_INTERVAL = 15 * 60 * 1000; // 15 minutes in milliseconds

function JumpButton({ controlBarRef }) {
  const handleJump = () => {
    if (controlBarRef.current?.audioRef?.current) {
      const audio = controlBarRef.current.audioRef.current;
      const currentPosition = audio.currentTime;
      const duration = audio.duration;
      const newPosition = Math.min(currentPosition + 20, duration);
      controlBarRef.current.audioRef.current.seekToPosition(newPosition);
    }
  };

  return (
    <button
      onClick={handleJump}
      className={`
        tw-absolute tw-top-[30%] tw-left-1/2 tw--translate-x-1/2
        tw-bg-gray-600 tw-text-white tw-px-4 tw-py-2 tw-rounded-full
        tw-shadow-[0_4px_8px_rgba(0,0,0,0.25)] tw-border-0
        tw-transition-all tw-duration-500 tw-ease-out
        hover:tw-bg-gray-700 hover:tw-shadow-lg
        tw-animate-fadeIn tw-cursor-pointer
      `}
    >
      →
    </button>
  );
}

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
  const [currentQuote, setCurrentQuote] = useState('');
  const [quotes, setQuotes] = useState([]);
  const [showQuote, setShowQuote] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [showJumpButton, setShowJumpButton] = useState(false);
  const controlBarRef = useRef(null);

  // Load quotes on mount
  useEffect(() => {
    const loadQuotes = async () => {
      try {
        const fetchedQuotes = await fetchQuotes();
        setQuotes(fetchedQuotes);
        // Set initial random quote
        if (fetchedQuotes.length > 0) {
          setCurrentQuote(fetchedQuotes[Math.floor(Math.random() * fetchedQuotes.length)]);
        }
      } catch (error) {
        console.error('Error loading quotes:', error);
      }
    };
    loadQuotes();
  }, []);

  useEffect(() => {
    if (sessionStarted) {
      verifyAudio();
      
      const controlsTimer = setTimeout(() => {
        setShowControls(true);
      }, 1000); // 1 second delay
      
      return () => clearTimeout(controlsTimer);
    } else {
      setShowControls(false);
    }
  }, [sessionStarted]);

  useEffect(() => {
    if (!sessionStarted || quotes.length === 0) return;

    const rotateQuote = () => {
      setCurrentQuote(prevQuote => {
        const currentIndex = quotes.indexOf(prevQuote);
        const nextIndex = (currentIndex + 1) % quotes.length;
        return quotes[nextIndex];
      });
    };

    const quoteInterval = setInterval(rotateQuote, QUOTE_ROTATION_INTERVAL);
    return () => clearInterval(quoteInterval);
  }, [sessionStarted, quotes]);

  useEffect(() => {
    if (sessionStarted) {
      const timer = setTimeout(() => {
        setShowQuote(true);
      }, 5000); // 5 second delay
      return () => clearTimeout(timer);
    } else {
      setShowQuote(false);
    }
  }, [sessionStarted]);

  // Add new effect for jump button
  useEffect(() => {
    if (showControls && showQuote) {
      const timer = setTimeout(() => {
        setShowJumpButton(true);
      }, 1000); // Show 1 second after controls and quote
      return () => clearTimeout(timer);
    }
  }, [showControls, showQuote]);

  const verifyAudio = async () => {
    if (playlistTracks.length === 0) {
      console.error('No tracks available to play');
      setIsAudioVerified(false);
      return false;
    }

    try {
      // Use the filename directly, AudioManager will handle the full URL
      const audioPath = playlistTracks[0].fileName;
      console.log('Verifying first track:', audioPath);
      
      const fullUrl = AudioManager.getFullAudioUrl(audioPath);
      const isValid = await AudioManager.verifyAudio(fullUrl);
      
      if (!isValid) {
        console.error('Audio verification failed. Please check if the audio files are available in the correct location.');
      }
      
      setIsAudioVerified(isValid);
      return isValid;
    } catch (error) {
      console.error('Audio verification failed:', error);
      setIsAudioVerified(false);
      return false;
    }
  };

  const handleBeginClick = (inputText, selectedProject) => {
    setSessionStarted(true);
    setSlideIn(true);
    onBeginClick(inputText, selectedProject);
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
    // AudioManager will handle the full URL construction
    return playlistTracks.map(track => track.fileName);
  }, [playlistTracks]);

  return (
    <div className={`
      tw-relative tw-flex tw-flex-col tw-items-center tw-justify-center 
      tw-w-full tw-h-full
      ${isFreeflow ? 'tw-animate-fadeIn' : 'tw-animate-fadeOut'}
    `}>
      <div className="tw-bg-black/30 tw-backdrop-blur-md tw-rounded-xl tw-p-8 tw-flex tw-flex-col tw-items-center tw-gap-6 tw-w-[90%] tw-max-w-[384px] tw-h-[400px] tw-min-h-[400px] sm:tw-w-96 tw-overflow-hidden tw-relative">
        <p className={`
          tw-text-white tw-font-medium tw-text-2xl tw-absolute
          tw-left-1/2 tw-transform tw-transition-all tw-duration-500
          tw-ease-out tw--translate-x-1/2 tw-z-10
          ${slideIn ? 'tw-top-1/3 tw-scale-150 tw-opacity-100' : 'tw-top-0 tw-scale-100 tw-opacity-70'}
        `}>
          Time to focus
        </p>

        {!sessionStarted && (
          <SessionInput
            inputValue={sessionInputValue}
            onInputChange={(e) => setSessionInputValue(e.target.value)}
            onBeginClick={handleBeginClick}
            fadeOut={sessionStarted}
          />
        )}

        {sessionStarted && (
          <>
            <p className={`
              tw-text-white/80 
              tw-text-sm 
              tw-mt-60 
              tw-italic
              tw-transition-opacity 
              tw-duration-1000
              ${showQuote ? 'tw-opacity-100' : 'tw-opacity-0'}
            `}>
              "{currentQuote.text}"
              {currentQuote.author && currentQuote.author !== 'Unknown' && (
                <span className="tw-text-white/60 tw-ml-1">- {currentQuote.author}</span>
              )}
            </p>
            <div className={`
              tw-transition-opacity 
              tw-duration-1000
              ${showControls ? 'tw-opacity-100' : 'tw-opacity-0'}
            `}>
              <ControlBar
                ref={controlBarRef}
                setTimerActive={setTimerActive}
                volume={volume}
                onVolumeChange={onVolumeChange}
                audioFiles={getAudioFiles()}
                onCleanup={handleCleanup}
                currentTrackIndex={currentTrackIndex}
                onTrackEnd={handleTrackEnd}
                isSequential={true}
              />
            </div>
            {showJumpButton && <JumpButton controlBarRef={controlBarRef} />}
          </>
        )}
      </div>
    </div>
  );
}

export default MusicPlayer;
