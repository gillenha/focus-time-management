// Upload Manager - Handles background uploads with Web Workers
class UploadManager {
    constructor() {
        this.worker = null;
        this.uploadQueue = new Map();
        this.listeners = new Set();
        this.isInitialized = false;
        this.maxConcurrentUploads = 3;
        this.activeUploads = new Set();
        
        // Restore upload queue from localStorage on initialization
        this.restoreUploadQueue();
    }

    async initialize() {
        if (this.isInitialized) return;
        
        try {
            // Try to create Web Worker with inline script
            const workerScript = `
                // Upload Worker for background file processing
                let uploadSessions = new Map();

                self.onmessage = async function(e) {
                    const { type, payload } = e.data;
                    
                    switch (type) {
                        case 'START_UPLOAD':
                            await handleStartUpload(payload);
                            break;
                        case 'CANCEL_UPLOAD':
                            handleCancelUpload(payload.id);
                            break;
                        default:
                            console.warn('Unknown message type:', type);
                    }
                };

                async function handleStartUpload({ id, file, apiUrl }) {
                    try {
                        self.postMessage({
                            type: 'UPLOAD_PROGRESS',
                            payload: { id, status: 'uploading', progress: 0, statusText: 'Initializing upload...' }
                        });

                        const CHUNK_SIZE = 25 * 1024 * 1024;
                        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
                        let uploadedChunks = 0;

                        const initResponse = await fetch(apiUrl + '/api/files/init-upload', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                fileName: file.name,
                                fileSize: file.size,
                                totalChunks
                            })
                        });

                        if (!initResponse.ok) throw new Error('Failed to initialize upload');
                        const { uploadId } = await initResponse.json();
                        
                        uploadSessions.set(id, { uploadId, cancelled: false });

                        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
                            const session = uploadSessions.get(id);
                            if (session?.cancelled) {
                                self.postMessage({
                                    type: 'UPLOAD_PROGRESS',
                                    payload: { id, status: 'cancelled', progress: 0 }
                                });
                                return;
                            }

                            const start = chunkIndex * CHUNK_SIZE;
                            const end = Math.min(start + CHUNK_SIZE, file.size);
                            const chunk = file.slice(start, end);
                            
                            self.postMessage({
                                type: 'UPLOAD_PROGRESS',
                                payload: { 
                                    id, 
                                    status: 'uploading', 
                                    progress: (uploadedChunks / totalChunks) * 90,
                                    statusText: \`Uploading chunk \${chunkIndex + 1} of \${totalChunks}\`
                                }
                            });

                            const formData = new FormData();
                            formData.append('chunk', chunk, \`chunk-\${chunkIndex}.mp3\`);
                            formData.append('uploadId', uploadId);
                            formData.append('chunkIndex', chunkIndex.toString());
                            formData.append('totalChunks', totalChunks.toString());

                            const response = await fetch(apiUrl + '/api/files/upload-chunk', {
                                method: 'POST',
                                body: formData
                            });

                            if (!response.ok) throw new Error(\`Failed to upload chunk \${chunkIndex + 1}\`);
                            uploadedChunks++;
                        }

                        self.postMessage({
                            type: 'UPLOAD_PROGRESS',
                            payload: { id, status: 'uploading', progress: 95, statusText: 'Finalizing upload...' }
                        });

                        const finalizeResponse = await fetch(apiUrl + '/api/files/finalize-upload', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ uploadId, fileName: file.name, totalChunks })
                        });

                        if (!finalizeResponse.ok) throw new Error('Failed to finalize upload');

                        self.postMessage({
                            type: 'UPLOAD_PROGRESS',
                            payload: { id, status: 'completed', progress: 100, statusText: 'Upload complete!' }
                        });

                        uploadSessions.delete(id);

                    } catch (error) {
                        self.postMessage({
                            type: 'UPLOAD_PROGRESS',
                            payload: { id, status: 'error', progress: 0, error: error.message || 'Upload failed' }
                        });
                        uploadSessions.delete(id);
                    }
                }

                function handleCancelUpload(id) {
                    const session = uploadSessions.get(id);
                    if (session) {
                        session.cancelled = true;
                        self.postMessage({
                            type: 'UPLOAD_PROGRESS',
                            payload: { id, status: 'cancelled', progress: 0 }
                        });
                    }
                }
            `;
            
            const blob = new Blob([workerScript], { type: 'application/javascript' });
            this.worker = new Worker(URL.createObjectURL(blob));
            
            // Handle worker messages
            this.worker.onmessage = (e) => {
                const { type, payload } = e.data;
                if (type === 'UPLOAD_PROGRESS') {
                    this.handleUploadProgress(payload);
                }
            };
            
            this.worker.onerror = (error) => {
                console.error('Upload worker error:', error);
                // Fallback to main thread on worker error
                this.worker = null;
            };
            
            this.isInitialized = true;
            
            // Resume any pending uploads
            this.resumePendingUploads();
            
        } catch (error) {
            console.error('Failed to initialize upload worker:', error);
            // Fallback to main thread uploads
            this.worker = null;
            this.isInitialized = true; // Still mark as initialized for fallback mode
            this.resumePendingUploads();
        }
    }

    // Add files to upload queue
    addFiles(files, apiUrl) {
        const queueItems = files.map(file => ({
            id: `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            file,
            apiUrl,
            status: 'pending',
            progress: 0,
            statusText: '',
            error: null,
            addedAt: Date.now()
        }));

        queueItems.forEach(item => {
            this.uploadQueue.set(item.id, item);
        });

        this.saveUploadQueue();
        this.notifyListeners('QUEUE_UPDATED', Array.from(this.uploadQueue.values()));
        
        // Start processing queue
        this.processQueue();
        
        return queueItems.map(item => item.id);
    }

    // Process upload queue
    async processQueue() {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const pendingUploads = Array.from(this.uploadQueue.values())
            .filter(item => item.status === 'pending')
            .slice(0, this.maxConcurrentUploads - this.activeUploads.size);

        for (const upload of pendingUploads) {
            this.startUpload(upload);
        }
    }

    // Start individual upload
    async startUpload(uploadItem) {
        if (this.activeUploads.has(uploadItem.id)) return;
        
        this.activeUploads.add(uploadItem.id);
        uploadItem.status = 'uploading';
        uploadItem.startedAt = Date.now();
        
        this.saveUploadQueue();
        this.notifyListeners('UPLOAD_STARTED', uploadItem);

        if (this.worker) {
            // Use Web Worker for background processing
            this.worker.postMessage({
                type: 'START_UPLOAD',
                payload: {
                    id: uploadItem.id,
                    file: uploadItem.file,
                    apiUrl: uploadItem.apiUrl
                }
            });
        } else {
            // Fallback to main thread upload
            await this.fallbackUpload(uploadItem);
        }
    }

    // Handle upload progress from worker
    handleUploadProgress(payload) {
        const { id, status, progress, statusText, error } = payload;
        const uploadItem = this.uploadQueue.get(id);
        
        if (!uploadItem) return;

        uploadItem.status = status;
        uploadItem.progress = progress || 0;
        uploadItem.statusText = statusText || '';
        uploadItem.error = error || null;

        if (status === 'completed' || status === 'error' || status === 'cancelled') {
            this.activeUploads.delete(id);
            uploadItem.completedAt = Date.now();
            
            // Continue processing queue
            setTimeout(() => this.processQueue(), 100);
        }

        this.saveUploadQueue();
        this.notifyListeners('UPLOAD_PROGRESS', uploadItem);

        // Clean up completed uploads after some time
        if (status === 'completed') {
            setTimeout(() => {
                this.uploadQueue.delete(id);
                this.saveUploadQueue();
                this.notifyListeners('QUEUE_UPDATED', Array.from(this.uploadQueue.values()));
            }, 5000); // Remove from queue after 5 seconds
        }
    }

    // Fallback upload for main thread
    async fallbackUpload(uploadItem) {
        try {
            const { file, apiUrl } = uploadItem;
            
            // Update progress
            this.handleUploadProgress({
                id: uploadItem.id,
                status: 'uploading',
                progress: 0,
                statusText: 'Initializing upload...'
            });

            const CHUNK_SIZE = 25 * 1024 * 1024;
            const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
            
            // Initialize upload
            const initResponse = await fetch(`${apiUrl}/api/files/init-upload`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileName: file.name,
                    fileSize: file.size,
                    totalChunks
                })
            });

            if (!initResponse.ok) throw new Error('Failed to initialize upload');
            const { uploadId } = await initResponse.json();

            // Upload chunks
            for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
                const start = chunkIndex * CHUNK_SIZE;
                const end = Math.min(start + CHUNK_SIZE, file.size);
                const chunk = file.slice(start, end);
                
                this.handleUploadProgress({
                    id: uploadItem.id,
                    status: 'uploading',
                    progress: (chunkIndex / totalChunks) * 90,
                    statusText: `Uploading chunk ${chunkIndex + 1} of ${totalChunks}`
                });

                const formData = new FormData();
                formData.append('chunk', chunk);
                formData.append('uploadId', uploadId);
                formData.append('chunkIndex', chunkIndex.toString());

                const response = await fetch(`${apiUrl}/api/files/upload-chunk`, {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) throw new Error(`Failed to upload chunk ${chunkIndex + 1}`);
            }

            // Finalize
            this.handleUploadProgress({
                id: uploadItem.id,
                status: 'uploading',
                progress: 95,
                statusText: 'Finalizing upload...'
            });

            const finalizeResponse = await fetch(`${apiUrl}/api/files/finalize-upload`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uploadId, fileName: file.name, totalChunks })
            });

            if (!finalizeResponse.ok) throw new Error('Failed to finalize upload');

            this.handleUploadProgress({
                id: uploadItem.id,
                status: 'completed',
                progress: 100,
                statusText: 'Upload complete!'
            });

        } catch (error) {
            this.handleUploadProgress({
                id: uploadItem.id,
                status: 'error',
                progress: 0,
                error: error.message
            });
        }
    }

    // Retry failed uploads
    retryFailedUploads() {
        const failedUploads = Array.from(this.uploadQueue.values())
            .filter(item => item.status === 'error');

        failedUploads.forEach(upload => {
            upload.status = 'pending';
            upload.progress = 0;
            upload.error = null;
            upload.statusText = '';
        });

        this.saveUploadQueue();
        this.notifyListeners('QUEUE_UPDATED', Array.from(this.uploadQueue.values()));
        this.processQueue();
    }

    // Cancel upload
    cancelUpload(id) {
        if (this.worker && this.activeUploads.has(id)) {
            this.worker.postMessage({
                type: 'CANCEL_UPLOAD',
                payload: { id }
            });
        }

        const uploadItem = this.uploadQueue.get(id);
        if (uploadItem) {
            uploadItem.status = 'cancelled';
            this.activeUploads.delete(id);
            this.saveUploadQueue();
            this.notifyListeners('UPLOAD_PROGRESS', uploadItem);
        }
    }

    // Get current queue
    getQueue() {
        return Array.from(this.uploadQueue.values());
    }

    // Add listener for upload events
    addListener(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    // Notify all listeners
    notifyListeners(event, data) {
        this.listeners.forEach(callback => {
            try {
                callback(event, data);
            } catch (error) {
                console.error('Upload listener error:', error);
            }
        });
    }

    // Save upload queue to localStorage
    saveUploadQueue() {
        try {
            const queueData = Array.from(this.uploadQueue.values()).map(item => ({
                ...item,
                file: {
                    name: item.file.name,
                    size: item.file.size,
                    type: item.file.type,
                    lastModified: item.file.lastModified
                }
            }));
            localStorage.setItem('uploadQueue', JSON.stringify(queueData));
        } catch (error) {
            console.error('Failed to save upload queue:', error);
        }
    }

    // Restore upload queue from localStorage
    restoreUploadQueue() {
        try {
            const saved = localStorage.getItem('uploadQueue');
            if (saved) {
                const queueData = JSON.parse(saved);
                // Only restore pending/uploading items (not completed ones)
                const itemsToRestore = queueData.filter(item => 
                    item.status === 'pending' || item.status === 'uploading'
                );
                
                itemsToRestore.forEach(item => {
                    // Reset uploading items to pending since we can't resume mid-upload
                    if (item.status === 'uploading') {
                        item.status = 'pending';
                        item.progress = 0;
                        item.statusText = '';
                    }
                    
                    this.uploadQueue.set(item.id, item);
                });
            }
        } catch (error) {
            console.error('Failed to restore upload queue:', error);
        }
    }

    // Resume pending uploads after page load
    resumePendingUploads() {
        const pendingUploads = Array.from(this.uploadQueue.values())
            .filter(item => item.status === 'pending');
            
        if (pendingUploads.length > 0) {
            console.log(`Resuming ${pendingUploads.length} pending uploads`);
            this.processQueue();
        }
    }

    // Clean up resources
    destroy() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        this.uploadQueue.clear();
        this.listeners.clear();
        this.activeUploads.clear();
    }
}

// Create singleton instance
export default new UploadManager();