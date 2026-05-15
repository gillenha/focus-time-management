import React, { useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faVolumeMute, faVolumeUp } from '@fortawesome/free-solid-svg-icons';

function VolumeBar({ volume, onVolumeChange }) {
  const previousVolumeRef = useRef(volume);

  const handleMuteToggle = useCallback(() => {
    if (volume === 0) {
      const prevVolume = Math.max(previousVolumeRef.current, 0.1);
      onVolumeChange(prevVolume);
      localStorage.setItem('userVolume', prevVolume.toString());
    } else {
      previousVolumeRef.current = volume;
      onVolumeChange(0);
      localStorage.setItem('userVolume', '0');
    }
  }, [volume, onVolumeChange]);

  const handleSliderChange = useCallback((event) => {
    const newVolume = parseFloat(event.target.value) / 100;
    onVolumeChange(newVolume);
    localStorage.setItem('userVolume', newVolume.toString());
    if (newVolume > 0) {
      previousVolumeRef.current = newVolume;
    }
  }, [onVolumeChange]);

  return (
    <div className="tw-hidden md:tw-flex tw-items-center tw-gap-2">
      <button
        className="tw-bg-transparent tw-border-0 tw-cursor-pointer tw-w-7 tw-h-7 tw-flex tw-items-center tw-justify-center tw-text-white hover:tw-opacity-80 active:tw-scale-95 tw-transition-all tw-outline-none focus:tw-outline-none tw-rounded-full"
        onClick={handleMuteToggle}
        aria-label={volume === 0 ? 'Unmute' : 'Mute'}
      >
        <FontAwesomeIcon icon={volume === 0 ? faVolumeMute : faVolumeUp} style={{ color: 'white' }} />
      </button>
      <input
        type="range"
        className="vol-slider tw-w-[120px] tw-h-2 tw-rounded tw-outline-none tw-cursor-pointer tw-appearance-none"
        min="0"
        max="100"
        value={volume * 100}
        onChange={handleSliderChange}
        aria-label="Volume Control"
        style={{
          background: `linear-gradient(to right, #614734 0%, #614734 ${volume * 100}%, #6b7280 ${volume * 100}%, #6b7280 100%)`
        }}
      />
    </div>
  );
}

export default VolumeBar;
