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
        // For chunk uploads, accept any file
        if (req.path === '/upload-chunk') {
            return cb(null, true);
        }
        // For regular uploads, check for .mp3 extension
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
        const config = {};
        if (process.env.NODE_ENV !== 'production') {
            if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
                config.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
                console.log('Using service account credentials from GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
            } else {
                console.warn('GOOGLE_APPLICATION_CREDENTIALS not set in development mode. Consider running "gcloud auth application-default login" or setting the variable in your .env file.');
            }
            if (process.env.GCLOUD_PROJECT_ID) {
                config.projectId = process.env.GCLOUD_PROJECT_ID;
            }
        }
        storage = new Storage(config);
        // Remove /test from bucket name if present
        const bucketName = process.env.GCS_BUCKET_NAME.split('/')[0];
        bucket = storage.bucket(bucketName);

        // Verify bucket access
        await bucket.exists();
        console.log('Successfully connected to GCS bucket:', bucket.name);
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

// Get signed URL for direct upload
router.post('/get-signed-url', ensureStorageInitialized, async (req, res) => {
    try {
        const { fileName, contentType } = req.body;
        const targetFolder = process.env.NODE_ENV === 'production' ? 'tracks' : 'test';
        const blobPath = `${targetFolder}/${fileName}`;
        
        const file = bucket.file(blobPath);
        
        // Generate signed URL for direct upload
        const [response] = await file.generateSignedPostPolicyV4({
            expires: Date.now() + 15 * 60 * 1000, // 15 minutes
            conditions: [
                ['content-length-range', 0, 500 * 1024 * 1024], // up to 500MB
                ['eq', '$Content-Type', contentType],
            ],
            fields: {
                'Content-Type': contentType,
            },
        });

        res.json(response);
    } catch (error) {
        console.error('Error generating signed URL:', error);
        res.status(500).json({ error: 'Failed to generate signed URL' });
    }
});

// Finalize upload
router.post('/finalize-upload', ensureStorageInitialized, async (req, res) => {
    try {
        const { uploadId, fileName, totalChunks } = req.body;
        const metadata = uploads.get(uploadId);
        
        if (!metadata) {
            throw new Error('Upload session not found');
        }

        if (metadata.receivedChunks !== totalChunks) {
            throw new Error(`Missing chunks. Received ${metadata.receivedChunks} of ${totalChunks}`);
        }

        const targetFolder = process.env.NODE_ENV === 'production' ? 'tracks' : 'test';
        const blobPath = `${targetFolder}/${fileName}`;
        const blob = bucket.file(blobPath);
        const blobStream = blob.createWriteStream({
            resumable: false,
            metadata: {
                contentType: 'audio/mpeg'
            }
        });

        // Combine chunks and stream to GCS
        for (let i = 0; i < totalChunks; i++) {
            const chunkPath = path.join(metadata.tempDir, `chunk-${i}`);
            const chunkData = fs.readFileSync(chunkPath);
            blobStream.write(chunkData);
        }

        // End the stream and wait for upload to complete
        await new Promise((resolve, reject) => {
            blobStream.end();
            blobStream.on('finish', resolve);
            blobStream.on('error', reject);
        });

        // Clean up temp directory
        fs.rmSync(metadata.tempDir, { recursive: true, force: true });
        uploads.delete(uploadId);

        res.json({
            message: 'Upload finalized successfully',
            file: {
                name: blobPath,
                size: metadata.fileSize
            }
        });
    } catch (error) {
        console.error('Finalize error:', error);
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

// Upload chunk
router.post('/upload-chunk', upload.single('chunk'), async (req, res) => {
    try {
        console.log('Received chunk upload request:', {
            body: req.body,
            file: req.file ? {
                originalname: req.file.originalname,
                size: req.file.size,
                path: req.file.path
            } : 'No file'
        });

        const { uploadId, chunkIndex } = req.body;
        if (!uploadId || chunkIndex === undefined) {
            throw new Error(`Missing required fields. Got uploadId: ${uploadId}, chunkIndex: ${chunkIndex}`);
        }

        const metadata = uploads.get(uploadId);
        console.log('Found upload metadata:', metadata);
        
        if (!metadata) {
            throw new Error(`Upload session not found for ID: ${uploadId}`);
        }

        if (!req.file) {
            throw new Error('No chunk file received');
        }

        // Ensure temp directory exists
        if (!fs.existsSync(metadata.tempDir)) {
            console.log('Creating temp directory:', metadata.tempDir);
            fs.mkdirSync(metadata.tempDir, { recursive: true });
        }

        // Save chunk to temp directory
        const chunkPath = path.join(metadata.tempDir, `chunk-${chunkIndex}`);
        console.log('Moving chunk to:', chunkPath);
        fs.renameSync(req.file.path, chunkPath);
        
        // Update received chunks count
        metadata.receivedChunks++;
        uploads.set(uploadId, metadata);
        
        console.log('Chunk processed successfully:', {
            uploadId,
            chunkIndex,
            receivedChunks: metadata.receivedChunks,
            totalChunks: metadata.totalChunks
        });

        res.json({ 
            message: 'Chunk received',
            progress: (metadata.receivedChunks / metadata.totalChunks) * 100
        });
    } catch (error) {
        // Clean up temp file on error
        if (req.file) {
            console.error('Cleaning up temp file:', req.file.path);
            fs.unlink(req.file.path, () => {});
        }
        console.error('Chunk upload error:', {
            error: error.message,
            stack: error.stack,
            body: req.body,
            file: req.file
        });
        res.status(500).json({ 
            error: 'Failed to upload chunk',
            details: error.message
        });
    }
});

module.exports = router; 