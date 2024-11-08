import React, { useState, useEffect, useRef } from 'react';
import './MusicPlayer.css';
import ControlBar from './ControlBar';

function MusicPlayer({ isFreeflow, onBeginClick, stopAudio, setTimerActive, volume }) {
  const [buttonVisible, setButtonVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [audioFiles, setAudioFiles] = useState([]);
  const [currentAudioIndex, setCurrentAudioIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);
  const [slideIn, setSlideIn] = useState(false);

  useEffect(() => {
    console.log('Attempting to fetch manifest from:', '/mp3s/manifest.json');
    fetch('/mp3s/manifest.json')
      .then(response => {
        console.log('Manifest response:', response);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text()  // Change to text() temporarily for debugging
          .then(text => {
            console.log('Raw response:', text);
            return JSON.parse(text);
          });
      })
      .then(urls => {
        console.log('Received audio URLs:', urls);
        setAudioFiles(urls);
      })
      .catch(error => {
        console.error('Error fetching audio manifest:', error);
        console.error('Error details:', error.message);
      });
  }, []);

  const handleClick = async () => {
    console.log('Begin button clicked');
    console.log('Input value:', inputValue);
    setFadeOut(true);
    const audio = new Audio('/effects/bell.mp3');
    await audio.play();
    setTimeout(() => {
      setButtonVisible(false);
      setSlideIn(true);
      onBeginClick(inputValue);
      setTimeout(() => {
        playNextAudio();
      }, 3000);
    }, 1000);
  };

  const handleInputChange = (event) => {
    setInputValue(event.target.value);
  };

  const playNextAudio = () => {
    if (currentAudioIndex < audioFiles.length) {
      const audioUrl = audioFiles[currentAudioIndex];
      console.log('Attempting to play:', audioUrl);
      
      const audio = new Audio(audioUrl);
      
      audio.addEventListener('loadstart', () => {
        console.log('Audio loading started');
      });
      
      audio.addEventListener('loadeddata', () => {
        console.log('Audio data loaded successfully');
      });
      
      audio.addEventListener('error', (e) => {
        console.error('Audio loading error:', {
          error: e,
          code: audio.error ? audio.error.code : 'No error code',
          message: audio.error ? audio.error.message : 'No error message',
          networkState: audio.networkState,
          readyState: audio.readyState
        });
      });
      
      audioRef.current = audio;
      audio.volume = volume;
      
      audio.play().catch(error => {
        console.error('Error playing audio:', error);
      });
      
      setIsPlaying(true);
      setTimerActive(true);
      audio.onended = () => {
        setCurrentAudioIndex(prevIndex => prevIndex + 1);
      };
    }
  };

  const handlePlayPauseClick = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setTimerActive(false);
      } else {
        audioRef.current.play();
        setTimerActive(true);
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleNextTrackClick = () => {
    console.log('Next track button clicked');
    // Implement logic to play the next track
  };

  const handleConnectToSpotify = () => {
    console.log('Connect to Spotify button clicked');
    // Implement logic to connect to Spotify
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (currentAudioIndex > 0 && currentAudioIndex < audioFiles.length) {
      setTimeout(() => {
        playNextAudio();
      }, 3000);
    }
  }, [currentAudioIndex]);

  useEffect(() => {
    if (!isFreeflow && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setTimerActive(false);
    }
  }, [isFreeflow]);

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
      {/* Container for music player box */}
      <div className="
        tw-bg-black/30 
        tw-backdrop-blur-md 
        tw-rounded-xl 
        tw-p-8 
        tw-flex 
        tw-flex-col 
        tw-items-center 
        tw-gap-6 
        tw-w-[90%]
        tw-max-w-[384px]
        tw-h-[400px]
        tw-min-h-[400px]
        sm:tw-w-96
        tw-overflow-hidden
      ">
        {/* Focus text */}
        <p className={`
          tw-text-white
          tw-font-medium
          tw-text-2xl
          tw-absolute           // Position absolutely in container
          tw-left-1/2          // Center horizontally
          tw-transform
          tw-transition-all
          tw-duration-500
          tw-ease-out
          tw--translate-x-1/2  // Center horizontally (offset)
          ${slideIn ? 
            'tw-top-1/3 tw-scale-150 tw-opacity-100'  // Slide to 25% from top
            : 
            'tw-top-0 tw-scale-100 tw-opacity-70'     // Start at top
          }`}>
          Time to focus
        </p>
        
        <div className="tw-flex tw-flex-row tw-items-center tw-justify-center tw-gap-4">
          {/* Connect to Spotify Button */}
        <button 
          onClick={handleConnectToSpotify}
          className={`
            tw-absolute
            tw-bottom-0
            tw-left-1/8
            tw--translate-x-1/8
            tw-px-4
            tw-py-2
            tw-bg-green-500
            tw-text-white
            tw-rounded-full
            tw-font-medium
            tw-border-0
            hover:tw-bg-green-600
            tw-cursor-pointer
            tw-transition-colors
          `}
        >
          Connect to Spotify
        </button>

        <textarea
          value={inputValue}
          onChange={handleInputChange}
          placeholder="What do you want to focus on?"
          className={`
            // Positioning
            tw-absolute
            tw-bottom-44        // 176px from bottom
            tw-left-1/2
            tw--translate-x-1/2
            
            // Dimensions
            tw-w-[83%]
            tw-h-32
            
            // Styling
            tw-bg-white
            tw-rounded-lg
            tw-p-4
            
            // Typography
            tw-font-sans
            tw-text-lg
            tw-text-gray-800
            
            // Behavior
            tw-resize-none
            tw-outline-none
            tw-transition-all
            
            // Animation
            ${fadeOut ? 'tw-animate-fadeOut' : 'tw-opacity-100'}
          `}
        />

        {/* Begin Button - Positioned above Control Bar */}
        <button
          onClick={handleClick}
          className={`
            // Positioning
            tw-absolute
            tw-bottom-24        // 96px from bottom
            tw-left-1/2
            tw--translate-x-1/2
            
            // Dimensions
            tw-w-[90%]
            tw-py-3
            
            // Styling
            tw-bg-gray-700
            tw-rounded-lg
            tw-shadow-[0_4px_8px_rgba(0,0,0,0.25)]
            
            // Typography
            tw-font-sans
            tw-text-lg
            tw-text-white
            
            // Behavior
            tw-cursor-pointer
            tw-border-0
            tw-transition-all
            
            // Animation
            ${fadeOut ? 'tw-animate-fadeOut' : 'tw-opacity-100'}
          `}
        >
          Begin Session
          </button>
        </div>

        {/* Control Bar - Fixed at bottom */}
        <div className="
          // Positioning
          tw-absolute
          tw-bottom-8         // 32px from bottom
          tw-left-0
          tw-right-0
          
          // Layout
          tw-flex
          tw-justify-center
          tw-gap-4
          
          // Dimensions
          tw-h-[10%]
        ">
          <button 
            onClick={handlePlayPauseClick}
            className="
              // Dimensions
              tw-w-12
              tw-h-12
              
              // Layout
              tw-flex
              tw-items-center
              tw-justify-center
              
              // Styling
              tw-bg-gray-600
              tw-rounded-full
              tw-shadow-[0_4px_8px_rgba(0,0,0,0.25)]
              
              // Behavior
              tw-border-0
              tw-outline-none
              focus:tw-outline-none
              hover:tw-cursor-pointer
              tw-transition-all
            "
          >
            {isPlaying ? (
              // Pause SVG
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
              // Play SVG
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
            onClick={handleNextTrackClick}
            className="
              tw-w-12 
              tw-h-12 
              tw-flex 
              tw-flex-row 
              tw-items-center 
              tw-gap-2 
              tw-justify-center 
              tw-bg-gray-600
              tw-rounded-full 
              hover:tw-cursor-pointer 
              tw-transition-all
              tw-border-0
              tw-outline-none
              focus:tw-outline-none
              tw-shadow-[0_4px_8px_rgba(0,0,0,0.25)]
            "
          >
            {/* Next Track SVG */}
            <svg 
              className="tw-w-6 tw-h-6 tw-fill-white" 
              viewBox="0 0 24 24"
            >
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default MusicPlayer;
