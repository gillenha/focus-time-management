import React, { useState, useEffect } from 'react';
import { DeleteDialog } from '../components/shared';
import uploadManager from '../utils/uploadManager';

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
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [tracksToDelete, setTracksToDelete] = useState([]);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploadQueue, setUploadQueue] = useState([]);
    const [isDragOver, setIsDragOver] = useState(false);

    const fetchTracks = async () => {
        try {
            const apiUrl = process.env.REACT_APP_API_URL || 'http://devpigh.local:8082';
            console.log('Fetching tracks from server...');
            console.log('Using API URL:', apiUrl);
            const response = await fetch(`${apiUrl}/api/files/list-tracks`);
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
        const files = Array.from(event.target.files || []);
        if (files.length === 0) return;

        addFilesToQueue(files);
    };

    const addFilesToQueue = (files) => {
        const validFiles = [];
        let totalNewSize = 0;
        const errors = [];

        for (const file of files) {
            console.log('Processing file:', {
                name: file.name,
                size: file.size,
                type: file.type
            });

            if (!file.name.toLowerCase().endsWith('.mp3')) {
                errors.push(`${file.name}: Only .mp3 files are allowed`);
                continue;
            }

            // Check if file already exists in upload queue or uploaded tracks
            const isDuplicate = uploadQueue.some(queueItem => queueItem.file.name === file.name) ||
                              uploadedTracks.some(track => track.title === file.name.replace('.mp3', '')) ||
                              selectedFiles.some(selectedFile => selectedFile.name === file.name);
            
            if (isDuplicate) {
                errors.push(`${file.name}: File already selected or uploaded`);
                continue;
            }

            totalNewSize += file.size;
            validFiles.push(file);
        }

        // Check storage limit for all new files combined
        if (totalStorageSize + totalNewSize > MAX_STORAGE_SIZE) {
            setUploadError('Storage limit of 5GB would be exceeded. Please delete some files before uploading more.');
            return;
        }

        if (errors.length > 0) {
            setUploadError(errors.join('; '));
        } else {
            setUploadError('');
        }

        if (validFiles.length > 0) {
            setSelectedFiles(prev => [...prev, ...validFiles]);
        }
    };

    const startMultiUpload = async () => {
        if (selectedFiles.length === 0) return;

        setIsUploading(true);
        const apiUrl = process.env.REACT_APP_API_URL || 'http://devpigh.local:8082';
        
        try {
            // Add files to upload manager queue
            const uploadIds = uploadManager.addFiles(selectedFiles, apiUrl);
            
            console.log(`Started upload for ${selectedFiles.length} files:`, uploadIds);
            
            // Update total storage size estimate
            const totalNewSize = selectedFiles.reduce((acc, file) => acc + file.size, 0);
            setTotalStorageSize(prev => prev + totalNewSize);
            
            // Clear selected files
            setSelectedFiles([]);
            setUploadError('');
            
        } catch (error) {
            console.error('Upload initialization error:', error);
            setUploadError(error.message || 'Failed to start upload');
            setIsUploading(false);
        }
    };

    const retryFailedUploads = () => {
        uploadManager.retryFailedUploads();
    };

    const cancelUpload = (uploadId) => {
        uploadManager.cancelUpload(uploadId);
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
            const apiUrl = process.env.REACT_APP_API_URL || 'http://devpigh.local:8082';
            const initResponse = await fetch(`${apiUrl}/api/files/init-upload`, {
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

                const response = await fetch(`${apiUrl}/api/files/upload-chunk`, {
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
            const finalizeResponse = await fetch(`${apiUrl}/api/files/finalize-upload`, {
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

    const removeFileFromSelection = (index) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const clearSelectedFiles = () => {
        setSelectedFiles([]);
        setUploadError('');
    };

    const clearUpload = () => {
        setSelectedFile(null);
        setIsUploading(false);
        setUploadError('');
        setUploadStatus('');
    };
    
    // Randomize playlist function
    const randomizePlaylist = () => {
        if (playlistTracks.length <= 1) return; // No need to randomize if 1 or fewer tracks
        
        const shuffledTracks = [...playlistTracks];
        
        // Fisher-Yates shuffle algorithm
        for (let i = shuffledTracks.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledTracks[i], shuffledTracks[j]] = [shuffledTracks[j], shuffledTracks[i]];
        }
        
        setPlaylistTracks(shuffledTracks);
    };

    // Add all uploaded tracks to playlist
    const addAllToPlaylist = () => {
        if (uploadedTracks.length === 0) return;
        
        // Filter out tracks that are already in playlist (prevent duplicates)
        const tracksToAdd = uploadedTracks.filter(track => 
            !playlistTracks.some(pTrack => pTrack.fileName === track.fileName)
        );
        
        if (tracksToAdd.length === 0) return; // All tracks already in playlist
        
        // Convert to playlist format and add to playlist
        const playlistTracks_new = tracksToAdd.map(track => ({
            ...track,
            id: `playlist-${track.fileName.replace(/[^a-zA-Z0-9]/g, '')}`
        }));
        
        setPlaylistTracks(current => [...current, ...playlistTracks_new]);
        
        // Remove from uploaded tracks
        setUploadedTracks(current => 
            current.filter(track => 
                !tracksToAdd.some(addedTrack => addedTrack.fileName === track.fileName)
            )
        );
    };

    // Clear all playlist tracks back to uploaded (except keep one track)
    const clearAllPlaylist = () => {
        if (playlistTracks.length <= 1) return; // Need at least 2 tracks to clear all but one
        
        // Keep the first track, move the rest back to uploaded
        const tracksToMove = playlistTracks.slice(1); // All tracks except the first one
        const trackToKeep = playlistTracks[0]; // Keep the first track
        
        // Convert tracks to uploaded format
        const uploadedTracks_new = tracksToMove.map(track => ({
            ...track,
            id: `upload-${track.fileName.replace(/[^a-zA-Z0-9]/g, '')}`
        }));
        
        // Add to uploaded tracks
        setUploadedTracks(current => [...current, ...uploadedTracks_new]);
        
        // Keep only the first track in playlist
        setPlaylistTracks([trackToKeep]);
    };
    
    // Update isUploading based on queue status
    useEffect(() => {
        const hasActiveUploads = uploadQueue.some(item => 
            item.status === 'uploading' || item.status === 'pending'
        );
        setIsUploading(hasActiveUploads);
    }, [uploadQueue]);

    useEffect(() => {
        fetchTracks();
        
        // Initialize upload manager and set up listeners
        const initializeUploads = async () => {
            await uploadManager.initialize();
            
            // Restore any existing queue
            const existingQueue = uploadManager.getQueue();
            setUploadQueue(existingQueue);
        };
        
        initializeUploads();
        
        // Listen for upload events
        const unsubscribe = uploadManager.addListener((event, data) => {
            if (event === 'QUEUE_UPDATED') {
                setUploadQueue(data);
            } else if (event === 'UPLOAD_PROGRESS') {
                setUploadQueue(prev => 
                    prev.map(item => 
                        item.id === data.id ? { ...item, ...data } : item
                    )
                );
                
                // Refresh track list when upload completes
                if (data.status === 'completed') {
                    setTimeout(fetchTracks, 1000);
                }
            }
        });
        
        return () => {
            unsubscribe();
        };
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

    const handleSelectAll = () => {
        if (selectedTracks.size === uploadedTracks.length) {
            // Deselect all
            setSelectedTracks(new Set());
        } else {
            // Select all
            setSelectedTracks(new Set(uploadedTracks.map(track => track.id)));
        }
    };

    const isAllSelected = uploadedTracks.length > 0 && selectedTracks.size === uploadedTracks.length;
    const isIndeterminate = selectedTracks.size > 0 && selectedTracks.size < uploadedTracks.length;

    const handleDeleteClick = () => {
        const selectedTrackObjects = uploadedTracks.filter(track => selectedTracks.has(track.id));
        setTracksToDelete(selectedTrackObjects);
        setIsDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        for (const track of tracksToDelete) {
            try {
                // Delete from Google Cloud Storage bucket
                // The fileName should include the folder (test/ or tracks/)
                const apiUrl = process.env.REACT_APP_API_URL || 'http://devpigh.local:8082';
                const response = await fetch(`${apiUrl}/api/files/${track.fileName}`, {
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
        // Clear selection and close dialog
        setSelectedTracks(new Set());
        setTracksToDelete([]);
        setIsDeleteDialogOpen(false);
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
                                <div className="tw-flex tw-justify-between tw-items-center tw-mb-2">
                                    <h3 className="tw-text-lg tw-font-bold tw-text-gray-800">Uploaded Tracks</h3>
                                    {uploadedTracks.length > 0 && (
                                        <button
                                            onClick={addAllToPlaylist}
                                            className="secondary-button tw-px-3 tw-py-1 tw-text-sm tw-transition-all tw-duration-200 hover:tw-scale-105"
                                            title="Add all tracks to playlist"
                                        >
                                            <svg 
                                                className="tw-w-4 tw-h-4 tw-mr-1" 
                                                fill="none" 
                                                stroke="currentColor" 
                                                viewBox="0 0 24 24"
                                            >
                                                <path 
                                                    strokeLinecap="round" 
                                                    strokeLinejoin="round" 
                                                    strokeWidth={2} 
                                                    d="M12 6v6m0 0v6m0-6h6m-6 0H6" 
                                                />
                                            </svg>
                                            Add All
                                        </button>
                                    )}
                                </div>
                                
                                {/* Storage Usage */}
                                <StorageUsage />
                                
                                {/* Select All and Action Buttons */}
                                <div className="tw-flex tw-justify-between tw-items-center tw-gap-4 tw-mt-4">
                                    <div className="tw-flex tw-items-center tw-gap-2">
                                        <input
                                            type="checkbox"
                                            checked={isAllSelected}
                                            ref={(el) => {
                                                if (el) el.indeterminate = isIndeterminate;
                                            }}
                                            onChange={handleSelectAll}
                                            className="tw-w-4 tw-h-4 tw-rounded tw-border-gray-300 tw-text-blue-600 focus:tw-ring-blue-500"
                                        />
                                        <label className="tw-text-sm tw-text-gray-600">
                                            Select All ({selectedTracks.size}/{uploadedTracks.length})
                                        </label>
                                    </div>
                                    <div>
                                        <button
                                            onClick={handleDeleteClick}
                                            disabled={selectedTracks.size === 0}
                                            className={`danger-button ${selectedTracks.size === 0 ? 'disabled' : ''}`}
                                        >
                                            Delete Selected ({selectedTracks.size})
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
                            <div className="tw-flex tw-justify-between tw-items-center tw-mb-4">
                                <h3 className="tw-text-lg tw-font-bold tw-text-gray-800">My Focus Playlist</h3>
                                <div className="tw-flex tw-gap-2">
                                    {playlistTracks.length > 1 && (
                                        <button
                                            onClick={clearAllPlaylist}
                                            className="secondary-button tw-bg-red-400/40 tw-text-red-900 tw-px-3 tw-py-1 tw-text-sm tw-transition-all tw-duration-200 hover:tw-scale-105"
                                            title="Clear all tracks from playlist (keep one)"
                                        >
                                            <svg 
                                                className="tw-w-4 tw-h-4 tw-mr-1" 
                                                fill="none" 
                                                stroke="currentColor" 
                                                viewBox="0 0 24 24"
                                            >
                                                <path 
                                                    strokeLinecap="round" 
                                                    strokeLinejoin="round" 
                                                    strokeWidth={2} 
                                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
                                                />
                                            </svg>
                                            Clear All
                                        </button>
                                    )}
                                    {playlistTracks.length > 1 && (
                                        <button
                                            onClick={randomizePlaylist}
                                            className="secondary-button tw-px-3 tw-py-1 tw-text-sm tw-transition-all tw-duration-200 hover:tw-scale-105"
                                            title="Randomize playlist order"
                                        >
                                            <svg 
                                                className="tw-w-4 tw-h-4 tw-mr-1" 
                                                fill="none" 
                                                stroke="currentColor" 
                                                viewBox="0 0 24 24"
                                            >
                                                <path 
                                                    strokeLinecap="round" 
                                                    strokeLinejoin="round" 
                                                    strokeWidth={2} 
                                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                                                />
                                            </svg>
                                            Randomize
                                        </button>
                                    )}
                                </div>
                            </div>
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

                    {/* Selected Files Preview - Shows between track lists and file picker */}
                    {selectedFiles.length > 0 && (
                        <div className="tw-mb-6 tw-transition-all tw-duration-500 tw-ease-in-out tw-animate-in tw-slide-in-from-top-4">
                            <div className="tw-bg-gray-50 tw-p-4 tw-rounded-lg tw-space-y-4">
                                <div className="tw-flex tw-justify-between tw-items-center">
                                    <h4 className="tw-font-medium tw-text-gray-800">
                                        Selected Files ({selectedFiles.length})
                                    </h4>
                                    <div className="tw-text-sm tw-text-gray-600">
                                        Total: {(selectedFiles.reduce((acc, file) => acc + file.size, 0) / (1024 * 1024)).toFixed(2)} MB
                                    </div>
                                </div>
                                
                                <div className="tw-max-h-32 tw-overflow-y-auto tw-space-y-2">
                                    {selectedFiles.map((file, index) => (
                                        <div key={index} className="tw-flex tw-justify-between tw-items-center tw-bg-white tw-p-2 tw-rounded">
                                            <div className="tw-flex-1">
                                                <p className="tw-text-sm tw-font-medium tw-text-gray-900">{file.name}</p>
                                                <p className="tw-text-xs tw-text-gray-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                                            </div>
                                            <button
                                                onClick={() => removeFileFromSelection(index)}
                                                className="tw-text-red-500 hover:tw-text-red-700 tw-ml-2"
                                                disabled={isUploading}
                                            >
                                                <svg className="tw-w-4 tw-h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                
                                <div className="tw-flex tw-gap-4">
                                    <button
                                        onClick={startMultiUpload}
                                        disabled={isUploading}
                                        className={`primary-button tw-flex-1 ${isUploading ? 'disabled' : ''}`}
                                    >
                                        {isUploading ? 'Uploading...' : `Upload ${selectedFiles.length} Files`}
                                    </button>
                                    <button
                                        onClick={clearSelectedFiles}
                                        disabled={isUploading}
                                        className="secondary-button tw-bg-red-400/40 tw-text-red-900"
                                    >
                                        Clear All
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Upload Queue Progress - Shows during active uploads */}
                    {uploadQueue.length > 0 && (
                        <div className="tw-mb-6 tw-transition-all tw-duration-500 tw-ease-in-out tw-animate-in tw-slide-in-from-top-4">
                            <div className="tw-bg-white tw-rounded-xl tw-p-4 tw-shadow-sm tw-border tw-border-gray-200">
                                <div className="tw-flex tw-justify-between tw-items-center tw-mb-3">
                                    <h4 className="tw-font-medium tw-text-gray-800">Upload Progress</h4>
                                    <div className="tw-text-sm tw-text-gray-600">
                                        {uploadQueue.filter(item => item.status === 'completed').length} / {uploadQueue.length} completed
                                    </div>
                                </div>
                                
                                <div className="tw-max-h-40 tw-overflow-y-auto tw-space-y-2">
                                    {uploadQueue.map((queueItem, index) => (
                                        <div key={queueItem.id} className={`tw-bg-gray-50 tw-p-3 tw-rounded tw-transition-all tw-duration-300 tw-animate-in tw-slide-in-from-left-2`} style={{animationDelay: `${index * 50}ms`}}>
                                            <div className="tw-flex tw-justify-between tw-items-center tw-mb-2">
                                                <span className="tw-text-sm tw-font-medium tw-text-gray-900 tw-truncate tw-pr-2">
                                                    {queueItem.file.name}
                                                </span>
                                                <span className={`tw-text-xs tw-px-2 tw-py-1 tw-rounded-full tw-whitespace-nowrap tw-transition-colors tw-duration-200 ${
                                                    queueItem.status === 'completed' ? 'tw-bg-green-100 tw-text-green-800' :
                                                    queueItem.status === 'uploading' ? 'tw-bg-blue-100 tw-text-blue-800' :
                                                    queueItem.status === 'error' ? 'tw-bg-red-100 tw-text-red-800' :
                                                    'tw-bg-gray-100 tw-text-gray-800'
                                                }`}>
                                                    {queueItem.status === 'pending' ? 'Queued' :
                                                     queueItem.status === 'uploading' ? 'Uploading' :
                                                     queueItem.status === 'completed' ? 'Complete' :
                                                     queueItem.status === 'error' ? 'Failed' : queueItem.status}
                                                </span>
                                            </div>
                                            
                                            {(queueItem.status === 'uploading' || queueItem.status === 'pending') && (
                                                <div className="tw-transition-all tw-duration-200">
                                                    <div className="tw-flex tw-justify-between tw-items-center tw-text-xs tw-text-gray-500 tw-mb-1">
                                                        <span>{queueItem.statusText || 'Uploading...'}</span>
                                                        <div className="tw-flex tw-items-center tw-gap-2">
                                                            <span>{Math.round(queueItem.progress || 0)}%</span>
                                                            <button
                                                                onClick={() => cancelUpload(queueItem.id)}
                                                                className="tw-text-red-500 hover:tw-text-red-700 tw-p-1 tw-rounded tw-hover:tw-bg-red-50 tw-transition-colors"
                                                                title="Cancel upload"
                                                            >
                                                                <svg className="tw-w-3 tw-h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="tw-w-full tw-bg-gray-200 tw-rounded-full tw-h-2">
                                                        <div
                                                            className="tw-h-2 tw-rounded-full tw-bg-blue-500 tw-transition-all tw-duration-300 tw-ease-out"
                                                            style={{ width: `${queueItem.progress || 0}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {queueItem.status === 'error' && queueItem.error && (
                                                <p className="tw-text-xs tw-text-red-600 tw-mt-1 tw-animate-pulse">{queueItem.error}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                
                                <div className="tw-flex tw-gap-2 tw-mt-3">
                                    {uploadQueue.some(item => item.status === 'error') && (
                                        <button
                                            onClick={retryFailedUploads}
                                            className="secondary-button tw-flex-1 tw-transition-all tw-duration-200 hover:tw-scale-105"
                                        >
                                            Retry Failed
                                        </button>
                                    )}
                                    {uploadQueue.some(item => item.status === 'uploading' || item.status === 'pending') && (
                                        <button
                                            onClick={() => {
                                                uploadQueue.forEach(item => {
                                                    if (item.status === 'uploading' || item.status === 'pending') {
                                                        cancelUpload(item.id);
                                                    }
                                                });
                                            }}
                                            className="secondary-button tw-bg-red-400/40 tw-text-red-900 tw-flex-1 tw-transition-all tw-duration-200 hover:tw-scale-105"
                                        >
                                            Cancel All
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Upload Section */}
                    <div className="tw-mb-6">
                        <div className="tw-flex tw-flex-col tw-gap-4">
                            <input
                                type="file"
                                accept=".mp3"
                                multiple
                                onChange={handleFileSelect}
                                disabled={isUploading}
                                className="tw-hidden"
                                id="file-select"
                            />
                            
                            {/* Drag and Drop Zone */}
                            <div
                                className={`tw-border-2 tw-border-dashed tw-rounded-lg tw-p-8 tw-text-center tw-transition-colors ${
                                    isDragOver 
                                        ? 'tw-border-blue-500 tw-bg-blue-50' 
                                        : 'tw-border-gray-300 tw-bg-gray-50'
                                } ${isUploading ? 'tw-opacity-50 tw-pointer-events-none' : ''}`}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setIsDragOver(true);
                                }}
                                onDragLeave={(e) => {
                                    e.preventDefault();
                                    setIsDragOver(false);
                                }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setIsDragOver(false);
                                    const files = Array.from(e.dataTransfer.files);
                                    addFilesToQueue(files);
                                }}
                            >
                                <div className="tw-space-y-4">
                                    <div className="tw-flex tw-justify-center">
                                        <svg className="tw-w-12 tw-h-12 tw-text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <label
                                            htmlFor="file-select"
                                            className="primary-button tw-cursor-pointer tw-inline-block"
                                        >
                                            Select MP3 Files
                                        </label>
                                        <p className="tw-text-gray-500 tw-mt-2">or drag and drop files here</p>
                                    </div>
                                </div>
                            </div>



                            {uploadError && (
                                <div className="tw-text-red-500 tw-text-sm">
                                    {uploadError}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Delete Confirmation Dialog */}
            <DeleteDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => {
                    setIsDeleteDialogOpen(false);
                    setTracksToDelete([]);
                }}
                onConfirm={handleDeleteConfirm}
                title="Delete Tracks"
                message={
                    tracksToDelete.length === 1 
                        ? `Are you sure you want to delete "${tracksToDelete[0]?.title}"?`
                        : `Are you sure you want to delete ${tracksToDelete.length} selected tracks?`
                }
                confirmButtonText="Delete"
            />
        </div>
    );
}

export default TrackListPage; 