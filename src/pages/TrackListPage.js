import React, { useState } from 'react';

function TrackListPage({ onClose, isExiting }) {
    const [uploadedTracks, setUploadedTracks] = useState([
        { id: 'track-1', title: 'Peaceful Piano' },
        { id: 'track-2', title: 'Ambient Sounds' },
        { id: 'track-3', title: 'Rain Sounds' },
        { id: 'track-4', title: 'Forest Ambience' },
        { id: 'track-5', title: 'Ocean Waves' },
    ]);

    const [playlistTracks, setPlaylistTracks] = useState([
        { id: 'playlist-1', title: 'Meditation Music' },
        { id: 'playlist-2', title: 'Study Focus' },
    ]);

    const handleDragStart = (track, sourceList) => (event) => {
        event.dataTransfer.setData('track', JSON.stringify(track));
        event.dataTransfer.setData('sourceList', sourceList);
    };

    const handleDragOver = (event) => {
        event.preventDefault();
    };

    const handleDrop = (targetList) => (event) => {
        event.preventDefault();
        const track = JSON.parse(event.dataTransfer.getData('track'));
        const sourceList = event.dataTransfer.getData('sourceList');

        // Remove from source list
        if (sourceList === 'uploaded') {
            setUploadedTracks(current => 
                current.filter(t => t.id !== track.id)
            );
        } else {
            setPlaylistTracks(current => 
                current.filter(t => t.id !== track.id)
            );
        }
        
        // Add to target list
        if (targetList === 'playlist') {
            setPlaylistTracks(current => [...current, track]);
        } else {
            setUploadedTracks(current => [...current, track]);
        }
    };

    const TrackItem = ({ track, sourceList }) => (
        <div
            draggable
            onDragStart={handleDragStart(track, sourceList)}
            className="tw-p-3 tw-mb-2 tw-rounded-lg tw-bg-white tw-border tw-border-gray-200 
                       hover:tw-bg-gray-50 tw-cursor-grab"
        >
            {track.title}
        </div>
    );

    return (
        <div className={`tw-fixed tw-inset-0 tw-bg-white tw-z-50 ${isExiting ? 'slide-out' : 'slide-in'}`}>
            <div className="tw-h-full tw-overflow-y-auto">
                <div className="tw-p-6">
                    {/* Header */}
                    <div className="tw-flex tw-items-center tw-justify-between tw-mb-8">
                        <div className="tw-flex tw-items-center">
                            <button
                                onClick={onClose}
                                className="tw-appearance-none tw-bg-transparent tw-border-none tw-p-0 tw-m-0 tw-mr-4 tw-text-gray-500 tw-cursor-pointer"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="tw-w-6 tw-h-6"
                                >
                                    <path d="M19 12H5M12 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <h2 className="tw-text-xl tw-font-bold tw-text-gray-800">Track List</h2>
                        </div>
                    </div>

                    {/* Two-Column Layout */}
                    <div className="tw-grid tw-grid-cols-2 tw-gap-6">
                        {/* Uploaded Tracks Column */}
                        <div className="tw-bg-gray-50 tw-p-4 tw-rounded-xl">
                            <h3 className="tw-text-lg tw-font-bold tw-text-gray-800 tw-mb-4">Uploaded Tracks</h3>
                            <div 
                                className="tw-min-h-[200px]"
                                onDragOver={handleDragOver}
                                onDrop={handleDrop('uploaded')}
                            >
                                {uploadedTracks.map((track) => (
                                    <TrackItem 
                                        key={track.id} 
                                        track={track} 
                                        sourceList="uploaded"
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Focus Playlist Column */}
                        <div className="tw-bg-gray-50 tw-p-4 tw-rounded-xl">
                            <h3 className="tw-text-lg tw-font-bold tw-text-gray-800 tw-mb-4">My Focus Playlist</h3>
                            <div 
                                className="tw-min-h-[200px]"
                                onDragOver={handleDragOver}
                                onDrop={handleDrop('playlist')}
                            >
                                {playlistTracks.map((track) => (
                                    <TrackItem 
                                        key={track.id} 
                                        track={track} 
                                        sourceList="playlist"
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default TrackListPage; 