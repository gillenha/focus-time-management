import React from 'react';
import MusicPlayer from './MusicPlayer';

const TrackList = ({ tracks }) => {
  return (
    <div className="track-list-container">
      <h2>Track List</h2>
      {tracks.length === 0 ? (
        <div className="empty-state">
          <p className="tw-text-gray-400 tw-text-center tw-p-4">
            At least one track must remain in your Focus Playlist.
          </p>
        </div>
      ) : (
        <ul>
          {tracks.map((track) => (
            <li key={track.id}>{track.title}</li>
          ))}
        </ul>
      )}
      <MusicPlayer tracks={tracks} />
    </div>
  );
};

export default TrackList;
