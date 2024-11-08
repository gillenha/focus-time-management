# Freeflow Focus App

## Core Features
- Freeflow focus session timer
- Audio accompaniment with volume control
- Session history tracking and management
- Text input for session notes/intentions
- Session duration tracking
- Local storage for session data
- Server-side session logging

## Goals & Objectives
- Provide a distraction-free environment for focused work
- Track and maintain history of focus sessions
- Offer ambient audio support for better concentration
- Enable users to log their thoughts and intentions
- Integrate logging with Notion Database (integration key saved in a .env file)
- Provide insights into total focus time
- Create a seamless, minimalist user experience

## Tech Stack & Packages
### Frontend
- React.js
- CSS3 for animations and styling
- react-toastify for notifications

### Backend
- Node.js
- Express.js
- Packages:
  - helmet (security)
  - cors
  - body-parser
  - fs (file system)
  - path

## Project Folder Structure
project/
├── src/
│ ├── components/
│ │ ├── HandleFreeFlow.css
│ │ ├── HandleFreeFlow.js

│ │ ├── HandleTimer.css
│ │ ├── MusicPlayer.css
│ │ ├── HandleTimer.js
│ │ ├── MusicPlayer.js
│ │ ├── VolumeBar.js
│ │ ├── SessionHistory.js
│ │ └── ControlBar.js
│ │ └── ControlBar.css
│ ├── pages/
│ │ └── SessionHistoryPage.js
│ ├── App.js
│ └── App.css
├── public/
│ ├── effects/
│ │ └── bell.mp3
│ ├── mp3s/
│ │ └── mongolian-throat-singing.mp3
└── server.js


## Database Design
Currently using file-based storage:
- Local Storage for client-side session history
- Server-side JSON file (`sessions.json`) for persistent storage
- Session Schema:
  ```json
  {
    "date": "MMM DD, YYYY",
    "time": "HH:MM am/pm",
    "duration": "MM:SS",
    "text": "Session notes"
  }
  ```

## Landing Page Components
1. Top Bar
   - History toggle button
2. Music Player
   - Text input for session intentions
   - Begin button
   - Audio controls (play/pause, next track)
3. Timer Display
4. Bottom Bar
   - Freeflow toggle button
5. Volume Control
6. Session History Drawer
   - Session logs
   - Edit functionality
   - Clear history option
   - Server logging option

## Color Palette

### Core Colors
- Background Overlay: `rgba(0, 0, 0, 0.5)` (Semi-transparent black)
- Primary Button: `#333333`
- Button Hover: `#555555`
- Text Color: `white`

### UI Elements
- Bottom Navbar: `rgba(200, 200, 200, 0.7)` (Light grey with 70% opacity)
- Session History Items: `rgba(255, 255, 255, 0.1)` (Lightly transparent white)
- Borders: `#333333`

### Effects
- Backdrop Filter: `blur(5px)` on overlays
- Box Shadow: `0 4px 8px rgba(0, 0, 0, 0.1)`

### Animations
- Fade In/Out transitions
- Slide animations
- Opacity transitions from 0 to 1

### Design Philosophy
The color scheme follows a minimalist, dark-themed approach with:
- Semi-transparent overlays for depth
- High contrast for readability
- Subtle shadows for elevation
- Smooth transitions between states
- Focus on content with minimal distractions

## Copywriting Guidelines
Text elements present in the app:
- "Time to focus" - Main focus message
- "Begin Freeflow" / "End Freeflow" - Action buttons
- "Show History" / "Hide History" - Toggle buttons
- "Enter text" - Input placeholder
- "Begin" - Session start button
- Form labels:
  - Date
  - Time
  - Duration
  - Log

