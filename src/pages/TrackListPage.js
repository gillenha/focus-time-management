import React, { useState, useEffect } from 'react';

function TrackListPage({ onClose, isExiting, playlistTracks, setPlaylistTracks }) {
    const [uploadedTracks, setUploadedTracks] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [selectedTracks, setSelectedTracks] = useState(new Set());
    const [totalStorageSize, setTotalStorageSize] = useState(0);
    const MAX_STORAGE_SIZE = 5 * 1024 * 1024 * 1024; // 5GB in bytes
    const [uploadProgress, setUploadProgress] = useState(0);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadStatus, setUploadStatus] = useState('');

    const fetchTracks = async () => {
        try {
            console.log('Fetching tracks from server...');
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/files/list-tracks`);
            if (!response.ok) {
                throw new Error('Failed to fetch tracks');
            }
            
            const data = await response.json();
            console.log('Received tracks:', data);

            if (!data.items || !Array.isArray(data.items)) {
                console.error('Unexpected response format:', data);
                return;
            }

            const tracks = data.items.map(item => ({
                name: item.name.split('/').pop(), // Remove folder prefix
                size: parseInt(item.size),
                fullPath: item.name // Keep the full path for audio playback
            }));
            
            const totalSize = tracks.reduce((acc, track) => acc + track.size, 0);
            setTotalStorageSize(totalSize);
            
            // Create unique IDs using filename hash
            const formattedTracks = tracks.map((track) => ({
                id: `upload-${track.name.replace(/[^a-zA-Z0-9]/g, '')}`,
                title: track.name.replace('.mp3', ''),
                fileName: track.fullPath, // Use full path for audio playback
                size: track.size
            }));
            
            // Filter out tracks that are already in playlist
            const filteredTracks = formattedTracks.filter(track => 
                !playlistTracks.some(pTrack => pTrack.fileName === track.fileName)
            );
            
            console.log('Setting uploaded tracks:', filteredTracks);
            setUploadedTracks(filteredTracks);
        } catch (error) {
            console.error('Error fetching tracks:', error);
        }
    };

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        console.log('File selected:', {
            name: file.name,
            size: file.size,
            type: file.type
        });

        if (!file.name.toLowerCase().endsWith('.mp3')) {
            setUploadError('Only .mp3 files are allowed');
            return;
        }

        if (totalStorageSize + file.size > MAX_STORAGE_SIZE) {
            setUploadError('Storage limit of 5GB exceeded. Please delete some files before uploading more.');
            return;
        }

        setSelectedFile(file);
        setUploadError('');
    };

    const startUpload = async () => {
        if (!selectedFile) return;

        setIsUploading(true);
        setUploadStatus('Preparing upload...');
        setUploadProgress(0);

        try {
            const CHUNK_SIZE = 25 * 1024 * 1024; // 25MB chunks (to be safe under 32MB limit)
            const totalChunks = Math.ceil(selectedFile.size / CHUNK_SIZE);
            let uploadedChunks = 0;

            // Initialize upload session
            const initResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/files/init-upload`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fileName: selectedFile.name,
                    fileSize: selectedFile.size,
                    totalChunks
                })
            });

            if (!initResponse.ok) {
                throw new Error('Failed to initialize upload');
            }

            const { uploadId } = await initResponse.json();
            
            // Upload chunks
            for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
                const start = chunkIndex * CHUNK_SIZE;
                const end = Math.min(start + CHUNK_SIZE, selectedFile.size);
                const chunk = selectedFile.slice(start, end);
                
                setUploadStatus(`Uploading chunk ${chunkIndex + 1} of ${totalChunks}`);

                const formData = new FormData();
                formData.append('chunk', chunk, `chunk-${chunkIndex}.mp3`);
                formData.append('uploadId', uploadId);
                formData.append('chunkIndex', chunkIndex.toString());
                formData.append('totalChunks', totalChunks.toString());

                const response = await fetch(`${process.env.REACT_APP_API_URL}/api/files/upload-chunk`, {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error(`Failed to upload chunk ${chunkIndex + 1}`);
                }

                uploadedChunks++;
                const progress = (uploadedChunks / totalChunks) * 100;
                setUploadProgress(progress);
            }

            // Finalize upload
            setUploadStatus('Finalizing upload...');
            const finalizeResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/files/finalize-upload`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    uploadId,
                    fileName: selectedFile.name,
                    totalChunks
                })
            });

            if (!finalizeResponse.ok) {
                throw new Error('Failed to finalize upload');
            }

            setUploadStatus('Upload complete!');
            setTotalStorageSize(prev => prev + selectedFile.size);
            await fetchTracks();
            
        } catch (error) {
            console.error('Upload error:', error);
            setUploadError(error.message || 'Failed to upload file');
        } finally {
            setSelectedFile(null);
            setIsUploading(false);
            // Reset the file input
            const fileInput = document.getElementById('file-select');
            if (fileInput) {
                fileInput.value = '';
            }
        }
    };

    const clearUpload = () => {
        setSelectedFile(null);
        setIsUploading(false);
        setUploadError('');
        setUploadStatus('');
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
                // Always delete from Google Cloud Storage bucket
                // The fileName should include the folder (test/ or tracks/)
                const response = await fetch(`${process.env.REACT_APP_API_URL}/api/files/${track.fileName}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error('Delete response:', errorData);
                    throw new Error(`Failed to delete ${track.fileName}: ${errorData.error || 'Unknown error'}`);
                }

                console.log(`Successfully deleted: ${track.fileName}`);
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
                <div className="tw-p-4 md:tw-p-6">
                    {/* Header */}
                    <div className="tw-flex tw-items-center tw-mb-6">
                        <button
                            onClick={onClose}
                            className="tw-appearance-none tw-bg-transparent tw-border-none tw-p-0 tw-m-0 tw-mr-4 tw-text-gray-500 tw-cursor-pointer"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="tw-w-6 tw-h-6"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M19 12H5M12 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <h2 className="tw-text-xl tw-font-bold tw-text-gray-800">Track List</h2>
                    </div>

                    {/* Main Content */}
                    <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-4">
                        {/* Uploaded Tracks Section */}
                        <div className="tw-bg-gray-50 tw-rounded-xl tw-p-4">
                            {/* Section Header */}
                            <div className="tw-mb-4">
                                <h3 className="tw-text-lg tw-font-bold tw-text-gray-800 tw-mb-2">Uploaded Tracks</h3>
                                
                                {/* Storage Usage */}
                                <StorageUsage />
                                
                                {/* Action Buttons - Simplified */}
                                <div className="tw-flex tw-justify-start tw-items-center tw-gap-4 tw-mt-4">
                                    <div>
                                        <button
                                            onClick={handleDeleteSelected}
                                            disabled={selectedTracks.size === 0}
                                            className={`danger-button ${selectedTracks.size === 0 ? 'disabled' : ''}`}
                                        >
                                            Delete Selected
                                        </button>
                                    </div>
                                </div>
                                {uploadError && (
                                    <div className="tw-mt-2 tw-text-sm tw-text-red-600">
                                        {uploadError}
                                    </div>
                                )}
                            </div>

                            {/* Tracks List */}
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

                        {/* Focus Playlist Section */}
                        <div className="tw-bg-gray-50 tw-rounded-xl tw-p-4">
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

                    {/* Upload Section */}
                    <div className="tw-mb-6">

                        
                        <div className="tw-flex tw-flex-col tw-gap-4">
                            <input
                                type="file"
                                accept=".mp3"
                                onChange={handleFileSelect}
                                disabled={isUploading}
                                className="tw-hidden"
                                id="file-select"
                            />
                            <label
                                htmlFor="file-select"
                                className={`primary-button tw-w-fit tw-px-4 ${isUploading ? 'disabled' : ''}`}
                            >
                                Select MP3 File
                            </label>

                            {selectedFile && !isUploading && (
                                <div className="tw-bg-gray-50 tw-p-4 tw-rounded-lg">
                                    <p className="tw-text-sm tw-text-gray-600">Selected: {selectedFile.name}</p>
                                    <p className="tw-text-sm tw-text-gray-600">Size: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                                    <div className="tw-flex tw-gap-4 tw-mt-4">
                                        <button
                                            onClick={startUpload}
                                            className="secondary-button"
                                        >
                                            Start Upload
                                        </button>
                                        <button
                                            onClick={clearUpload}
                                            className="secondary-button tw-bg-red-400/40 tw-text-red-900"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                </div>
                            )}

                            {isUploading && (
                                <div className="tw-bg-gray-50 tw-p-4 tw-rounded-lg">
                                    <p className="tw-text-sm tw-text-gray-600">{uploadStatus}</p>
                                    <div className="tw-w-full tw-bg-gray-200 tw-rounded-full tw-h-2 tw-mt-2">
                                        <div
                                            className="tw-h-2 tw-rounded-full tw-bg-blue-500"
                                            style={{ width: `${uploadProgress}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )}

                            {uploadError && (
                                <div className="tw-text-red-500 tw-text-sm">
                                    {uploadError}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default TrackListPage; 