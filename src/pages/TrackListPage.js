import React, { useState, useEffect } from 'react';

function TrackListPage({ onClose, isExiting, playlistTracks, setPlaylistTracks }) {
    const [uploadedTracks, setUploadedTracks] = useState([]);

    useEffect(() => {
        const fetchTracks = async () => {
            try {
                const response = await fetch('http://localhost:8080/mp3s');
                const data = await response.json();
                
                // Create unique IDs using filename hash
                const tracks = data.mp3s.map((fileName) => ({
                    id: `upload-${fileName.replace(/[^a-zA-Z0-9]/g, '')}`, // Create unique ID from filename
                    title: fileName.replace('.mp3', ''),
                    fileName: fileName
                }));
                
                // Filter out tracks that are already in playlist
                const filteredTracks = tracks.filter(track => 
                    !playlistTracks.some(pTrack => pTrack.fileName === track.fileName)
                );
                
                setUploadedTracks(filteredTracks);
            } catch (error) {
                console.error('Error fetching tracks:', error);
            }
        };

        fetchTracks();
    }, [playlistTracks]); // Re-fetch when playlist changes

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

        // Prevent duplicate drops
        if (targetList === 'playlist' && 
            playlistTracks.some(t => t.fileName === track.fileName)) {
            return;
        }

        if (targetList === 'uploaded' && 
            uploadedTracks.some(t => t.fileName === track.fileName)) {
            return;
        }

        // Remove from source
        if (sourceList === 'uploaded') {
            setUploadedTracks(current => 
                current.filter(t => t.fileName !== track.fileName)
            );
        } else {
            setPlaylistTracks(current => 
                current.filter(t => t.fileName !== track.fileName)
            );
        }
        
        // Add to target
        if (targetList === 'playlist') {
            // Ensure unique ID for playlist items
            const playlistTrack = {
                ...track,
                id: `playlist-${track.fileName.replace(/[^a-zA-Z0-9]/g, '')}`
            };
            setPlaylistTracks(current => [...current, playlistTrack]);
        } else {
            // Ensure unique ID for uploaded items
            const uploadedTrack = {
                ...track,
                id: `upload-${track.fileName.replace(/[^a-zA-Z0-9]/g, '')}`
            };
            setUploadedTracks(current => [...current, uploadedTrack]);
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