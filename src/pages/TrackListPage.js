import React, { useState, useEffect } from 'react';

function TrackListPage({ onClose, isExiting, playlistTracks, setPlaylistTracks }) {
    const [uploadedTracks, setUploadedTracks] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [selectedTracks, setSelectedTracks] = useState(new Set());

    const fetchTracks = async () => {
        try {
            let tracks;
            if (process.env.NODE_ENV === 'production') {
                // In production, fetch from Google Cloud Storage
                const response = await fetch('https://storage.googleapis.com/storage/v1/b/react-app-assets/o');
                const data = await response.json();
                tracks = data.items
                    .filter(item => item.name.endsWith('.mp3'))
                    .map(item => item.name);
            } else {
                // In development, use local endpoint
                const response = await fetch('http://localhost:3001/mp3s');
                const data = await response.json();
                tracks = data.mp3s;
            }
            
            // Create unique IDs using filename hash
            const formattedTracks = tracks.map((fileName) => ({
                id: `upload-${fileName.replace(/[^a-zA-Z0-9]/g, '')}`,
                title: fileName.replace('.mp3', ''),
                fileName: fileName
            }));
            
            // Filter out tracks that are already in playlist
            const filteredTracks = formattedTracks.filter(track => 
                !playlistTracks.some(pTrack => pTrack.fileName === track.fileName)
            );
            
            setUploadedTracks(filteredTracks);
        } catch (error) {
            console.error('Error fetching tracks:', error);
        }
    };

    const handleFileUpload = async (event) => {
        const files = event.target.files;
        if (!files.length) return;

        setIsUploading(true);
        setUploadError('');
        
        try {
            for (const file of files) {
                // Strict .mp3 file check
                if (!file.name.toLowerCase().endsWith('.mp3')) {
                    setUploadError('Only .mp3 files are allowed');
                    return;
                }

                // Check file size (15MB)
                const MAX_SIZE = 15 * 1024 * 1024;
                if (file.size > MAX_SIZE) {
                    setUploadError(`File ${file.name} is too large. Maximum size is 15MB`);
                    return;
                }

                const formData = new FormData();
                formData.append('file', file);

                const response = await fetch(`${process.env.REACT_APP_API_URL}/upload`, {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || `Upload failed for ${file.name}`);
                }
            }
            
            await fetchTracks();
        } catch (error) {
            console.error('Upload error:', error);
            setUploadError(error.message || 'Failed to upload file(s)');
        } finally {
            setIsUploading(false);
            // Reset the file input
            event.target.value = '';
        }
    };

    useEffect(() => {
        fetchTracks();
    }, [playlistTracks]);

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

    const handleTrackClick = (track, sourceList) => {
        const targetList = sourceList === 'uploaded' ? 'playlist' : 'uploaded';
        
        // Use the same logic as handleDrop
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
            const playlistTrack = {
                ...track,
                id: `playlist-${track.fileName.replace(/[^a-zA-Z0-9]/g, '')}`
            };
            setPlaylistTracks(current => [...current, playlistTrack]);
        } else {
            const uploadedTrack = {
                ...track,
                id: `upload-${track.fileName.replace(/[^a-zA-Z0-9]/g, '')}`
            };
            setUploadedTracks(current => [...current, uploadedTrack]);
        }
    };

    const handleTrackSelect = (trackId) => {
        setSelectedTracks(prev => {
            const newSelected = new Set(prev);
            if (newSelected.has(trackId)) {
                newSelected.delete(trackId);
            } else {
                newSelected.add(trackId);
            }
            return newSelected;
        });
    };

    const handleDeleteSelected = async () => {
        const selectedTrackObjects = uploadedTracks.filter(track => selectedTracks.has(track.id));
        
        for (const track of selectedTrackObjects) {
            try {
                const response = await fetch(`${process.env.REACT_APP_API_URL}/mp3s/${track.fileName}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    throw new Error(`Failed to delete ${track.fileName}`);
                }
            } catch (error) {
                console.error('Delete error:', error);
                continue;
            }
        }

        // Refresh the track list
        await fetchTracks();
        // Clear selection
        setSelectedTracks(new Set());
    };

    const TrackItem = ({ track, sourceList }) => (
        <div
            className="tw-flex tw-items-center tw-gap-2 tw-p-3 tw-mb-2 tw-rounded-lg tw-bg-white tw-border tw-border-gray-200 
                     hover:tw-bg-gray-50"
        >
            {sourceList === 'uploaded' && (
                <input
                    type="checkbox"
                    checked={selectedTracks.has(track.id)}
                    onChange={() => handleTrackSelect(track.id)}
                    className="tw-w-4 tw-h-4 tw-rounded tw-border-gray-300 tw-text-blue-600 focus:tw-ring-blue-500"
                    onClick={e => e.stopPropagation()}
                />
            )}
            <div
                draggable
                onDragStart={handleDragStart(track, sourceList)}
                onClick={() => handleTrackClick(track, sourceList)}
                className="tw-flex-1 tw-cursor-pointer"
            >
                {track.title}
            </div>
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
                            <div className="tw-flex tw-items-center tw-justify-between tw-mb-4">
                                <h3 className="tw-text-lg tw-font-bold tw-text-gray-800">Uploaded Tracks</h3>
                                <div className="tw-flex tw-items-center tw-gap-2">
                                    {selectedTracks.size > 0 && (
                                        <button
                                            onClick={handleDeleteSelected}
                                            className="tw-px-3 tw-py-2 tw-rounded-lg tw-bg-red-600 tw-text-white 
                                                     tw-text-sm tw-font-medium hover:tw-bg-red-700 
                                                     tw-transition-colors"
                                        >
                                            Delete Selected
                                        </button>
                                    )}
                                    <div className="tw-relative">
                                        <input
                                            type="file"
                                            accept=".mp3"
                                            multiple
                                            onChange={handleFileUpload}
                                            className="tw-hidden"
                                            id="file-upload"
                                        />
                                        <label
                                            htmlFor="file-upload"
                                            className={`tw-inline-flex tw-items-center tw-px-3 tw-py-2 tw-rounded-lg 
                                                      tw-bg-blue-600 tw-text-white tw-text-sm tw-font-medium
                                                      hover:tw-bg-blue-700 tw-cursor-pointer tw-transition-colors
                                                      ${isUploading ? 'tw-opacity-75 tw-cursor-not-allowed' : ''}`}
                                        >
                                            {isUploading ? (
                                                <span>Uploading...</span>
                                            ) : (
                                                <>
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        className="tw-h-4 tw-w-4 tw-mr-2"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                                                        />
                                                    </svg>
                                                    Upload MP3
                                                </>
                                            )}
                                        </label>
                                        {uploadError && (
                                            <div className="tw-absolute tw-top-full tw-left-0 tw-mt-1 tw-text-sm tw-text-red-600">
                                                {uploadError}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
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