# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Development
- `npm run dev` - Start both frontend and backend in development mode (recommended)
  - Frontend runs on http://localhost:3000
  - Backend API runs on http://localhost:8080  
  - Automatically handles environment variable conflicts
- `npm start` - Start React development server only (port 3000)
- `npm run start:dev` - Start React with NODE_ENV=development
- `npm run start:server:dev` - Start Express server only in development with nodemon
- `node server.js` - Start production server (port 8080)

### Building
- `npm run build` - Build production React bundle
- `npm run dist` - Build Electron distribution

### Testing
- Uses Jest and React Testing Library (included with Create React App)
- Run tests with `npm test` (interactive watch mode)
- Single test file: `npm test App.test.js`
- Test file located at `src/App.test.js`

### Deployment
- `npm run deploy` - Deploy to Google Cloud Platform using gcloud
- Docker builds use multi-stage process (React build → Node.js server)

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
- **Server** (`server.js`) - Main server with file uploads, session logging, Notion integration
- **Database**: MongoDB with Mongoose (models: Session, Project, Quote)
- **Routes**: 
  - `/api/sessions` - Focus session CRUD
  - `/api/projects` - Project management
  - `/api/quotes` - Inspirational quotes
  - `/api/files` - MP3 file management
  - `/api/notion` - Notion database integration
- **File Storage**: Local filesystem (dev) or Google Cloud Storage (production)

### Key Features
- **Focus Sessions**: Freeflow timer with project association and session notes
- **Audio System**: Shuffled playlist with MP3 upload/management via GCS
- **Background Images**: Unsplash API integration + custom image upload
- **Session Persistence**: Survives page refresh, warns on navigation during active sessions
- **Notion Integration**: Optional session logging to Notion database

### Environment Configuration
- Development: Uses local MongoDB, filesystem storage, localhost URLs
- Production: MongoDB Atlas, Google Cloud Storage, Cloud Run deployment
- Environment files: `.env.development` and `.env.production` (not `.env.local`)

### Deployment Infrastructure
- **Google Cloud Platform**: Cloud Run, Container Registry, Cloud Storage
- **Build Process**: Cloud Build with `cloudbuild.yaml`
- **Container**: Multi-stage Docker build optimized for production

## Database Models

### Session Schema
```javascript
{
  date: String (ISO format),
  time: String (formatted time),
  duration: String (MM:SS format),
  text: String (session notes),
  project: ObjectId (optional reference)
}
```

### Project Schema
```javascript
{
  name: String,
  description: String,
  createdAt: Date
}
```

## Audio System
- Tracks stored in `mp3s/` directory (dev) or GCS bucket (prod)
- Playlist managed in localStorage as `focusPlaylist`
- Audio context provides shuffled playback with auto-advance
- Volume settings persisted in localStorage

## Session Flow
1. User clicks "Enter Flow State" → shows MusicPlayer
2. User enters session notes → clicks "Begin" → starts timer + audio
3. Timer runs with session state auto-saved to localStorage  
4. User clicks "Exit Flow State" → saves session to database + localStorage
5. Session appears in history with project association

## Important Notes
- Session state persists across page refreshes during active sessions
- Audio files must be .mp3 format for upload
- Notion integration requires NOTION_API_KEY and NOTION_DATABASE_ID
- Background images cached for 1 hour to avoid API rate limits
- Test server health with `/api/health` endpoint (if implemented)