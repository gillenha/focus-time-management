import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faVolumeMute, faVolumeUp } from '@fortawesome/free-solid-svg-icons';
import './VolumeBar.css';

function VolumeBar({ volume, onVolumeChange }) {
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(volume);

  useEffect(() => {
    const slider = document.querySelector('.volume-slider');
    slider.style.setProperty('--value', `${volume * 100}%`); // Convert to percentage for CSS
  }, [volume]);

  const handleIconClick = () => {
    if (isMuted) {
      onVolumeChange({ target: { value: previousVolume } });
    } else {
      setPreviousVolume(volume);
      onVolumeChange({ target: { value: 0 } }); // Mute the audio
    }
    setIsMuted(!isMuted);
  };

  const handleDoubleClick = () => {
    onVolumeChange({ target: { value: 0.5 } }); // Reset volume to 50% (0.5 in range [0, 1])
  };

  const handleVolumeChange = (event) => {
    const newVolume = event.target.value / 100; // Convert to range [0, 1]
    onVolumeChange({ target: { value: newVolume } });
  };

  return (
    <div className={`volume-bar-container ${isMuted ? 'dimmed' : ''}`}>
      <div className="volume-icon" onClick={handleIconClick}>
        {isMuted ? (
          <FontAwesomeIcon icon={faVolumeMute} style={{ color: 'white' }} />
        ) : (
          <FontAwesomeIcon icon={faVolumeUp} style={{ color: 'white' }} />
        )}
      </div>
      <input
        type="range"
        className="volume-slider"
        min="0"
        max="100"
        value={volume * 100} // Convert to range [0, 100] for display
        onChange={handleVolumeChange}
        onDoubleClick={handleDoubleClick}
      />
    </div>
  );
}

export default VolumeBar;
