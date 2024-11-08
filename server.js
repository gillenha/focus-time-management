require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // Import the cors package
const fs = require('fs');
const path = require('path');
const helmet = require('helmet');
const { Client } = require('@notionhq/client');

const app = express();
const PORT = process.env.PORT || 8080; // Change from 5001 to 8080

// Initialize Notion client
let notion;
try {
    notion = new Client({
        auth: process.env.NOTION_API_KEY
    });
    console.log('Notion client initialized successfully');
} catch (error) {
    console.error('Failed to initialize Notion client:', error);
}

// Add security headers, but disable some that might interfere with audio playback
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Configure CORS
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Limit JSON body size
app.use(bodyParser.json({ limit: '10kb' }));

// Serve static files from the React build directory
app.use(express.static(path.join(__dirname, 'build')));

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Serve MP3 files with proper headers
app.use('/mp3s', express.static(path.join(__dirname, 'mp3s')));

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

  if (!sessionDetails || !sessionDetails.date || !sessionDetails.time || !sessionDetails.duration || !sessionDetails.text) {
    return res.status(400).json({ error: 'Incomplete session details' });
  }

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
    if (!notion) {
        return res.status(500).json({ error: 'Notion client not initialized' });
    }

    try {
        console.log('Attempting to create Notion page with properties:', req.body.properties);
        
        const response = await notion.pages.create({
            parent: {
                database_id: process.env.NOTION_DATABASE_ID
            },
            properties: {
                Name: {
                    title: [
                        {
                            text: {
                                content: "Focus Session"
                            }
                        }
                    ]
                },
                ...req.body.properties
            }
        });

        console.log('Notion page created successfully');
        res.json({ success: true, notionResponse: response });
    } catch (error) {
        console.error('Detailed Notion error:', error);
        res.status(500).json({ 
            error: 'Failed to send to Notion', 
            details: error.message,
            code: error.code
        });
    }
});

// Add this test endpoint
app.get('/api/notion-test', async (req, res) => {
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

// Add this route to serve the manifest
app.get('/mp3s/manifest.json', (req, res) => {
  res.json([
    "https://storage.googleapis.com/react-app-assets/the-social-network-soundtrack.mp3"
  ]);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
