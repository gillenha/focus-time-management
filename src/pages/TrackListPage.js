import React, { useState, useEffect } from 'react';

function TrackListPage({ onClose, isExiting, playlistTracks, setPlaylistTracks }) {
    const [uploadedTracks, setUploadedTracks] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [selectedTracks, setSelectedTracks] = useState(new Set());
    const [totalStorageSize, setTotalStorageSize] = useState(0);
    const MAX_STORAGE_SIZE = 5 * 1024 * 1024 * 1024; // 5GB in bytes

    const fetchTracks = async () => {
        try {
            let tracks;
            let totalSize = 0;
            
            if (process.env.NODE_ENV === 'production') {
                // In production, fetch from Google Cloud Storage
                const response = await fetch('https://storage.googleapis.com/storage/v1/b/react-app-assets/o');
                const data = await response.json();
                tracks = data.items
                    .filter(item => item.name.endsWith('.mp3'))
                    .map(item => ({
                        name: item.name,
                        size: parseInt(item.size)
                    }));
                totalSize = tracks.reduce((acc, track) => acc + track.size, 0);
            } else {
                // In development, use local endpoint
                const response = await fetch('http://localhost:3001/mp3s');
                const data = await response.json();
                
                // Get file sizes for local files
                const sizeResponse = await fetch('http://localhost:3001/mp3s/sizes');
                const sizeData = await sizeResponse.json();
                
                // Map the local files to match the expected structure
                tracks = data.mp3s.map(fileName => ({
                    name: fileName,
                    size: sizeData[fileName] || 0
                }));
                
                totalSize = Object.values(sizeData).reduce((acc, size) => acc + size, 0);
            }
            
            // Update total storage size
            setTotalStorageSize(totalSize);
            
            // Create unique IDs using filename hash
            const formattedTracks = tracks.map((track) => ({
                id: `upload-${track.name.replace(/[^a-zA-Z0-9]/g, '')}`,
                title: track.name.replace('.mp3', ''),
                fileName: track.name,
                size: track.size
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
                // Only check file type
                if (!file.name.toLowerCase().endsWith('.mp3')) {
                    setUploadError('Only .mp3 files are allowed');
                    return;
                }

                // Check if adding this file would exceed storage limit
                if (totalStorageSize + file.size > MAX_STORAGE_SIZE) {
                    setUploadError('Storage limit of 5GB exceeded. Please delete some files before uploading more.');
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

                // Update total storage size
                setTotalStorageSize(prev => prev + file.size);
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

        // Prevent moving if it's the last track in playlist
        if (sourceList === 'playlist' && playlistTracks.length <= 1) {
            return; // Early return if trying to remove last track
        }

        if (targetList === 'playlist' && 
            playlistTracks.some(t => t.fileName === track.fileName)) {
            return;
        }

        if (targetList === 'uploaded' && 
            uploadedTracks.some(t => t.fileName === track.fileName)) {
            return;
        }

        if (sourceList === 'uploaded') {
            setUploadedTracks(current => 
                current.filter(t => t.fileName !== track.fileName)
            );
        } else {
            setPlaylistTracks(current => 
                current.filter(t => t.fileName !== track.fileName)
            );
        }
        
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

    const handleTrackClick = (track, sourceList) => {
        const targetList = sourceList === 'uploaded' ? 'playlist' : 'uploaded';
        
        // Prevent moving if it's the last track in playlist
        if (sourceList === 'playlist' && playlistTracks.length <= 1) {
            return; // Early return if trying to remove last track
        }

        if (targetList === 'playlist' && 
            playlistTracks.some(t => t.fileName === track.fileName)) {
            return;
        }

        if (targetList === 'uploaded' && 
            uploadedTracks.some(t => t.fileName === track.fileName)) {
            return;
        }

        if (sourceList === 'uploaded') {
            setUploadedTracks(current => 
                current.filter(t => t.fileName !== track.fileName)
            );
        } else {
            setPlaylistTracks(current => 
                current.filter(t => t.fileName !== track.fileName)
            );
        }
        
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

    // Add storage usage indicator
    const StorageUsage = () => {
        const usagePercentage = (totalStorageSize / MAX_STORAGE_SIZE) * 100;
        const usageGB = (totalStorageSize / (1024 * 1024 * 1024)).toFixed(2);
        
        return (
            <div className="tw-mb-4">
                <div className="tw-flex tw-justify-between tw-text-sm tw-text-gray-600 tw-mb-1">
                    <span>Storage Used: {usageGB}GB / 5GB</span>
                    <span>{usagePercentage.toFixed(1)}%</span>
                </div>
                <div className="tw-w-full tw-bg-gray-200 tw-rounded-full tw-h-2">
                    <div 
                        className={`tw-h-2 tw-rounded-full ${
                            usagePercentage > 90 ? 'tw-bg-red-500' : 
                            usagePercentage > 70 ? 'tw-bg-yellow-500' : 
                            'tw-bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                    ></div>
                </div>
            </div>
        );
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
                            <div className="tw-flex tw-flex-col tw-gap-4 tw-mb-4">
                                <div className="tw-flex tw-items-center tw-justify-between">
                                    <h3 className="tw-text-lg tw-font-bold tw-text-gray-800">Uploaded Tracks</h3>
                                    <div className="tw-flex tw-items-center tw-gap-2">
                                        {selectedTracks.size > 0 && (
                                            <button
                                                onClick={handleDeleteSelected}
                                                className="btn-danger"
                                            >
                                                Delete Selected
                                            </button>
                                        )}
                                        <div className="tw-relative">
                                            <input
                                                type="file"
                                                onChange={handleFileUpload}
                                                accept=".mp3"
                                                multiple
                                                className="tw-hidden"
                                                id="file-upload"
                                            />
                                            <label 
                                                htmlFor="file-upload" 
                                                className={`btn-primary tw-inline-flex tw-items-center ${isUploading ? 'disabled' : ''}`}
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
                                <StorageUsage />
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