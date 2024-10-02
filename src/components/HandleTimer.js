import React from 'react';
import './HandleTimer.css';

function HandleTimer({ time, slideUp }) {
  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div className={`timer ${slideUp ? 'slide-up' : ''}`}>
      {formatTime(time)}
    </div>
  );
}

export default HandleTimer;
