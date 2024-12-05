const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

// More specific CORS configuration
app.use(cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

// File size limit (15MB)
const MAX_FILE_SIZE = 15 * 1024 * 1024;

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const mp3sDir = path.join(__dirname, 'mp3s');
        // Create mp3s directory if it doesn't exist
        if (!fs.existsSync(mp3sDir)) {
            fs.mkdirSync(mp3sDir, { recursive: true });
        }
        cb(null, mp3sDir);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ 
    storage,
    limits: {
        fileSize: MAX_FILE_SIZE
    },
    fileFilter: (req, file, cb) => {
        // Check file extension
        if (path.extname(file.originalname).toLowerCase() === '.mp3') {
            cb(null, true);
        } else {
            cb(new Error('Only .mp3 files are allowed'));
        }
    }
});

// Serve static files from mp3s directory
app.use('/mp3s', express.static(path.join(__dirname, 'mp3s')));

// Serve static files from public/effects directory
app.use('/effects', express.static(path.join(__dirname, 'public', 'effects')));

// Handle file uploads
app.post('/upload', (req, res) => {
    upload.single('file')(req, res, (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ 
                    error: `File size too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` 
                });
            }
            return res.status(400).json({ error: err.message });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        res.json({ 
            message: 'File uploaded successfully',
            file: {
                name: req.file.originalname,
                size: req.file.size
            }
        });
    });
});

// List MP3 files
app.get('/mp3s', (req, res) => {
    const mp3sDir = path.join(__dirname, 'mp3s');
    fs.readdir(mp3sDir, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read mp3s directory' });
        }
        const mp3s = files.filter(file => file.endsWith('.mp3'));
        res.json({ mp3s });
    });
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Development server running on port ${PORT}`);
    console.log(`Maximum file size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
});
