const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { Storage } = require('@google-cloud/storage');

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
let isInitializing = false;
let initializationError = null;

async function initializeStorage() {
    if (isInitializing) {
        console.log('Storage initialization already in progress');
        return;
    }
    
    if (bucket) {
        console.log('Storage already initialized');
        return;
    }

    try {
        isInitializing = true;
        console.log('Initializing Google Cloud Storage...');
        
        // Always use Application Default Credentials
        storage = new Storage();
        
        // Initialize the bucket
        bucket = storage.bucket('react-app-assets');

        // Verify bucket access
        const [exists] = await bucket.exists();
        if (!exists) {
            throw new Error('Bucket does not exist');
        }
        
        console.log('Successfully connected to GCS bucket');
        initializationError = null;
    } catch (error) {
        console.error('Failed to initialize Google Cloud Storage:', error);
        initializationError = error;
        bucket = null;
        throw error;
    } finally {
        isInitializing = false;
    }
}

// Initialize storage when the module loads
initializeStorage().catch(error => {
    console.error('Initial storage initialization failed:', error);
});

// Middleware to ensure storage is initialized
const ensureStorageInitialized = async (req, res, next) => {
    if (bucket) {
        return next();
    }

    if (initializationError) {
        console.error('Using cached initialization error:', initializationError);
        return res.status(500).json({ 
            error: 'Storage not initialized',
            details: initializationError.message
        });
    }

    try {
        await initializeStorage();
        next();
    } catch (error) {
        res.status(500).json({ 
            error: 'Storage not initialized',
            details: error.message
        });
    }
};

// Upload file
router.post('/upload', ensureStorageInitialized, upload.single('file'), async (req, res) => {
    console.log('Upload request received');
    try {
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
            resumable: true,
            metadata: {
                contentType: 'audio/mpeg'
            },
            timeout: 300000, // 5 minutes timeout
            chunkSize: 5 * 1024 * 1024 // 5MB chunks
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
router.put('/upload-chunk/:fileName', ensureStorageInitialized, async (req, res) => {
    const fileName = req.params.fileName;
    const targetFolder = process.env.NODE_ENV === 'production' ? 'tracks' : 'test';
    const fullPath = `${targetFolder}/${fileName}`;
    
    try {
        if (process.env.NODE_ENV === 'production') {
            const file = bucket.file(fullPath);
            const writeStream = file.createWriteStream({
                resumable: true,
                metadata: {
                    contentType: 'audio/mpeg'
                }
            });

            // Handle errors during upload
            writeStream.on('error', (error) => {
                console.error('Error uploading to GCS:', error);
                res.status(500).json({ 
                    error: 'Upload failed',
                    details: error.message
                });
            });

            // Handle successful upload
            writeStream.on('finish', () => {
                res.status(200).json({ 
                    message: 'Upload successful',
                    file: fullPath
                });
            });

            // Stream the request directly to GCS
            req.pipe(writeStream);
        } else {
            // For development, save to local filesystem
            const mp3sDir = path.join(process.cwd(), 'mp3s');
            const filePath = path.join(mp3sDir, fileName);
            
            const writeStream = fs.createWriteStream(filePath);
            
            writeStream.on('error', (error) => {
                console.error('Error saving file:', error);
                res.status(500).json({ 
                    error: 'Upload failed',
                    details: error.message
                });
            });

            writeStream.on('finish', () => {
                res.status(200).json({ 
                    message: 'Upload successful',
                    file: fileName
                });
            });

            // Stream the request to local file
            req.pipe(writeStream);
        }
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ 
            error: 'Upload failed',
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