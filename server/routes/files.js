const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Store upload metadata
const uploads = new Map();

// Local storage paths
const UPLOADS_DIR = '/mnt/media/focus-music';
const TRACKS_DIR = path.join(UPLOADS_DIR, 'tracks');
const TEST_DIR = path.join(UPLOADS_DIR, 'tracks');
const IMAGES_DIR = path.join(UPLOADS_DIR, 'my-images');
const TEMP_DIR = path.join(__dirname, '../../temp');

// Ensure directories exist
[UPLOADS_DIR, TRACKS_DIR, TEST_DIR, IMAGES_DIR, TEMP_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Configure multer for file handling
const multerStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!fs.existsSync(TEMP_DIR)) {
            fs.mkdirSync(TEMP_DIR, { recursive: true });
        }
        cb(null, TEMP_DIR);
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

// Get target directory based on environment
function getTargetDir() {
    return process.env.NODE_ENV === 'production' ? TRACKS_DIR : TEST_DIR;
}

// Upload file
router.post('/upload', upload.single('file'), async (req, res) => {
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

        // Save to local storage
        const targetDir = getTargetDir();
        const targetFolder = process.env.NODE_ENV === 'production' ? 'tracks' : 'test';
        const destinationPath = path.join(targetDir, req.file.originalname);
        const blobPath = `${targetFolder}/${req.file.originalname}`;

        console.log('Saving to local path:', destinationPath);

        // Copy file to destination
        fs.copyFileSync(req.file.path, destinationPath);

        // Clean up temp file
        fs.unlinkSync(req.file.path);

        console.log('File saved successfully');
        res.status(200).json({
            message: 'File uploaded successfully',
            file: {
                name: blobPath,
                size: req.file.size
            }
        });
    } catch (error) {
        // Clean up temp file on error
        if (req.file && fs.existsSync(req.file.path)) {
            console.error('Cleaning up temp file after error');
            fs.unlinkSync(req.file.path);
        }
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload file', details: error.message });
    }
});

// Get signed URL for direct upload (not needed for local storage, but keep for compatibility)
router.post('/get-signed-url', async (req, res) => {
    try {
        // For local storage, we don't need signed URLs
        // Just return success so client can proceed with regular upload
        res.json({
            message: 'Local storage enabled - use regular upload endpoint',
            useRegularUpload: true
        });
    } catch (error) {
        console.error('Error in signed URL endpoint:', error);
        res.status(500).json({ error: 'Failed to process request' });
    }
});

// Finalize upload
router.post('/finalize-upload', async (req, res) => {
    const { uploadId } = req.body;

    try {
        const uploadInfo = uploads.get(uploadId);
        if (!uploadInfo) {
            return res.status(404).json({ error: 'Upload not found' });
        }

        const { fileName, tempDir, totalChunks } = uploadInfo;
        const targetDir = getTargetDir();
        const folder = 'tracks/';
        const destinationPath = path.join(targetDir, fileName);
        const blobPath = `${folder}${fileName}`;

        console.log(`Finalizing upload: ${fileName} to ${destinationPath}`);

        // Combine chunks into final file
        const writeStream = fs.createWriteStream(destinationPath);

        await new Promise((resolve, reject) => {
            writeStream.on('error', reject);
            writeStream.on('finish', resolve);

            // Combine and stream chunks
            for (let i = 0; i < totalChunks; i++) {
                const chunkPath = path.join(tempDir, `chunk-${i}`);
                const chunkData = fs.readFileSync(chunkPath);
                writeStream.write(chunkData);
            }
            writeStream.end();
        });

        // Clean up
        fs.rmSync(tempDir, { recursive: true, force: true });
        uploads.delete(uploadId);

        console.log(`Upload finalized successfully: ${destinationPath}`);
        res.json({ success: true, fileName: blobPath });
    } catch (error) {
        console.error('Finalize error:', error);
        res.status(500).json({
            error: 'Failed to finalize upload',
            details: error.message
        });
    }
});

// List MP3 files
router.get('/list-tracks', async (req, res) => {
    try {
        const targetDir = getTargetDir();
        const folder = 'tracks/';
        console.log(`Listing files from local directory: ${targetDir}`);

        if (!fs.existsSync(targetDir)) {
            console.log('Target directory does not exist, creating it');
            fs.mkdirSync(targetDir, { recursive: true });
            return res.json({ items: [] });
        }

        const files = fs.readdirSync(targetDir);
        const items = files
            .filter(file => file.endsWith('.mp3'))
            .map(file => {
                const filePath = path.join(targetDir, file);
                const stats = fs.statSync(filePath);
                return {
                    name: `${folder}${file}`,
                    size: stats.size
                };
            });

        console.log(`Found ${items.length} files in ${targetDir}`);
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
router.get('/list-images', async (req, res) => {
    try {
        console.log(`Listing images from local directory: ${IMAGES_DIR}`);

        if (!fs.existsSync(IMAGES_DIR)) {
            console.log('Images directory does not exist, creating it');
            fs.mkdirSync(IMAGES_DIR, { recursive: true });
            return res.json({ items: [] });
        }

        const files = fs.readdirSync(IMAGES_DIR);
        const items = files
            .filter(file => file.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/))
            .map(file => {
                const filePath = path.join(IMAGES_DIR, file);
                const stats = fs.statSync(filePath);
                // Generate URL for accessing the image
                const url = `${process.env.REACT_APP_API_URL || 'http://devpigh.local:8082'}/uploads/my-images/${file}`;
                return {
                    name: `my-images/${file}`,
                    size: stats.size,
                    url: url,
                    contentType: getContentType(file)
                };
            });

        console.log(`Found ${items.length} images in ${IMAGES_DIR}`);
        res.json({ items });
    } catch (error) {
        console.error('Error listing images:', error);
        res.status(500).json({
            error: 'Failed to list images',
            details: error.message
        });
    }
});

// Helper function to get content type
function getContentType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const types = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp'
    };
    return types[ext] || 'application/octet-stream';
}

// Delete MP3 file
router.delete('/:filename(*)', async (req, res) => {
    try {
        const filename = req.params.filename;
        console.log('Attempting to delete file:', filename);

        // Parse filename to get actual file path
        // filename format: "test/song.mp3" or "tracks/song.mp3"
        const filePath = path.join(UPLOADS_DIR, filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                error: 'File not found',
                details: `File ${filename} does not exist`
            });
        }

        fs.unlinkSync(filePath);
        console.log(`Successfully deleted file: ${filePath}`);

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
        const targetDir = getTargetDir();
        const folder = 'tracks/';

        if (!fs.existsSync(targetDir)) {
            return res.json({});
        }

        const files = fs.readdirSync(targetDir);
        const sizes = {};

        files
            .filter(file => file.endsWith('.mp3'))
            .forEach(file => {
                const filePath = path.join(targetDir, file);
                const stats = fs.statSync(filePath);
                sizes[`${folder}${file}`] = stats.size;
            });

        res.json(sizes);
    } catch (error) {
        console.error('Error getting file sizes:', error);
        res.status(500).json({ error: 'Failed to get file sizes' });
    }
});

// Initialize upload
router.post('/init-upload', async (req, res) => {
    try {
        const { fileName, fileSize, totalChunks } = req.body;
        const uploadId = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
        const tempDir = path.join(TEMP_DIR, uploadId);

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

        // Store metadata in memory
        uploads.set(uploadId, metadata);

        res.json({ uploadId });
    } catch (error) {
        console.error('Upload initialization error:', error);
        res.status(500).json({ error: 'Failed to initialize upload' });
    }
});

// Bulk upload status endpoint
router.get('/upload-status/:uploadIds', async (req, res) => {
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
        if (req.file && fs.existsSync(req.file.path)) {
            console.error('Cleaning up temp file:', req.file.path);
            fs.unlinkSync(req.file.path);
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
router.post('/cleanup-uploads', async (req, res) => {
    try {
        const { uploadIds } = req.body;
        let cleanedCount = 0;

        for (const uploadId of uploadIds || []) {
            const uploadInfo = uploads.get(uploadId);
            if (uploadInfo && uploadInfo.tempDir) {
                try {
                    // Clean up temp files
                    if (fs.existsSync(uploadInfo.tempDir)) {
                        fs.rmSync(uploadInfo.tempDir, { recursive: true, force: true });
                    }
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
