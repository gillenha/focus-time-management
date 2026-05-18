# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Setup

### Install packages
```
npm install
```

### Environment file
Create `.env.development` (not `.env.local`) with:
```
REACT_APP_UNSPLASH_ACCESS_KEY=
REACT_APP_UNSPLASH_SECRET_KEY=
REACT_APP_GOOGLE_CLIENT_ID=
NOTION_API_KEY=
NOTION_DATABASE_ID=
OPENWEATHER_API_KEY=
MONGODB_URI=mongodb+srv://gillenha:<db_password>@focus-music-app.fpp8f.mongodb.net/focus-music-app-dev?retryWrites=true&w=majority
```
- `NODE_ENV` is set automatically by the npm scripts — do not add it manually
- MongoDB dev database: `focus-music-app-dev`
- All production secrets are stored in GCP; never needed locally

## Development Commands

- `npm run dev` — Start frontend (port 3000) + backend (port 8080) together (recommended)
- `npm run start:server:dev` — Backend only, with nodemon
- `npm test` — Jest in watch mode
- `npm test App.test.js` — Run a single test file
- `npm run build` — Production React bundle

### Deployment
- `npm run deploy` — Deploy to GCP via gcloud
- CI/CD: Cloud Build (`cloudbuild.yaml`) builds a multi-stage Docker image and deploys to Cloud Run
- `REACT_APP_*` variables are injected as Docker `--build-arg` in `cloudbuild.yaml` and baked into the JS bundle at build time — **they are not available as Cloud Run runtime env vars**. Any secret that should not be public must be read server-side and proxied through Express.

## Architecture

### Request / Auth Flow
All `/api/*` routes except `/api/health` and `/api/weather*` are protected by `server/middleware/auth.js`. This middleware verifies a Google ID token (sent as `Authorization: Bearer <token>`) and checks the email against `ALLOWED_EMAIL` — this is a single-user app. The frontend stores the token in `sessionStorage` and attaches it via `src/utils/api.js:authFetch`.

`AuthContext` (`src/context/AuthContext.js`) manages the Google Sign-In lifecycle: loads the GSI script, handles the credential callback, and schedules silent token refresh before expiry. If a focus session is active during expiry it retries rather than logging out.

### Frontend State (`src/App.js`)
`App.js` is the single source of truth for all cross-cutting state: active focus session, audio, background image, weather locations, and which page/modal is open. Page transitions use a paired `show*` / `is*Exiting` boolean pattern with a 300ms exit animation before unmounting.

### Backend (`server.js`)
Express server that:
- Serves the React static build in production (catch-all after API routes)
- Registers weather endpoints **before** auth middleware (public)
- Applies `authMiddleware` to all remaining `/api` routes
- Routes: `/api/sessions`, `/api/projects`, `/api/quotes`, `/api/files`, `/api/favorites`, `/api/notion`, `/api/weather`, `/api/weather/search`

File storage branches on `NODE_ENV`: local `tracks/` directory in dev, GCS bucket `react-app-assets` in production.

### Weather System
- `/api/weather/search?q=` — proxies OpenWeatherMap Geocoding API, returns `{ display, lat, lon }` per result
- `/api/weather?lat=&lon=&units=` — proxies current weather by coordinates
- Frontend stores up to 3 locations as a JSON array in `localStorage('weatherLocations')`, each `{ display, lat, lon }`
- `WeatherWidget` auto-refreshes every 30 minutes; click-to-refresh has a 5-second cooldown
- The `OPENWEATHER_API_KEY` is a **server-side runtime env var** — never a build arg

### Audio System
- Dev: tracks served as static files at `/dev-files/tracks/<filename>` — mounted outside `/api` so the `<audio>` element can fetch without an auth header
- Prod: GCS signed URLs via `/api/files`
- Playlist managed in `localStorage('focusPlaylist')`; shuffled playback with auto-advance via `AudioContext`

#### Audio Architecture (Target State)

The audio system has two distinct concerns that must be handled separately:

**1. Sound Effects (SFX)**
All UI sound effects (start, stop, pause, play, next track, begin session, end session) must use the Web Audio API exclusively. `HTMLAudioElement` introduces unacceptable latency for event-triggered sounds.

Target implementation lives in `src/utils/sfxManager.js` — a singleton module (not a React component) that:
- Creates a single shared `AudioContext` on first use (lazy init to satisfy browser autoplay policy)
- Pre-fetches and decodes all SFX files into `AudioBuffer` objects at session start via `fetch` + `decodeAudioData`
- Exposes a `play(sfxName)` function that creates a fresh `BufferSource`, connects it to `destination`, and calls `.start()` — no re-decoding, no new network requests
- Is imported and called directly in event handlers, **never** triggered via `useEffect` or as a side effect of state updates

SFX files are stored in `public/effects/` and loaded by name from a manifest constant in `sfxManager.js`.

**2. Music Playback**
Long-form track playback uses `HTMLAudioElement` (the `<audio>` element), which is appropriate for streaming media. The existing GCS signed URL / dev static file approach is correct. Improvement targets:
- Preload the next track's URL while the current track is playing (fetch signed URL speculatively via `/api/files`)
- Create a hidden `<audio>` element for the next track and set `preload="auto"` to begin buffering

#### Timer Architecture (Target State)

The session timer must not use `setInterval` as a tick counter. Interval drift accumulates over long sessions and compounds with audio event timing.

Target implementation:
- Store `sessionStartTimestamp` (epoch ms from `Date.now()`) in state and in `localStorage` on session start
- Run a single `setInterval` at 250ms resolution **only for UI re-renders** — it does nothing except trigger a re-render
- Compute elapsed time on every render as `Date.now() - sessionStartTimestamp` — this is always wall-clock accurate regardless of tab visibility, sleep, or drift
- `localStorage` writes for timer state should be **throttled to once every 5 seconds** minimum, not on every tick

#### Known Latency Issues (Active Work)

1. **SFX lag** — sound effects currently triggered through React state / `useEffect`; target is direct `sfxManager.play()` calls in event handlers
2. **Timer drift** — interval-based tick accumulation over long sessions
3. **localStorage write frequency** — timer state written on every tick creates I/O pressure
4. **Audio object accumulation** — any `new Audio()` calls outside a stable ref will accumulate over session lifetime; audit all audio instantiation sites

### Session Flow
1. "Enter Flow State" → shows `MusicPlayer` for note input
2. "Begin" → starts freeflow timer + audio playback
3. Timer state is auto-saved to localStorage on every tick (survives refresh) — **target: throttle to 5s intervals**
4. "Exit Flow State" → POSTs session to `/api/sessions`, clears localStorage state

## Database Models

```javascript
Session: { date, time, duration, text, project: ObjectId? }
Project: { name, description, createdAt }
Quote:   { text, author }
Favorite: { imageUrl, photographer, ... }
ImagePreference: { name, enabled }
```

## Rules for Claude

### Rule 1 — Think Before Coding.
No silent assumptions. State what you're assuming. Surface tradeoffs. Ask before guessing. Push back when a simpler approach exists.
### Rule 2 — Simplicity First.
Minimum code that solves the problem. No speculative features. No abstractions for single-use code. If a senior engineer would call it overcomplicated — simplify.
### Rule 3 — Surgical Changes.
Touch only what you must. Don't "improve" adjacent code, comments, or formatting. Don't refactor what isn't broken. Match existing style.
### Rule 4 — Goal-Driven Execution.
Define success criteria. Loop until verified. Don't tell Claude what steps to follow, tell it what success looks like and let it iterate.
### Rule 5 — Use the model only for judgment calls
Use Claude for: classification, drafting, summarization, extraction from unstructured text.
Do NOT use Claude for: routing, retries, status-code handling, deterministic transforms.
If a status code already answers the question, plain code answers the question.
### Rule 6 — Token budgets are not advisory
Per-task budget: 4,000 tokens.
Per-session budget: 30,000 tokens.
If a task is approaching budget, summarize and start fresh. Do not push through.
Surfacing the breach > silently overrunning.
### Rule 7 — Surface conflicts, don't average them
If two existing patterns in the codebase contradict, don't blend them.
Pick one (the more recent / more tested), explain why, and flag the other for cleanup.
"Average" code that satisfies both rules is the worst code.
### Rule 8 — Read before you write
Before adding code in a file, read the file's exports, the immediate caller, and any obvious shared utilities.
If you don't understand why existing code is structured the way it is, ask before adding to it.
"Looks orthogonal to me" is the most dangerous phrase in this codebase.
### Rule 9 — Tests verify intent, not just behavior
Every test must encode WHY the behavior matters, not just WHAT it does.
A test like `expect(getUserName()).toBe('John')` is worthless if the function takes a hardcoded ID.
If you can't write a test that would fail when business logic changes, the function is wrong.
### Rule 10 — Checkpoint after every significant step
After completing each step in a multi-step task: summarize what was done, what's verified, what's left.
Don't continue from a state you can't describe back to me.
If you lose track, stop and restate.
### Rule 11 — Match the codebase's conventions, even if you disagree
If the codebase uses snake_case and you'd prefer camelCase: snake_case.
If the codebase uses class-based components and you'd prefer hooks: class-based.
Disagreement is a separate conversation. Inside the codebase, conformance > taste.
If you genuinely think the convention is harmful, surface it. Don't fork it silently.
### Rule 12 — Fail loud
If you can't be sure something worked, say so explicitly.
"Migration completed" is wrong if 30 records were skipped silently.
"Tests pass" is wrong if you skipped any.
"Feature works" is wrong if you didn't verify the edge case I asked about.
Default to surfacing uncertainty, not hiding it.
