import React, { useState, useEffect, useRef, useCallback } from 'react';
import './MusicPlayer.css';
import ControlBar from './ControlBar';
import AudioManager from '../utils/audioManager';

function MusicPlayer({ isFreeflow, onBeginClick, stopAudio, setTimerActive, volume, onVolumeChange }) {
  const [buttonVisible, setButtonVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [audioFiles, setAudioFiles] = useState([]);
  const [currentAudioIndex, setCurrentAudioIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);
  const [slideIn, setSlideIn] = useState(false);

  // Simplified volume handling
  const updateAudioVolume = useCallback((newVolume) => {
    if (audioRef.current) {
      try {
        audioRef.current.volume = newVolume;
      } catch (error) {
        console.warn('Could not update audio volume:', error);
      }
    }
  }, []);

  // Effect to handle volume changes
  useEffect(() => {
    updateAudioVolume(volume);
  }, [volume, updateAudioVolume]);

  // Memoized playNextAudio function to prevent unnecessary recreations
  const playNextAudio = useCallback(() => {
    if (currentAudioIndex >= audioFiles.length) return;

    // Cleanup previous audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }

    const relativePath = audioFiles[currentAudioIndex];
    const audioUrl = AudioManager.getFullAudioUrl(relativePath);
    
    const audio = new Audio(audioUrl);
    
    // Set up audio before playing
    audio.volume = volume;

    const listeners = {
      loadeddata: () => {
        audio.play()
          .then(() => {
            setIsPlaying(true);
            setTimerActive(true);
          })
          .catch(error => {
            console.error('Play error:', error);
            setIsPlaying(false);
            setTimerActive(false);
          });
      },
      error: (e) => {
        console.error('Audio error:', {
          error: e,
          state: audio.readyState,
          volume: audio.volume,
          url: audioUrl
        });
      },
      ended: () => setCurrentAudioIndex(prev => prev + 1)
    };

    // Attach listeners
    Object.entries(listeners).forEach(([event, handler]) => {
      audio.addEventListener(event, handler);
    });

    audioRef.current = audio;

    // Return cleanup function
    return () => {
      Object.entries(listeners).forEach(([event, handler]) => {
        audio.removeEventListener(event, handler);
      });
      audio.pause();
      audio.src = '';
    };
  }, [currentAudioIndex, audioFiles, volume, setTimerActive]);

  // Initial audio files fetch
  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const maxRetries = 3;

    const fetchAudioFiles = async () => {
      try {
        const files = await AudioManager.getManifest();
        if (mounted) {
          setAudioFiles(files);
        }
      } catch (error) {
        console.error('Manifest fetch error:', error);
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(fetchAudioFiles, 1000 * retryCount);
        }
      }
    };

    fetchAudioFiles();

    return () => {
      mounted = false;
    };
  }, []); // Only fetch on mount

  const handleClick = async () => {
    console.log('Begin button clicked');
    console.log('Input value:', inputValue);
    setFadeOut(true);
    
    const bellUrl = AudioManager.getBellAudioUrl();
    console.log('Playing bell sound from:', bellUrl);
    
    try {
        // Verify the bell sound exists before playing
        const isValid = await AudioManager.verifyAudio(bellUrl);
        if (!isValid) {
            console.warn('Bell sound not found, continuing without sound');
        } else {
            const audio = new Audio(bellUrl);
            await audio.play();
        }
        
        setTimeout(() => {
            setButtonVisible(false);
            setSlideIn(true);
            onBeginClick(inputValue);
            setTimeout(() => {
                playNextAudio();
            }, 3000);
        }, 1000);
    } catch (error) {
        console.error('Error playing bell sound:', error);
        // Continue with the flow even if bell sound fails
        setButtonVisible(false);
        setSlideIn(true);
        onBeginClick(inputValue);
        setTimeout(() => {
            playNextAudio();
        }, 3000);
    }
  };

  const handleInputChange = (event) => {
    setInputValue(event.target.value);
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

        {/* Text Input - Positioned above Begin Button */}
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
        <ControlBar
        isPlaying={isPlaying}
        onPlayPauseClick={handlePlayPauseClick}
        onNextTrackClick={handleNextTrackClick}
        volume={volume}
        onVolumeChange={onVolumeChange}
      />
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
