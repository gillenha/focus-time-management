import React, { useState, useEffect, useRef } from 'react';
import './MusicPlayer.css';
import ControlBar from './ControlBar';

function MusicPlayer({ isFreeflow, onBeginClick, stopAudio, setTimerActive }) {
  const [buttonVisible, setButtonVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [audioFiles, setAudioFiles] = useState([]);
  const [currentAudioIndex, setCurrentAudioIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false); // New state for play/pause
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
      audio.play();
      setIsPlaying(true);
      setTimerActive(true); // Start the timer when audio starts playing
      audio.onended = () => {
        setCurrentAudioIndex(prevIndex => prevIndex + 1);
      };
    }
  };

  const handlePlayPauseClick = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setTimerActive(false); // Stop the timer when audio is paused
      } else {
        audioRef.current.play();
        setTimerActive(true); // Start the timer when audio is playing
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleNextTrackClick = () => {
    console.log('Next track button clicked');
  };

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
      setTimerActive(false); // Stop the timer when freeflow ends
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