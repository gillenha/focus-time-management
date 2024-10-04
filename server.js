const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // Import the cors package
const fs = require('fs');
const path = require('path');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 5001; // Ensure this matches the port in App.js

// Add security headers
app.use(helmet());

// Limit CORS to specific origins
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*'
}));

// Limit JSON body size
app.use(bodyParser.json({ limit: '10kb' }));

// Middleware to enable CORS
app.use(cors());

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));
app.use('/effects', express.static(path.join(__dirname, 'public', 'effects')));
app.use('/mp3s', express.static(path.join(__dirname, 'mp3s'))); // Serve from /mp3s directory

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

// Route to log session details
app.post('/api/log-session', async (req, res) => {
  const sessionDetails = req.body;

  if (!sessionDetails || !sessionDetails.date || !sessionDetails.time || !sessionDetails.duration || !sessionDetails.text) {
    return res.status(400).json({ error: 'Incomplete session details' });
  }

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
