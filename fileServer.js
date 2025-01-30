const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

// CORS configuration for development
app.use(cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type'],
    optionsSuccessStatus: 204
}));

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

// Get file sizes
app.get('/mp3s/sizes', (req, res) => {
    const mp3sDir = path.join(__dirname, 'mp3s');
    try {
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
    } catch (error) {
        console.error('Error getting file sizes:', error);
        res.status(500).json({ error: 'Failed to get file sizes' });
    }
});

// Delete MP3 file
app.delete('/mp3s/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'mp3s', filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
    }

    try {
        fs.unlinkSync(filePath);
        res.json({ message: 'File deleted successfully' });
    } catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).json({ error: 'Failed to delete file' });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`File server running on port ${PORT}`);
}); 