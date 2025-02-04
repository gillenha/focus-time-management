const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { Storage } = require('@google-cloud/storage');

// Store upload metadata
const uploads = new Map();

// Configure multer for file handling
const multerStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        cb(null, tempDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({
    storage: multerStorage,
    fileFilter: (req, file, cb) => {
        if (!file.originalname.toLowerCase().endsWith('.mp3')) {
            return cb(new Error('Only .mp3 files are allowed'));
        }
        cb(null, true);
    }
});

// Initialize Google Cloud Storage
let storage;
let bucket;

async function initializeStorage() {
    try {
        // Always use Application Default Credentials
        // This will work with both Workload Identity Federation and Cloud Run's built-in authentication
        storage = new Storage();
        
        // Initialize the bucket
        bucket = storage.bucket('react-app-assets');

        // Verify bucket access
        try {
            await bucket.exists();
            console.log('Successfully connected to GCS bucket');
        } catch (error) {
            throw new Error(`Failed to access bucket: ${error.message}`);
        }

    } catch (error) {
        console.error('Failed to initialize Google Cloud Storage:', error);
        throw error;
    }
}

// Initialize storage when the module loads
initializeStorage().catch(error => {
    console.error('Storage initialization failed:', error);
});

// Middleware to ensure storage is initialized
const ensureStorageInitialized = async (req, res, next) => {
    if (!bucket) {
        try {
            await initializeStorage();
            next();
        } catch (error) {
            res.status(500).json({ 
                error: 'Storage not initialized',
                details: error.message
            });
        }
    } else {
        next();
    }
};

// Upload file
router.post('/upload', ensureStorageInitialized, upload.single('file'), async (req, res) => {
    console.log('Upload request received');
    try {
        if (!bucket) {
            console.error('Upload error: Google Cloud Storage not initialized');
            throw new Error('Google Cloud Storage not initialized');
        }
        
        if (!req.file) {
            console.error('Upload error: No file received');
            return res.status(400).json({ error: 'No file uploaded' });
        }

        console.log('File received:', {
            originalname: req.file.originalname,
            size: req.file.size,
            path: req.file.path,
            mimetype: req.file.mimetype
        });

        // Always use GCS for both development and production
        const targetFolder = process.env.NODE_ENV === 'production' ? 'tracks' : 'test';
        const blobPath = `${targetFolder}/${req.file.originalname}`;
        console.log('Uploading to GCS path:', blobPath);

        const blob = bucket.file(blobPath);
        const blobStream = blob.createWriteStream({
            resumable: false,
            metadata: {
                contentType: 'audio/mpeg'
            },
            timeout: 240000 // 4 minutes timeout
        });

        // Set up error handling
        blobStream.on('error', (err) => {
            console.error('GCS upload error:', err);
            console.error('Error details:', {
                code: err.code,
                message: err.message,
                stack: err.stack
            });
            // Clean up temp file
            fs.unlink(req.file.path, () => {});
            res.status(500).json({ error: 'Failed to upload file', details: err.message });
        });

        // Set up completion handling
        blobStream.on('finish', () => {
            console.log('GCS upload completed successfully');
            // Clean up temp file
            fs.unlink(req.file.path, () => {});
            res.status(200).json({
                message: 'File uploaded successfully',
                file: {
                    name: blobPath,
                    size: req.file.size
                }
            });
        });

        // Stream the file to GCS with progress logging
        console.log('Starting file stream to GCS');
        const fileStream = fs.createReadStream(req.file.path);
        
        fileStream.on('error', (err) => {
            console.error('File read error:', err);
            res.status(500).json({ error: 'Failed to read file', details: err.message });
        });

        fileStream.pipe(blobStream);

    } catch (error) {
        // Clean up temp file on error
        if (req.file) {
            console.error('Cleaning up temp file after error');
            fs.unlink(req.file.path, () => {});
        }
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload file', details: error.message });
    }
});

// Get signed URL for chunked upload
router.post('/get-upload-url', ensureStorageInitialized, async (req, res) => {
    try {
        const { fileName } = req.body;
        const targetFolder = process.env.NODE_ENV === 'production' ? 'tracks' : 'test';
        const fullPath = `${targetFolder}/${fileName}`;

        if (process.env.NODE_ENV === 'production') {
            const file = bucket.file(fullPath);
            
            // Generate signed URL with resumable upload support
            const [signedUrl] = await file.getSignedUrl({
                version: 'v4',
                action: 'write',
                expires: Date.now() + 15 * 60 * 1000, // 15 minutes
                contentType: 'audio/mpeg',
                queryParameters: { uploadType: 'resumable' }
            });

            res.json({ signedUrl });
        } else {
            // For development, create temporary file path
            const mp3sDir = path.join(process.cwd(), 'mp3s');
            if (!fs.existsSync(mp3sDir)) {
                fs.mkdirSync(mp3sDir, { recursive: true });
            }
            
            const baseUrl = 'http://localhost:8080/api/files';
            res.json({ 
                signedUrl: `${baseUrl}/upload-chunk/${fileName}`
            });
        }
    } catch (error) {
        console.error('Error generating signed URL:', error);
        res.status(500).json({ error: 'Failed to generate signed URL' });
    }
});

// Handle chunk upload
router.post('/upload-chunk', upload.single('chunk'), async (req, res) => {
    try {
        console.log('Received chunk upload request:', {
            body: req.body,
            file: req.file ? {
                originalname: req.file.originalname,
                size: req.file.size,
                path: req.file.path
            } : null
        });

        const uploadId = req.body.uploadId;
        const chunkIndex = parseInt(req.body.chunkIndex);

        if (!uploadId || isNaN(chunkIndex)) {
            throw new Error(`Invalid parameters: uploadId=${uploadId}, chunkIndex=${chunkIndex}`);
        }

        const uploadData = uploads.get(uploadId);
        console.log('Found upload data:', uploadData);
        
        if (!uploadData) {
            throw new Error(`Upload not found for ID: ${uploadId}`);
        }
        
        if (!req.file) {
            throw new Error('No chunk file received');
        }
        
        // Create chunk directory if it doesn't exist
        if (!fs.existsSync(uploadData.tempDir)) {
            fs.mkdirSync(uploadData.tempDir, { recursive: true });
        }
        
        // Move chunk to temp directory
        const chunkPath = path.join(uploadData.tempDir, `chunk-${chunkIndex}`);
        console.log('Moving chunk to:', chunkPath);
        
        fs.renameSync(req.file.path, chunkPath);
        
        // Update received chunks count
        uploadData.receivedChunks++;
        uploads.set(uploadId, uploadData);
        
        console.log('Successfully processed chunk:', {
            uploadId,
            chunkIndex,
            receivedChunks: uploadData.receivedChunks,
            totalChunks: uploadData.totalChunks
        });
        
        res.json({ 
            message: 'Chunk received',
            progress: {
                received: uploadData.receivedChunks,
                total: uploadData.totalChunks
            }
        });
    } catch (error) {
        console.error('Chunk upload error:', error);
        // Clean up temp file if it exists
        if (req.file && req.file.path) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (cleanupError) {
                console.error('Failed to clean up temp file:', cleanupError);
            }
        }
        res.status(500).json({ 
            error: 'Failed to process chunk',
            details: error.message
        });
    }
});

// Finalize upload
router.post('/finalize-upload', ensureStorageInitialized, async (req, res) => {
    try {
        const { uploadId, fileName } = req.body;
        const uploadData = uploads.get(uploadId);
        
        if (!uploadData) {
            throw new Error('Upload not found');
        }
        
        if (uploadData.receivedChunks !== uploadData.totalChunks) {
            throw new Error('Not all chunks received');
        }
        
        // Combine chunks
        const targetFolder = process.env.NODE_ENV === 'production' ? 'tracks' : 'test';
        const blobPath = `${targetFolder}/${fileName}`;
        const blob = bucket.file(blobPath);
        const blobStream = blob.createWriteStream({
            resumable: false,
            metadata: {
                contentType: 'audio/mpeg'
            }
        });
        
        // Process chunks in order
        for (let i = 0; i < uploadData.totalChunks; i++) {
            const chunkPath = path.join(uploadData.tempDir, `chunk-${i}`);
            await new Promise((resolve, reject) => {
                fs.createReadStream(chunkPath)
                    .pipe(blobStream)
                    .on('error', reject)
                    .on('finish', resolve);
            });
        }
        
        // Clean up
        fs.rmSync(uploadData.tempDir, { recursive: true, force: true });
        uploads.delete(uploadId);
        
        res.json({
            message: 'Upload completed successfully',
            file: {
                name: blobPath,
                size: uploadData.fileSize
            }
        });
    } catch (error) {
        console.error('Finalize upload error:', error);
        res.status(500).json({ error: 'Failed to finalize upload' });
    }
});

// List MP3 files with folder support
router.get('/list-tracks', ensureStorageInitialized, async (req, res) => {
    try {
        const targetFolder = process.env.NODE_ENV === 'production' ? 'tracks' : 'test';
        const prefix = `${targetFolder}/`;
        
        console.log(`Listing files from bucket with prefix: ${prefix}`);
        
        const [files] = await bucket.getFiles({ prefix });
        const items = await Promise.all(files
            .filter(file => file.name.endsWith('.mp3'))
            .map(async file => {
                const [metadata] = await file.getMetadata();
                return {
                    name: file.name,
                    size: parseInt(metadata.size)
                };
            }));
            
        console.log(`Found ${items.length} files in bucket`);
        res.json({ items });
    } catch (error) {
        console.error('Error listing files:', error);
        res.status(500).json({ 
            error: 'Failed to list files',
            details: error.message
        });
    }
});

// Delete MP3 file
router.delete('/:filename(*)', ensureStorageInitialized, async (req, res) => {
    try {
        const filename = req.params.filename;
        console.log('Attempting to delete file:', filename);

        if (!bucket) {
            throw new Error('Storage not initialized');
        }

        const file = bucket.file(filename);
        const [exists] = await file.exists();

        if (!exists) {
            return res.status(404).json({ 
                error: 'File not found',
                details: `File ${filename} does not exist in bucket`
            });
        }

        await file.delete();
        console.log(`Successfully deleted file: ${filename}`);
        res.json({ message: 'File deleted successfully' });

    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ 
            error: 'Failed to delete file',
            details: error.message
        });
    }
});

// Get file sizes
router.get('/sizes', async (req, res) => {
    try {
        if (process.env.NODE_ENV === 'production') {
            const [files] = await bucket.getFiles();
            const sizes = {};
            for (const file of files) {
                if (file.name.endsWith('.mp3')) {
                    const [metadata] = await file.getMetadata();
                    sizes[file.name] = parseInt(metadata.size);
                }
            }
            res.json(sizes);
        } else {
            const mp3sDir = path.join(process.cwd(), 'mp3s');
            if (!fs.existsSync(mp3sDir)) {
                fs.mkdirSync(mp3sDir, { recursive: true });
            }
            const files = fs.readdirSync(mp3sDir);
            const sizes = {};
            for (const file of files) {
                if (file.endsWith('.mp3')) {
                    const stats = fs.statSync(path.join(mp3sDir, file));
                    sizes[file] = stats.size;
                }
            }
            res.json(sizes);
        }
    } catch (error) {
        console.error('Error getting file sizes:', error);
        res.status(500).json({ error: 'Failed to get file sizes' });
    }
});

// Initialize upload
router.post('/init-upload', ensureStorageInitialized, async (req, res) => {
    try {
        const { fileName, fileSize, totalChunks } = req.body;
        const uploadId = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
        const tempDir = path.join(process.cwd(), 'temp', uploadId);
        
        // Create temp directory for chunks
        fs.mkdirSync(tempDir, { recursive: true });
        
        // Store upload metadata
        const metadata = {
            fileName,
            fileSize,
            totalChunks,
            uploadId,
            tempDir,
            receivedChunks: 0
        };
        
        // Store metadata in memory (in production, use Redis or similar)
        uploads.set(uploadId, metadata);
        
        res.json({ uploadId });
    } catch (error) {
        console.error('Upload initialization error:', error);
        res.status(500).json({ error: 'Failed to initialize upload' });
    }
});

module.exports = router; 