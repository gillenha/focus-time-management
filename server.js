require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // Import the cors package
const fs = require('fs');
const path = require('path');
const helmet = require('helmet');
const { Client } = require('@notionhq/client');

// Only import Storage when in production
let Storage;
if (process.env.NODE_ENV === 'production') {
    const { Storage: GCPStorage } = require('@google-cloud/storage');
    Storage = GCPStorage;
}

const app = express();
const PORT = process.env.SERVER_PORT || 8080; // Change from 5001 to 8080

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

// Define the manifest route BEFORE any static middleware
app.get('/mp3s/manifest.json', async (req, res) => {
    try {
        const env = process.env.NODE_ENV || 'development';
        console.log(`Serving audio files in ${env} environment`);
        
        // Get the appropriate configuration based on environment
        const envConfig = config[env];
        if (!envConfig) {
            throw new Error(`Invalid environment: ${env}`);
        }
        
        const audioFiles = await envConfig.getAudioFiles();
        console.log(`${env}: Sending manifest response:`, audioFiles);
        
        res.json(audioFiles);
    } catch (error) {
        console.error(`Error fetching audio files in ${process.env.NODE_ENV}:`, error);
        res.status(500).json({ error: 'Failed to fetch audio files' });
    }
});

// AFTER the manifest route, set up static file serving
app.use('/mp3s', express.static(path.join(__dirname, 'mp3s')));
app.use('/effects', express.static(path.join(__dirname, 'public/effects')));
app.use(express.static(path.join(__dirname, 'build')));

// Add this configuration at the top of server.js
const config = {
    development: {
        getAudioFiles: async () => {
            const mp3Dir = path.join(__dirname, 'mp3s');
            try {
                const files = await fs.promises.readdir(mp3Dir);
                console.log('Development: Reading local MP3 files from:', mp3Dir);
                // Return only the filenames for local development
                const audioFiles = files
                    .filter(file => file.endsWith('.mp3'))
                    .map(file => `/mp3s/${file}`);
                console.log('Development: Found audio files:', audioFiles);
                return audioFiles;
            } catch (error) {
                console.error('Development: Error reading mp3s directory:', error);
                return [];
            }
        }
    },
    production: {
        getAudioFiles: async () => {
            if (!Storage) {
                console.error('Storage is not initialized in production');
                return [];
            }
            try {
                console.log('Production: Fetching files from Google Cloud Storage');
                const storage = new Storage();
                const bucket = storage.bucket('react-app-assets');
                const [files] = await bucket.getFiles({ prefix: 'audio/' });
                const audioFiles = files
                    .filter(file => file.name.endsWith('.mp3'))
                    .map(file => `https://storage.googleapis.com/react-app-assets/${file.name}`);
                console.log('Production: Found audio files:', audioFiles);
                return audioFiles;
            } catch (error) {
                console.error('Production: Error fetching from GCS:', error);
                return [];
            }
        }
    }
};

// Add a debug route to check MP3 files
app.get('/debug/mp3s', async (req, res) => {
  const mp3Dir = path.join(__dirname, 'mp3s');
  try {
    const files = await fs.promises.readdir(mp3Dir);
    res.json({
      directory: mp3Dir,
      files: files,
      exists: await fs.promises.access(mp3Dir).then(() => true).catch(() => false)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route to handle PUT requests for Freeflow
app.put('/api/freeflow', (req, res) => {
  const { time } = req.body;

  if (!time) {
    return res.status(400).json({ error: 'Time is required' });
  }

  res.status(200).json({ message: 'Time received successfully', time });
});

// Route to get the list of .mp3 files
app.get('/mp3s', async (req, res) => {
  const mp3Dir = path.join(__dirname, 'mp3s');

  try {
    const files = await fs.promises.readdir(mp3Dir);
    const mp3Files = files.filter(file => file.endsWith('.mp3'));
    res.json({ mp3s: mp3Files });
  } catch (err) {
    res.status(500).json({ error: 'Unable to scan directory' });
  }
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

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// CORS headers middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Move the catch-all route to be the very last route
app.get('*', (req, res) => {
  // In development, don't try to serve index.html
  if (process.env.NODE_ENV === 'development') {
    res.status(404).send('Not found in development mode');
    return;
  }
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});
