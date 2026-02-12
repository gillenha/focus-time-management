const path = require('path');
const fs = require('fs');
const envFile = `.env.${process.env.NODE_ENV}`;
const envPath = path.resolve(process.cwd(), envFile);

console.log('Current working directory:', process.cwd());
console.log('Looking for environment file:', envPath);
console.log('File exists:', fs.existsSync(envPath));

try {
  require('dotenv').config({
    path: envPath,
    debug: process.env.NODE_ENV === 'development'
  });

  console.log('Environment loaded successfully');
  console.log('NODE_ENV:', process.env.NODE_ENV);
} catch (error) {
  console.error('Error loading environment:', error);
}

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
const quoteController = require('./server/controllers/quoteController');
const quotesRouter = require('./server/routes/quotes');
const filesRouter = require('./server/routes/files');
const sessionsRouter = require('./server/routes/sessions');
const projectRoutes = require('./server/routes/projects');

const app = express();
const PORT = process.env.SERVER_PORT || 8082;

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

// Add security headers, but disable some that might interfere with audio playback
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Configure CORS
const allowedOrigins = process.env.NODE_ENV === 'development'
  ? ['http://devpigh.local:3000', 'http://localhost:3000']
  : '*';

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Content-Range',
    'X-Upload-Content-Type',
    'X-Upload-Content-Length'
  ]
}));

// Limit JSON body size
app.use(bodyParser.json({ limit: '10kb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
        port: PORT
    });
});

// API Routes
app.use('/api/quotes', quotesRouter);
app.use('/api/files', filesRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/projects', projectRoutes);

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

// Route to log session details (kept for backwards compatibility, but sessions should use /api/sessions)
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

// Quotes endpoints (legacy support)
app.get('/api/quotes', quoteController.getQuotes);
app.post('/api/quotes', quoteController.addQuote);
app.delete('/api/quotes/:id', quoteController.deleteQuote);

// Serve static files for uploads
app.use('/uploads', express.static('/mnt/media/focus-music'));

// Serve static files in both development and production
app.use('/effects', express.static(path.join(__dirname, 'public/effects')));

// Additional static files in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'build')));

    // Catch-all route for React app routes only (not API routes)
    app.get(/^(?!\/(api|effects|uploads)).*/, (req, res) => {
        res.sendFile(path.join(__dirname, 'build', 'index.html'));
    });
}

const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
    console.log(`Server is running on ${HOST}:${PORT} in ${process.env.NODE_ENV} mode`);
    console.log('Using local JSON file storage (no MongoDB)');
    console.log('Using local file storage (no Google Cloud Storage)');
});
