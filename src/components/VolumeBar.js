import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faVolumeMute, faVolumeUp } from '@fortawesome/free-solid-svg-icons';
import './VolumeBar.css';

function VolumeBar({ volume, onVolumeChange }) {
  const handleVolumeChange = (event) => {
    const newVolume = parseFloat(event.target.value);
    onVolumeChange({ target: { value: newVolume } });
  };

  return (
    <div className="volume-bar-container">
      <div className="volume-icon">
        <FontAwesomeIcon 
          icon={volume === 0 ? faVolumeMute : faVolumeUp} 
          style={{ color: 'white' }} 
        />
      </div>
      <input
        type="range"
        className="volume-slider"
        min="0"
        max="1"
        step="0.1"
        value={volume}
        onChange={handleVolumeChange}
      />
    </div>
  );
}

export default VolumeBar;
