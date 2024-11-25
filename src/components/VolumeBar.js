import React, { useRef, useCallback, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faVolumeMute, faVolumeUp } from '@fortawesome/free-solid-svg-icons';
import './VolumeBar.css';

function VolumeBar({ volume, onVolumeChange }) {
  const sliderRef = useRef(null);
  const previousVolumeRef = useRef(volume);

  // Load saved volume on mount
  useEffect(() => {
    const savedVolume = localStorage.getItem('userVolume');
    if (savedVolume !== null) {
      onVolumeChange(parseFloat(savedVolume));
    }
  }, [onVolumeChange]);

  const handleMuteToggle = useCallback(() => {
    if (volume === 0) {
      // Unmute to previous volume, with a minimum of 0.1
      const prevVolume = Math.max(previousVolumeRef.current, 0.1);
      onVolumeChange(prevVolume);
      localStorage.setItem('userVolume', prevVolume.toString());
    } else {
      // Store current volume before muting
      previousVolumeRef.current = volume;
      onVolumeChange(0);
      localStorage.setItem('userVolume', '0');
    }
  }, [volume, onVolumeChange]);

  const handleSliderChange = useCallback((event) => {
    const newVolume = parseFloat(event.target.value) / 100;
    onVolumeChange(newVolume);
    localStorage.setItem('userVolume', newVolume.toString());
    
    // Update previous volume ref if not muted
    if (newVolume > 0) {
      previousVolumeRef.current = newVolume;
    }
  }, [onVolumeChange]);

  return (
    <div className="volume-bar-container">
      <button 
        className="volume-icon" 
        onClick={handleMuteToggle}
        aria-label={volume === 0 ? "Unmute" : "Mute"}
      >
        <FontAwesomeIcon 
          icon={volume === 0 ? faVolumeMute : faVolumeUp} 
          style={{ color: 'white' }} 
        />
      </button>
      <input
        ref={sliderRef}
        type="range"
        className="volume-slider"
        min="0"
        max="100"
        value={volume * 100}
        onChange={handleSliderChange}
        aria-label="Volume Control"
        style={{ '--value': `${volume * 100}%` }}
      />
    </div>
  );
}

export default VolumeBar;
