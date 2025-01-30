require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const { Client } = require('@notionhq/client');
const multer = require('multer');
const { format } = require('util');

// Initialize Google Cloud Storage in production
let storage;
let bucket;
if (process.env.NODE_ENV === 'production') {
    const { Storage } = require('@google-cloud/storage');
    storage = new Storage();
    bucket = storage.bucket('react-app-assets');
}

const app = express();
const PORT = process.env.PORT || 8080;

// Configure multer for file handling
const multerStorage = multer.memoryStorage();
const upload = multer({
    storage: multerStorage,
    limits: {
        fileSize: 15 * 1024 * 1024 // 15MB limit
    },
    fileFilter: (req, file, cb) => {
        if (!file.originalname.toLowerCase().endsWith('.mp3')) {
            return cb(new Error('Only .mp3 files are allowed'));
        }
        cb(null, true);
    }
});

// Add this near the top of your server.js
const initializeNotion = () => {
    if (!process.env.NOTION_API_KEY) {
        console.error('NOTION_API_KEY missing. Current environment:', process.env.NODE_ENV);
        return null;
    }
    
    try {
        const notion = new Client({
            auth: process.env.NOTION_API_KEY
        });
        console.log('Notion client initialized successfully in', process.env.NODE_ENV);
        return notion;
    } catch (error) {
        console.error('Failed to initialize Notion client:', error);
        return null;
    }
};

// Use it when initializing your notion client
const notion = initializeNotion();

// Add security headers, but disable some that might interfere with audio playback
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Configure CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3000' 
    : '*',  // Allow all origins in production
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Limit JSON body size
app.use(bodyParser.json({ limit: '10kb' }));

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
    // Serve static files from the React build
    app.use(express.static(path.join(__dirname, 'build')));
    
    // Serve MP3 files from the mp3s directory
    app.use('/mp3s', express.static(path.join(__dirname, 'mp3s')));
    
    // Serve effects from the public directory
    app.use('/effects', express.static(path.join(__dirname, 'public/effects')));
}

// API Routes
app.put('/api/freeflow', (req, res) => {
  const { time } = req.body;

  if (!time) {
    return res.status(400).json({ error: 'Time is required' });
  }

  res.status(200).json({ message: 'Time received successfully', time });
});

// Helper function to format duration
function formatDuration(duration) {
  const [minutes, seconds] = duration.split(':').map(Number);
  const totalMinutes = minutes + (seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = Math.floor(totalMinutes % 60);
  const remainingSeconds = Math.round((totalMinutes % 1) * 60);

  if (hours > 0) {
    return `${hours}:${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  } else {
    return duration;
  }
}

// Route to log session details
app.post('/api/log-session', async (req, res) => {
  const sessionDetails = req.body;
  
  // Add debug logging
  console.log('Received session details:', sessionDetails);
  
  // Check required fields, excluding 'text'
  const requiredFields = ['date', 'time', 'duration'];
  const missingFields = requiredFields.filter(field => !sessionDetails?.[field]);
  
  if (missingFields.length > 0) {
    const errorMsg = `Incomplete session details. Missing fields: ${missingFields.join(', ')}`;
    console.error(errorMsg);
    return res.status(400).json({ 
      error: errorMsg,
      receivedData: sessionDetails 
    });
  }

  // Ensure text field is at least an empty string if not provided
  sessionDetails.text = sessionDetails.text || '';

  // Format the duration before logging
  sessionDetails.duration = formatDuration(sessionDetails.duration);

  const sessionsFilePath = path.join(__dirname, 'sessions.json');
  let sessions = [];

  try {
    if (await fs.promises.access(sessionsFilePath).then(() => true).catch(() => false)) {
      const fileContent = await fs.promises.readFile(sessionsFilePath, 'utf8');
      sessions = JSON.parse(fileContent);
    }

    sessions.push(sessionDetails);

    await fs.promises.writeFile(sessionsFilePath, JSON.stringify(sessions, null, 2));

    console.log('Session logged:', sessionDetails);
    res.status(200).json({ message: 'Session details logged successfully', sessionDetails });
  } catch (err) {
    res.status(500).json({ error: 'Failed to log session details' });
  }
});

// Add this new endpoint
app.post('/api/notion-log', async (req, res) => {
    // Add environment logging
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Notion API Key exists:', !!process.env.NOTION_API_KEY);
    console.log('Notion Database ID exists:', !!process.env.NOTION_DATABASE_ID);

    if (!notion) {
        console.error('Notion client not initialized - check your NOTION_API_KEY');
        return res.status(500).json({ error: 'Notion client not initialized' });
    }

    if (!process.env.NOTION_DATABASE_ID) {
        console.error('NOTION_DATABASE_ID is not defined in environment variables');
        return res.status(500).json({ error: 'Notion database ID not configured' });
    }

    try {
        console.log('Attempting to create Notion page with properties:', req.body.properties);
        
        const response = await notion.pages.create({
            parent: {
                database_id: process.env.NOTION_DATABASE_ID
            },
            properties: req.body.properties
        });

        console.log('Notion page created successfully');
        res.json({ success: true, notionResponse: response });
    } catch (error) {
        console.error('Detailed Notion error:', error);
        // Send more detailed error information back to client
        res.status(500).json({ 
            error: 'Failed to send to Notion', 
            details: error.message,
            code: error.code,
            statusCode: error.status
        });
    }
});

// Add this test endpoint
app.get('/api/notion-test', async (req, res) => {
    // Check environment variables
    if (!process.env.NOTION_API_KEY || !process.env.NOTION_DATABASE_ID) {
        return res.status(500).json({ 
            error: 'Missing configuration',
            notionKey: !!process.env.NOTION_API_KEY,
            databaseId: !!process.env.NOTION_DATABASE_ID
        });
    }

    if (!notion) {
        return res.status(500).json({ error: 'Notion client not initialized' });
    }

    try {
        // Try to query the database to verify connection
        const response = await notion.databases.query({
            database_id: process.env.NOTION_DATABASE_ID
        });
        
        res.json({ 
            success: true, 
            message: 'Notion connection successful',
            databaseInfo: {
                results: response.results.length,
                hasMore: response.has_more
            }
        });
    } catch (error) {
        res.status(500).json({ 
            error: 'Failed to connect to Notion', 
            details: error.message,
            code: error.code
        });
    }
});

// File upload endpoint
app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        if (process.env.NODE_ENV === 'production') {
            // Upload to Google Cloud Storage
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
            // Development: Save to local directory
            const mp3sDir = path.join(__dirname, 'mp3s');
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
app.get('/mp3s', async (req, res) => {
    try {
        if (process.env.NODE_ENV === 'production') {
            const [files] = await bucket.getFiles();
            const mp3s = files
                .filter(file => file.name.endsWith('.mp3'))
                .map(file => file.name);
            res.json({ mp3s });
        } else {
            const mp3sDir = path.join(__dirname, 'mp3s');
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
app.delete('/mp3s/:filename', async (req, res) => {
    const filename = req.params.filename;

    try {
        if (process.env.NODE_ENV === 'production') {
            await bucket.file(filename).delete();
        } else {
            const filePath = path.join(__dirname, 'mp3s', filename);
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

// Quotes endpoints
app.get('/api/quotes', async (req, res) => {
    try {
        if (process.env.NODE_ENV === 'production') {
            // In production, read from Google Cloud Storage
            const file = bucket.file('data/quotes.json');
            const exists = await file.exists();
            
            if (!exists[0]) {
                // If file doesn't exist, create it with default quotes
                const defaultQuotes = require(path.join(__dirname, 'utils', 'defaultQuotes'));
                await file.save(JSON.stringify({ quotes: defaultQuotes }), {
                    contentType: 'application/json',
                });
                return res.json({ quotes: defaultQuotes });
            }

            const [content] = await file.download();
            const data = JSON.parse(content.toString());
            res.json(data);
        } else {
            // In development, read from local file
            const quotesPath = path.join(__dirname, 'quotes.json');
            if (!fs.existsSync(quotesPath)) {
                const defaultQuotes = require(path.join(__dirname, 'utils', 'defaultQuotes'));
                fs.writeFileSync(quotesPath, JSON.stringify({ quotes: defaultQuotes }));
                return res.json({ quotes: defaultQuotes });
            }
            const data = JSON.parse(fs.readFileSync(quotesPath, 'utf8'));
            res.json(data);
        }
    } catch (error) {
        console.error('Error fetching quotes:', error);
        res.status(500).json({ error: 'Failed to fetch quotes' });
    }
});

app.post('/api/quotes', async (req, res) => {
    const { quote } = req.body;
    if (!quote) {
        return res.status(400).json({ error: 'Quote is required' });
    }

    try {
        if (process.env.NODE_ENV === 'production') {
            // In production, update Google Cloud Storage
            const file = bucket.file('data/quotes.json');
            const [exists] = await file.exists();
            let quotes = [];
            
            if (exists) {
                const [content] = await file.download();
                const data = JSON.parse(content.toString());
                quotes = data.quotes || [];
            }

            quotes.push(quote);
            await file.save(JSON.stringify({ quotes }), {
                contentType: 'application/json',
            });
            res.json({ quotes });
        } else {
            // In development, update local file
            const quotesPath = path.join(__dirname, 'quotes.json');
            let quotes = [];
            
            if (fs.existsSync(quotesPath)) {
                const data = JSON.parse(fs.readFileSync(quotesPath, 'utf8'));
                quotes = data.quotes || [];
            }

            quotes.push(quote);
            fs.writeFileSync(quotesPath, JSON.stringify({ quotes }));
            res.json({ quotes });
        }
    } catch (error) {
        console.error('Error adding quote:', error);
        res.status(500).json({ error: 'Failed to add quote' });
    }
});

app.delete('/api/quotes/:index', async (req, res) => {
    const index = parseInt(req.params.index);
    
    try {
        if (process.env.NODE_ENV === 'production') {
            // In production, update Google Cloud Storage
            const file = bucket.file('data/quotes.json');
            const [exists] = await file.exists();
            
            if (!exists) {
                return res.status(404).json({ error: 'Quotes file not found' });
            }

            const [content] = await file.download();
            const data = JSON.parse(content.toString());
            const quotes = data.quotes || [];

            if (index < 0 || index >= quotes.length) {
                return res.status(400).json({ error: 'Invalid quote index' });
            }

            quotes.splice(index, 1);
            await file.save(JSON.stringify({ quotes }), {
                contentType: 'application/json',
            });
            res.json({ quotes });
        } else {
            // In development, update local file
            const quotesPath = path.join(__dirname, 'quotes.json');
            if (!fs.existsSync(quotesPath)) {
                return res.status(404).json({ error: 'Quotes file not found' });
            }

            const data = JSON.parse(fs.readFileSync(quotesPath, 'utf8'));
            const quotes = data.quotes || [];

            if (index < 0 || index >= quotes.length) {
                return res.status(400).json({ error: 'Invalid quote index' });
            }

            quotes.splice(index, 1);
            fs.writeFileSync(quotesPath, JSON.stringify({ quotes }));
            res.json({ quotes });
        }
    } catch (error) {
        console.error('Error deleting quote:', error);
        res.status(500).json({ error: 'Failed to delete quote' });
    }
});

// Catch-all route to serve React app in production
if (process.env.NODE_ENV === 'production') {
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'build', 'index.html'));
    });
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});
