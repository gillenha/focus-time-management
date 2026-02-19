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

const imageUpload = multer({
    storage: multerStorage,
    fileFilter: (req, file, cb) => {
        const allowed = /\.(jpg|jpeg|png|gif|webp)$/i;
        if (!allowed.test(file.originalname)) {
            return cb(new Error('Only image files (.jpg, .jpeg, .png, .gif, .webp) are allowed'));
        }
        cb(null, true);
    }
});

// Local filesystem storage for development image management
const localImagesDir = path.join(process.cwd(), 'my-images');
if (process.env.NODE_ENV !== 'production') {
    if (!fs.existsSync(localImagesDir)) {
        fs.mkdirSync(localImagesDir, { recursive: true });
    }
    console.log('Development mode: local images directory at', localImagesDir);
}

// Initialize Google Cloud Storage
let storage;
let bucket;

async function initializeStorage() {
    try {
        const config = {};
        if (process.env.NODE_ENV === 'production') {
            // In production, use default credentials provided by Cloud Run
            console.log('Using default Cloud Run service account credentials');
        } else {
            // In development, use local credentials
            if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
                config.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
                console.log('Using service account credentials from GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
            } else {
                console.warn('GOOGLE_APPLICATION_CREDENTIALS not set in development mode. Consider running "gcloud auth application-default login" or setting the variable in your .env file.');
            }
        }
        
        storage = new Storage(config);
        // Always use just the bucket name, no folders
        bucket = storage.bucket('react-app-assets');

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

// Serve local images in development
if (process.env.NODE_ENV !== 'production') {
    router.use('/local-images', express.static(localImagesDir));
}

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

// Upload image to my-images folder
router.post('/upload-image', ensureStorageInitialized, (req, res, next) => {
    imageUpload.single('file')(req, res, (err) => {
        if (err) {
            console.error('Multer image upload error:', err);
            return res.status(400).json({ error: err.message });
        }
        next();
    });
}, async (req, res) => {
    console.log('Image upload request received');
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        console.log('Image file received:', {
            originalname: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype
        });

        // Development: save to local filesystem
        if (process.env.NODE_ENV !== 'production') {
            const safeName = path.basename(req.file.originalname);
            const destPath = path.join(localImagesDir, safeName);
            fs.renameSync(req.file.path, destPath);
            const publicUrl = `${req.protocol}://${req.get('host')}/api/files/local-images/${encodeURIComponent(safeName)}`;
            console.log('Image saved locally:', destPath);
            return res.status(200).json({
                message: 'Image uploaded successfully',
                file: {
                    name: `my-images/${safeName}`,
                    size: req.file.size,
                    url: publicUrl
                }
            });
        }

        // Production: upload to GCS
        if (!bucket) {
            throw new Error('Google Cloud Storage not initialized');
        }

        const blobPath = `my-images/${req.file.originalname}`;
        console.log('Uploading image to GCS path:', blobPath);

        const blob = bucket.file(blobPath);
        const blobStream = blob.createWriteStream({
            resumable: false,
            metadata: {
                contentType: req.file.mimetype
            },
            timeout: 120000
        });

        blobStream.on('error', (err) => {
            console.error('GCS image upload error:', err);
            fs.unlink(req.file.path, () => {});
            res.status(500).json({ error: 'Failed to upload image', details: err.message });
        });

        blobStream.on('finish', () => {
            console.log('GCS image upload completed successfully');
            fs.unlink(req.file.path, () => {});
            const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blobPath}`;
            res.status(200).json({
                message: 'Image uploaded successfully',
                file: {
                    name: blobPath,
                    size: req.file.size,
                    url: publicUrl
                }
            });
        });

        const fileStream = fs.createReadStream(req.file.path);
        fileStream.on('error', (err) => {
            console.error('File read error:', err);
            res.status(500).json({ error: 'Failed to read file', details: err.message });
        });
        fileStream.pipe(blobStream);

    } catch (error) {
        if (req.file) {
            fs.unlink(req.file.path, () => {});
        }
        console.error('Image upload error:', error);
        res.status(500).json({ error: 'Failed to upload image', details: error.message });
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
    const { uploadId } = req.body;
    
    try {
        const uploadInfo = uploads.get(uploadId);
        if (!uploadInfo) {
            return res.status(404).json({ error: 'Upload not found' });
        }

        const { fileName, tempDir, totalChunks } = uploadInfo;
        const folder = process.env.NODE_ENV === 'production' ? 'tracks/' : 'test/';
        const destinationPath = `${folder}${fileName}`;
        
        console.log(`Finalizing upload: ${fileName} to ${destinationPath}`);
        
        // Create a write stream to GCS
        const blob = bucket.file(destinationPath);
        const blobStream = blob.createWriteStream({
            resumable: false,
            metadata: {
                contentType: 'audio/mpeg'
            }
        });

        // Handle upload completion
        await new Promise((resolve, reject) => {
            blobStream.on('error', reject);
            blobStream.on('finish', resolve);

            // Combine and stream chunks
            for (let i = 0; i < totalChunks; i++) {
                const chunkPath = path.join(tempDir, `chunk-${i}`);
                const chunkData = fs.readFileSync(chunkPath);
                blobStream.write(chunkData);
            }
            blobStream.end();
        });

        // Clean up
        fs.rmSync(tempDir, { recursive: true, force: true });
        uploads.delete(uploadId);
        
        console.log(`Upload finalized successfully: ${destinationPath}`);
        res.json({ success: true, fileName: destinationPath });
    } catch (error) {
        console.error('Finalize error:', error);
        res.status(500).json({ 
            error: 'Failed to finalize upload',
            details: error.message
        });
    }
});

// List MP3 files with folder support
router.get('/list-tracks', ensureStorageInitialized, async (req, res) => {
    try {
        if (!bucket) {
            throw new Error('Google Cloud Storage not initialized');
        }

        // Use environment-specific folder
        const folder = process.env.NODE_ENV === 'production' ? 'tracks/' : 'test/';
        console.log(`Listing files from bucket: ${bucket.name}, folder: ${folder}`);
        
        const [files] = await bucket.getFiles({ prefix: folder });
        const items = await Promise.all(files
            .filter(file => file.name.endsWith('.mp3'))
            .map(async file => {
                const [metadata] = await file.getMetadata();
                return {
                    name: file.name,
                    size: parseInt(metadata.size)
                };
            }));
            
        console.log(`Found ${items.length} files in ${folder}`);
        res.json({ items });
    } catch (error) {
        console.error('Error listing files:', error);
        res.status(500).json({ 
            error: 'Failed to list files',
            details: error.message
        });
    }
});

// List images from my-images folder
router.get('/list-images', ensureStorageInitialized, async (req, res) => {
    try {
        // Development: list from local filesystem
        if (process.env.NODE_ENV !== 'production') {
            if (!fs.existsSync(localImagesDir)) {
                return res.json({ items: [] });
            }
            const localFiles = fs.readdirSync(localImagesDir);
            const imageFilter = /\.(jpg|jpeg|png|gif|webp)$/i;
            const items = localFiles
                .filter(f => imageFilter.test(f))
                .map(f => {
                    const stats = fs.statSync(path.join(localImagesDir, f));
                    const ext = f.split('.').pop().toLowerCase();
                    return {
                        name: `my-images/${f}`,
                        size: stats.size,
                        url: `${req.protocol}://${req.get('host')}/api/files/local-images/${encodeURIComponent(f)}`,
                        contentType: ext === 'jpg' ? 'image/jpeg' : `image/${ext}`
                    };
                });
            console.log(`Found ${items.length} local images`);
            return res.json({ items });
        }

        // Production: list from GCS
        const folder = 'my-images/';
        console.log(`Listing images from bucket: ${bucket.name}, folder: ${folder}`);

        const [files] = await bucket.getFiles({ prefix: folder });
        const items = await Promise.all(files
            .filter(file => file.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/))
            .map(async file => {
                const [metadata] = await file.getMetadata();
                const publicUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;
                return {
                    name: file.name,
                    size: parseInt(metadata.size),
                    url: publicUrl,
                    contentType: metadata.contentType
                };
            }));

        console.log(`Found ${items.length} images in ${folder}`);
        res.json({ items });
    } catch (error) {
        console.error('Error listing images:', error);
        res.status(500).json({
            error: 'Failed to list images',
            details: error.message
        });
    }
});

// Delete file
router.delete('/:filename(*)', ensureStorageInitialized, async (req, res) => {
    try {
        const filename = req.params.filename;
        console.log('Attempting to delete file:', filename);

        // Development: handle local image deletion
        if (process.env.NODE_ENV !== 'production' && filename.startsWith('my-images/')) {
            const safeName = path.basename(filename);
            const localFile = path.join(localImagesDir, safeName);
            if (fs.existsSync(localFile)) {
                fs.unlinkSync(localFile);
                console.log(`Deleted local image: ${safeName}`);
                return res.json({ message: 'File deleted successfully' });
            }
            return res.status(404).json({
                error: 'File not found',
                details: `File ${filename} does not exist locally`
            });
        }

        // Production: delete from GCS
        if (!bucket) {
            throw new Error('Google Cloud Storage not initialized');
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
        console.log(`Successfully deleted file from GCS: ${filename}`);

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
router.get('/sizes', ensureStorageInitialized, async (req, res) => {
    try {
        if (!bucket) {
            throw new Error('Google Cloud Storage not initialized');
        }

        // Use environment-specific folder
        const folder = process.env.NODE_ENV === 'production' ? 'tracks/' : 'test/';
        const [files] = await bucket.getFiles({ prefix: folder });
        const sizes = {};
        
        for (const file of files) {
            if (file.name.endsWith('.mp3')) {
                const [metadata] = await file.getMetadata();
                sizes[file.name] = parseInt(metadata.size);
            }
        }
        
        res.json(sizes);
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

// Bulk upload status endpoint
router.get('/upload-status/:uploadIds', ensureStorageInitialized, async (req, res) => {
    try {
        const uploadIds = req.params.uploadIds.split(',');
        const statuses = {};
        
        uploadIds.forEach(id => {
            const uploadInfo = uploads.get(id);
            if (uploadInfo) {
                statuses[id] = {
                    status: 'active',
                    receivedChunks: uploadInfo.receivedChunks,
                    totalChunks: uploadInfo.totalChunks,
                    progress: Math.round((uploadInfo.receivedChunks / uploadInfo.totalChunks) * 100)
                };
            } else {
                statuses[id] = { status: 'not_found' };
            }
        });
        
        res.json(statuses);
    } catch (error) {
        console.error('Error getting upload status:', error);
        res.status(500).json({ error: 'Failed to get upload status' });
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

// Bulk cleanup endpoint (for cancelled uploads)
router.post('/cleanup-uploads', ensureStorageInitialized, async (req, res) => {
    try {
        const { uploadIds } = req.body;
        let cleanedCount = 0;
        
        for (const uploadId of uploadIds || []) {
            const uploadInfo = uploads.get(uploadId);
            if (uploadInfo && uploadInfo.tempDir) {
                try {
                    // Clean up temp files
                    fs.rmSync(uploadInfo.tempDir, { recursive: true, force: true });
                    uploads.delete(uploadId);
                    cleanedCount++;
                } catch (cleanupError) {
                    console.error(`Failed to cleanup ${uploadId}:`, cleanupError);
                }
            }
        }
        
        res.json({ 
            message: `Cleaned up ${cleanedCount} upload sessions`,
            cleanedCount 
        });
    } catch (error) {
        console.error('Cleanup error:', error);
        res.status(500).json({ error: 'Failed to cleanup uploads' });
    }
});

module.exports = router; 