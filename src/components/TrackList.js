import React from 'react';
import MusicPlayer from './MusicPlayer';

const TrackList = ({ tracks }) => {
  return (
    <div>
      <h2>Track List</h2>
      <ul>
        {tracks.map((track) => (
          <li key={track.id}>{track.title}</li>
        ))}
      </ul>
      <MusicPlayer tracks={tracks} />
    </div>
  );
};

export default TrackList;
