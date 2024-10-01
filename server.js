const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // Import the cors package
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5001; // Ensure this matches the port in App.js

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

  console.log('Received time:', time);

  res.status(200).json({ message: 'Time received successfully', time });
});

// Route to get the list of .mp3 files
app.get('/mp3s', (req, res) => {
  const mp3Dir = path.join(__dirname, 'mp3s');

  fs.readdir(mp3Dir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Unable to scan directory' });
    }
    const mp3Files = files.filter(file => file.endsWith('.mp3'));
    res.json({ mp3s: mp3Files });
  });
});

// Route to log session details
app.post('/api/log-session', (req, res) => {
  const sessionDetails = req.body;

  if (!sessionDetails || !sessionDetails.date || !sessionDetails.time || !sessionDetails.duration || !sessionDetails.text) {
    return res.status(400).json({ error: 'Incomplete session details' });
  }

  // Log session details to the terminal
  console.log('Logging session details:', sessionDetails);

  const logDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
  }

  const logFileName = `session_${Date.now()}.json`;
  const logFilePath = path.join(logDir, logFileName);

  fs.writeFile(logFilePath, JSON.stringify(sessionDetails, null, 2), (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to log session details' });
    }
    res.status(200).json({ message: 'Session details logged successfully' });
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
