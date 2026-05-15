import React from 'react';
import './HandleTimer.css';

function HandleTimer({ time, position = 'center' }) {
  const formatTime = (time) => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = time % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  };

  return (
    <div className={`timer timer--${position}`}>
      {formatTime(time)}
    </div>
  );
}

export default HandleTimer;
