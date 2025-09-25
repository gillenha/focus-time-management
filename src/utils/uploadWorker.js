// Upload Worker for background file processing
// This worker handles chunked uploads independently of the main thread

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
        case 'RETRY_UPLOAD':
            await handleRetryUpload(payload.id);
            break;
        default:
            console.warn('Unknown message type:', type);
    }
};

async function handleStartUpload({ id, file, apiUrl }) {
    try {
        // Update status to uploading
        self.postMessage({
            type: 'UPLOAD_PROGRESS',
            payload: { id, status: 'uploading', progress: 0, statusText: 'Initializing upload...' }
        });

        const CHUNK_SIZE = 25 * 1024 * 1024; // 25MB chunks
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        let uploadedChunks = 0;

        // Initialize upload session
        const initResponse = await fetch(`${apiUrl}/api/files/init-upload`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fileName: file.name,
                fileSize: file.size,
                totalChunks
            })
        });

        if (!initResponse.ok) {
            throw new Error('Failed to initialize upload');
        }

        const { uploadId } = await initResponse.json();
        
        // Store upload session for potential cancellation
        uploadSessions.set(id, { uploadId, cancelled: false });

        // Upload chunks
        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
            // Check if upload was cancelled
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
                    progress: (uploadedChunks / totalChunks) * 90, // Reserve 10% for finalization
                    statusText: `Uploading chunk ${chunkIndex + 1} of ${totalChunks}` 
                }
            });

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
        }

        // Finalize upload
        self.postMessage({
            type: 'UPLOAD_PROGRESS',
            payload: { id, status: 'uploading', progress: 95, statusText: 'Finalizing upload...' }
        });

        const finalizeResponse = await fetch(`${apiUrl}/api/files/finalize-upload`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                uploadId,
                fileName: file.name,
                totalChunks
            })
        });

        if (!finalizeResponse.ok) {
            throw new Error('Failed to finalize upload');
        }

        // Upload completed successfully
        self.postMessage({
            type: 'UPLOAD_PROGRESS',
            payload: { id, status: 'completed', progress: 100, statusText: 'Upload complete!' }
        });

        // Clean up session
        uploadSessions.delete(id);

    } catch (error) {
        console.error('Upload error:', error);
        self.postMessage({
            type: 'UPLOAD_PROGRESS',
            payload: { 
                id, 
                status: 'error', 
                progress: 0, 
                error: error.message || 'Upload failed' 
            }
        });
        
        // Clean up session
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

async function handleRetryUpload(id) {
    // This would restart the upload process
    // For now, we'll just mark it as pending and let the main thread restart it
    self.postMessage({
        type: 'UPLOAD_PROGRESS',
        payload: { id, status: 'pending', progress: 0, statusText: 'Retrying...' }
    });
}