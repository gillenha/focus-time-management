const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { Storage } = require('@google-cloud/storage');

// Configure multer for file handling
const multerStorage = multer.memoryStorage();
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
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!bucket) {
            throw new Error('Google Cloud Storage not initialized');
        }
        
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        if (process.env.NODE_ENV === 'production') {
            const blob = bucket.file(req.file.originalname);
            const blobStream = blob.createWriteStream({
                resumable: false,
                metadata: {
                    contentType: 'audio/mpeg'
                }
            });

            blobStream.on('error', (err) => {
                console.error('Upload error:', err);
                res.status(500).json({ error: 'Failed to upload file' });
            });

            blobStream.on('finish', () => {
                res.status(200).json({
                    message: 'File uploaded successfully',
                    file: {
                        name: req.file.originalname,
                        size: req.file.size
                    }
                });
            });

            blobStream.end(req.file.buffer);
        } else {
            const mp3sDir = path.join(process.cwd(), 'mp3s');
            if (!fs.existsSync(mp3sDir)) {
                fs.mkdirSync(mp3sDir, { recursive: true });
            }
            
            fs.writeFileSync(path.join(mp3sDir, req.file.originalname), req.file.buffer);
            res.json({
                message: 'File uploaded successfully',
                file: {
                    name: req.file.originalname,
                    size: req.file.size
                }
            });
        }
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

// Get signed URL for chunked upload
router.post('/get-upload-url', async (req, res) => {
    try {
        const { fileName, contentType, fileSize, chunkNumber, totalChunks, uploadId } = req.body;
        const targetFolder = process.env.NODE_ENV === 'production' ? 'tracks' : 'test';
        const fullPath = `${targetFolder}/${fileName}`;

        if (process.env.NODE_ENV === 'production') {
            const file = bucket.file(fullPath);
            
            // Generate signed URL for this chunk
            const [signedUrl] = await file.getSignedUrl({
                version: 'v4',
                action: 'write',
                expires: Date.now() + 15 * 60 * 1000, // 15 minutes
                contentType: contentType,
                queryParameters: { uploadType: 'resumable' }
            });

            res.json({ 
                signedUrl,
                resumableUrl: signedUrl
            });
        } else {
            // For development, create temporary file path
            const mp3sDir = path.join(process.cwd(), 'mp3s');
            if (!fs.existsSync(mp3sDir)) {
                fs.mkdirSync(mp3sDir, { recursive: true });
            }

            // Create a temporary file for the chunk
            const chunkPath = path.join(mp3sDir, `${uploadId}_${chunkNumber}`);
            
            // Return full URLs for development
            const baseUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:8080' : '';
            res.json({ 
                signedUrl: `${baseUrl}/upload-chunk/${uploadId}/${chunkNumber}`,
                resumableUrl: `${baseUrl}/upload-chunk/${uploadId}`
            });
        }
    } catch (error) {
        console.error('Error generating signed URL:', error);
        res.status(500).json({ error: 'Failed to generate signed URL' });
    }
});

// Handle chunk upload in development and production
router.put('/upload-chunk/:uploadId/:chunkNumber', ensureStorageInitialized, async (req, res) => {
    try {
        const { uploadId, chunkNumber } = req.params;
        const mp3sDir = path.join(process.cwd(), 'mp3s');
        
        // Ensure temp directory exists
        if (!fs.existsSync(mp3sDir)) {
            fs.mkdirSync(mp3sDir, { recursive: true });
        }

        // Save chunk to temp file
        const chunkPath = path.join(mp3sDir, `${uploadId}_${chunkNumber}`);
        const writeStream = fs.createWriteStream(chunkPath);
        
        await new Promise((resolve, reject) => {
            req.pipe(writeStream)
                .on('finish', resolve)
                .on('error', reject);
        });

        res.status(200).json({ message: 'Chunk uploaded successfully' });
    } catch (error) {
        console.error('Error handling chunk upload:', error);
        res.status(500).json({ 
            error: 'Failed to handle chunk upload',
            details: error.message
        });
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

// Finalize upload (same for both environments)
router.post('/finalize-upload', ensureStorageInitialized, async (req, res) => {
    try {
        const { uploadId, fileName, totalChunks } = req.body;
        const targetFolder = process.env.NODE_ENV === 'production' ? 'tracks' : 'test';
        const fullPath = `${targetFolder}/${fileName}`;
        
        console.log(`Finalizing upload for ${fileName} with ${totalChunks} chunks`);
        const mp3sDir = path.join(process.cwd(), 'mp3s');
        const finalPath = path.join(mp3sDir, fileName);
        const writeStream = fs.createWriteStream(finalPath);

        // Combine all chunks
        for (let i = 0; i < totalChunks; i++) {
            const chunkPath = path.join(mp3sDir, `${uploadId}_${i}`);
            console.log(`Processing chunk ${i}: ${chunkPath}`);
            if (fs.existsSync(chunkPath)) {
                const chunkData = fs.readFileSync(chunkPath);
                writeStream.write(chunkData);
                // Delete chunk after combining
                fs.unlinkSync(chunkPath);
            } else {
                throw new Error(`Missing chunk file: ${i} at path ${chunkPath}`);
            }
        }

        writeStream.end();

        // Wait for write to finish
        await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        });

        console.log(`Combined file created at ${finalPath}`);

        try {
            // Upload to GCS using server credentials
            console.log(`Reading file for GCS upload: ${finalPath}`);
            const fileBuffer = fs.readFileSync(finalPath);
            const file = bucket.file(fullPath);
            
            console.log(`Uploading to GCS: ${fullPath}`);
            
            // Use a promise to handle the upload
            await new Promise((resolve, reject) => {
                const stream = file.createWriteStream({
                    metadata: {
                        contentType: 'audio/mpeg'
                    },
                    resumable: false // Disable resumable uploads for this final step
                });

                stream.on('error', (error) => {
                    console.error('Stream error:', error);
                    reject(error);
                });

                stream.on('finish', () => {
                    console.log('Stream finished successfully');
                    resolve();
                });

                stream.end(fileBuffer);
            });

            console.log('Upload to GCS successful');
            
            // Clean up
            fs.unlinkSync(finalPath);
            res.status(200).json({ 
                message: 'Upload finalized and synced to GCS successfully',
                path: fullPath
            });
        } catch (error) {
            console.error('Error uploading to GCS:', error);
            // Include more detailed error information
            res.status(500).json({ 
                error: 'Failed to upload to GCS',
                details: error.message,
                code: error.code,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    } catch (error) {
        console.error('Error finalizing upload:', error);
        res.status(500).json({ 
            error: 'Failed to finalize upload',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

module.exports = router; 