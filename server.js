const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // Import the cors package
const fs = require('fs');
const path = require('path');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 5001; // Ensure this matches the port in App.js

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

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));
app.use('/effects', express.static(path.join(__dirname, 'public', 'effects')));

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

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
