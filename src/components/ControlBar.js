import React from 'react';
import './ControlBar.css';

function ControlBar({ onPlayPauseClick, isPlaying, onNextTrackClick }) {
  return (
    <div className="control-bar">
      <button onClick={onPlayPauseClick} className="control-button">
        <i className={`fa ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
      </button>
      <button onClick={onNextTrackClick} className="control-button">
        <i className="fa fa-step-forward"></i>
      </button>
    </div>
  );
}

export default ControlBar;
