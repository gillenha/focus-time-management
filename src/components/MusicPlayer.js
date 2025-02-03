import React, { useState, useCallback, useEffect } from 'react';
import './MusicPlayer.css';
import ControlBar from './ControlBar';
import SessionInput from './SessionInput';
import AudioManager from '../utils/audioManager';
import { fetchQuotes } from '../services/quotesService';

const QUOTE_ROTATION_INTERVAL = 15 * 60 * 1000; // 15 minutes in milliseconds

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
            onInputChange={handleInputChange}
            onBeginClick={handleBeginSession}
            fadeOut={slideIn}
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
          </>
        )}
      </div>
    </div>
  );
}

export default MusicPlayer;
