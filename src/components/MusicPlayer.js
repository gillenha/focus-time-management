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

  useEffect(() => {
    fetch('http://localhost:5001/mp3s')
      .then(response => response.json())
      .then(data => setAudioFiles(data.mp3s))
      .catch(error => console.error('Error fetching audio files:', error));
  }, []);

  const handleClick = async () => {
    console.log('Begin button clicked');
    console.log('Input value:', inputValue);
    setFadeOut(true);
    const audio = new Audio('/effects/bell.mp3');
    await audio.play();
    setTimeout(() => {
      setButtonVisible(false);
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
      const audio = new Audio(`http://localhost:5001/mp3s/${audioFiles[currentAudioIndex]}`);
      audioRef.current = audio;
      audio.volume = volume; // Set initial volume
      audio.play();
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

  // New useEffect to update volume when prop changes
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
    <div className={`music-player ${isFreeflow ? 'fade-in' : 'fade-out'}`}>
      <p>Time to focus</p>
      {buttonVisible && (
        <>
          <textarea
            value={inputValue}
            onChange={handleInputChange}
            placeholder="Enter text"
            className={`music-player-input ${fadeOut ? 'fade-out' : ''}`}
          />
          <button
            onClick={handleClick}
            className={`music-player-button ${fadeOut ? 'fade-out' : ''}`}
          >
            Begin
          </button>
        </>
      )}
      <ControlBar 
        onPlayPauseClick={handlePlayPauseClick} 
        isPlaying={isPlaying} 
        onNextTrackClick={handleNextTrackClick} 
      />
    </div>
  );
}

export default MusicPlayer;
