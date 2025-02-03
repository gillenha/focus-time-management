import React from 'react';
import './TrackList.css';

const TrackList = ({ tracks, onTrackClick, sourceList, selectedTracks, onTrackSelect }) => {
  return (
    <div className="track-list-container">
      {tracks.length === 0 ? (
        <div className="empty-state">
          <p className="tw-text-gray-400 tw-text-center tw-p-4">
            {sourceList === 'playlist' 
              ? 'At least one track must remain in your Focus Playlist.'
              : 'No tracks available.'}
          </p>
        </div>
      ) : (
        <ul className="tw-space-y-2">
          {tracks.map((track) => (
            <li 
              key={track.id}
              className={`
                tw-flex tw-items-center tw-justify-between tw-p-3 
                tw-bg-white/5 tw-rounded-lg hover:tw-bg-white/10 
                tw-cursor-pointer tw-transition-colors
                ${selectedTracks?.has(track.id) ? 'tw-bg-blue-500/20' : ''}
              `}
              onClick={() => onTrackClick?.(track, sourceList)}
            >
              <div className="tw-flex tw-items-center tw-space-x-3">
                {onTrackSelect && (
                  <input
                    type="checkbox"
                    checked={selectedTracks?.has(track.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      onTrackSelect(track.id);
                    }}
                    className="tw-form-checkbox tw-h-4 tw-w-4 tw-text-blue-500"
                  />
                )}
                <span className="tw-text-white/90">{track.title}</span>
              </div>
              {track.size && (
                <span className="tw-text-white/50 tw-text-sm">
                  {(track.size / (1024 * 1024)).toFixed(1)} MB
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TrackList;
