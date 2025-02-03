const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');

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

// Initialize Google Cloud Storage in production
let storage;
let bucket;
if (process.env.NODE_ENV === 'production') {
    const { Storage } = require('@google-cloud/storage');
    storage = new Storage();
    bucket = storage.bucket('react-app-assets');
}

// Upload file
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
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

// List MP3 files
router.get('/list', async (req, res) => {
    try {
        if (process.env.NODE_ENV === 'production') {
            const [files] = await bucket.getFiles();
            const mp3s = files
                .filter(file => file.name.endsWith('.mp3'))
                .map(file => file.name);
            res.json({ mp3s });
        } else {
            const mp3sDir = path.join(process.cwd(), 'mp3s');
            if (!fs.existsSync(mp3sDir)) {
                fs.mkdirSync(mp3sDir, { recursive: true });
            }
            const files = fs.readdirSync(mp3sDir);
            const mp3s = files.filter(file => file.endsWith('.mp3'));
            res.json({ mp3s });
        }
    } catch (error) {
        console.error('Error listing files:', error);
        res.status(500).json({ error: 'Failed to list files' });
    }
});

// Delete MP3 file
router.delete('/:filename', async (req, res) => {
    const filename = req.params.filename;

    try {
        if (process.env.NODE_ENV === 'production') {
            await bucket.file(filename).delete();
        } else {
            const filePath = path.join(process.cwd(), 'mp3s', filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        res.json({ message: 'File deleted successfully' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Failed to delete file' });
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

module.exports = router; 