import React, { useState } from 'react';

function VolumeBar({ volume, onVolumeChange }) {
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(volume);
  const [clickTimeout, setClickTimeout] = useState(null);
  const [lastClickPosition, setLastClickPosition] = useState(null);

  const handleIconClick = () => {
    if (isMuted) {
      onVolumeChange({ target: { value: previousVolume } });
    } else {
      setPreviousVolume(volume);
      onVolumeChange({ target: { value: 0 } });
    }
    setIsMuted(!isMuted);
  };

  const handleSliderChange = (event) => {
    const newVolume = parseFloat(event.target.value);
    if (newVolume === 0) {
      setIsMuted(true);
    } else {
      setIsMuted(false);
    }
    onVolumeChange(event);
  };

  const handleMouseDown = (event) => {
    const clickPosition = event.clientX;
    if (clickTimeout && Math.abs(clickPosition - lastClickPosition) < 5) {
      // If the second click is within 5 pixels of the first, consider it a double-click
      clearTimeout(clickTimeout);
      setClickTimeout(null);
      handleDoubleClick();
    } else {
      // Set a timeout to reset the click state if no double-click occurs
      setLastClickPosition(clickPosition);
      setClickTimeout(setTimeout(() => setClickTimeout(null), 300));
    }
  };

  const handleDoubleClick = () => {
    setIsMuted(false);
    onVolumeChange({ target: { value: 0.5 } }); // Reset to 50% volume
  };

  return (
    <div className="volume-bar-container">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={isMuted ? "#888888" : "#ffffff"} // Grey out the icon when muted
        className="volume-icon"
        onClick={handleIconClick}
        style={{ cursor: 'pointer' }}
      >
        <path d="M3 10v4h4l5 5V5L7 10H3zm13.5 2c0-1.77-1.02-3.29-2.5-4.03v8.06c1.48-.74 2.5-2.26 2.5-4.03zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
      </svg>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={isMuted ? 0 : volume}
        onChange={handleSliderChange}
        onMouseDown={handleMouseDown} // Use mouse down to detect double-click
        className="volume-slider"
        style={{ opacity: isMuted ? 0.5 : 1 }}
      />
    </div>
  );
}

export default VolumeBar;
