# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Development
- `npm run dev` - Start both frontend and backend in development mode (recommended)
  - Frontend runs on http://devpigh.local:3000 (bound to 0.0.0.0)
  - Backend API runs on http://devpigh.local:8082
- `npm start` - Start React development server only (port 3000)
- `npm run start:dev` - Start React with development config for Pi network
- `npm run start:server:dev` - Start Express server only in development with nodemon (port 8082)
- `npm run serve` - Start production server (port 8082)

### Building
- `npm run build` - Build production React bundle for Pi
- `npm run build:production` - Build with explicit production env
- `npm run dist` - Build Electron distribution

### Testing
- Uses Jest and React Testing Library (included with Create React App)
- Run tests with `npm test` (interactive watch mode)
- Single test file: `npm test App.test.js`
- Test file located at `src/App.test.js`

### Docker (Production on Raspberry Pi)
- `docker compose up -d` - Build and start as daemon
- `docker compose down` - Stop the daemon
- `docker compose logs -f` - View logs
- `docker compose up -d --build` - Rebuild and restart
- Container auto-restarts on boot via `restart: unless-stopped`
- Data persisted in `focus-data` Docker volume

### Deployment (Legacy GCP)
- `npm run deploy` - Deploy to Google Cloud Platform using gcloud
- Docker builds use multi-stage process (React build -> Node.js server)

## Architecture Overview

### Frontend (React SPA)
- **Main App** (`src/App.js`) - Central state management for focus sessions, audio, UI modals
- **Components Structure**:
  - `HandleTimer` - Main timer display and session logic
  - `MusicPlayer` - Audio controls and session input
  - `VolumeBar` - Audio volume controls
  - `Menu` - Navigation sidebar with various features
- **Pages**: Profile, Projects, Session History, Track List, Quote List, Change Background
- **Context**: `AudioContext` for audio state management
- **State Persistence**: localStorage for sessions, settings, and playlists

### Backend (Express.js)
- **Server** (`server.js`) - Main server with file uploads, session logging
- **Database**: Local JSON file storage (in `data/` directory)
- **Routes**:
  - `/api/sessions` - Focus session CRUD
  - `/api/projects` - Project management
  - `/api/quotes` - Inspirational quotes
  - `/api/files` - MP3 file management
  - `/api/favorites` - Background image favorites
- **File Storage**: Local filesystem (`data/uploads/`)

### Key Features
- **Focus Sessions**: Freeflow timer with project association and session notes
- **Audio System**: Shuffled playlist with MP3 upload/management
- **Background Images**: Unsplash API integration + custom image upload
- **Session Persistence**: Survives page refresh, warns on navigation during active sessions

### Environment Configuration
- **Host**: devpigh.local (Raspberry Pi on local network)
- **Ports**: 8082 (backend/production), 3000 (frontend dev only)
- **Ports 8080 and 8081 are reserved** - do not use
- Development: Local JSON storage, local filesystem, devpigh.local URLs
- Production: Same stack, served from Docker container as daemon
- Environment files: `.env.development` and `.env.production` (gitignored)

### Deployment Infrastructure
- **Raspberry Pi**: Docker container with `restart: unless-stopped`
- **Data Persistence**: Docker named volume `focus-data` mounted to `/app/data`
- **Health Check**: `/api/health` endpoint monitored by Docker
- **Legacy GCP**: Cloud Run config retained in `cloudbuild.yaml`

## Data Storage

### JSON File Storage (in `data/` directory)
- `sessions.json` - Focus session history
- `projects.json` - User projects
- `quotes.json` - Inspirational quotes
- `favorites.json` - Favorite background images
- `uploads/tracks/` - MP3 audio files (production)
- `uploads/test/` - MP3 audio files (development)
- `uploads/my-images/` - Custom background images

### Session Schema
```javascript
{
  _id: String,
  date: String (ISO format),
  time: String (HH:MM format),
  duration: String (MM:SS or HH:MM:SS format),
  text: String (session notes),
  project: String (project ID, optional)
}
```

### Project Schema
```javascript
{
  _id: String,
  name: String,
  description: String,
  createdAt: String (ISO format)
}
```

## Audio System
- Tracks stored in `data/uploads/tracks/` (prod) or `data/uploads/test/` (dev)
- Playlist managed in localStorage as `focusPlaylist`
- Audio context provides shuffled playback with auto-advance
- Volume settings persisted in localStorage

## Session Flow
1. User clicks "Enter Flow State" -> shows MusicPlayer
2. User enters session notes -> clicks "Begin" -> starts timer + audio
3. Timer runs with session state auto-saved to localStorage
4. User clicks "Exit Flow State" -> saves session to database + localStorage
5. Session appears in history with project association

## Important Notes
- Session state persists across page refreshes during active sessions
- Audio files must be .mp3 format for upload
- Background images cached for 1 hour to avoid API rate limits
- Test server health with `/api/health` endpoint
- Server binds to 0.0.0.0 for network access from other devices
