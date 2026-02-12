const express = require('express');
const router = express.Router();
const { readData, writeData, generateId, findById, findIndexById } = require('../utils/jsonStorage');

const SESSIONS_FILE = 'sessions.json';
const PROJECTS_FILE = 'projects.json';

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

// Helper function to populate project info
function populateProject(session) {
    if (session.project) {
        const projects = readData(PROJECTS_FILE);
        const project = findById(projects, session.project);
        return {
            ...session,
            project: project ? { _id: project._id, name: project.name } : null
        };
    }
    return session;
}

// Get all sessions with project information
router.get('/', async (req, res) => {
    try {
        const sessions = readData(SESSIONS_FILE);
        // Populate projects and sort by date (newest first)
        const populatedSessions = sessions
            .map(populateProject)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
        res.json(populatedSessions);
    } catch (err) {
        console.error('Error fetching sessions:', err);
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
});

// Create new session
router.post('/', async (req, res) => {
    try {
        const { date, time, duration, text, project } = req.body;
        const sessions = readData(SESSIONS_FILE);

        const newSession = {
            _id: generateId(),
            date: date || new Date().toISOString(),
            time,
            duration,
            text: text || '',
            project: project || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        sessions.push(newSession);
        writeData(SESSIONS_FILE, sessions);

        // Return populated session
        const populatedSession = populateProject(newSession);
        res.status(201).json(populatedSession);
    } catch (err) {
        console.error('Error creating session:', err);
        res.status(500).json({ error: 'Failed to create session' });
    }
});

// Update session
router.put('/:id', async (req, res) => {
    try {
        const { text, project, date, time, duration } = req.body;
        const sessions = readData(SESSIONS_FILE);
        const index = findIndexById(sessions, req.params.id);

        if (index === -1) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // Validate date if provided
        if (date !== undefined) {
            const parsed = new Date(date);
            if (isNaN(parsed.getTime())) {
                return res.status(400).json({ error: 'Invalid date format' });
            }
        }

        // Validate time if provided (HH:MM format)
        if (time !== undefined && !/^\d{1,2}:\d{2}$/.test(time)) {
            return res.status(400).json({ error: 'Invalid time format. Use HH:MM' });
        }

        // Validate duration if provided (MM:SS or H:MM:SS format)
        if (duration !== undefined) {
            const durationParts = duration.split(':').map(Number);
            if (durationParts.some(isNaN) || durationParts.length < 2 || durationParts.length > 3) {
                return res.status(400).json({ error: 'Invalid duration format. Use MM:SS or HH:MM:SS' });
            }
            if (durationParts.every(p => p === 0)) {
                return res.status(400).json({ error: 'Duration cannot be zero' });
            }
        }

        sessions[index] = {
            ...sessions[index],
            text: text !== undefined ? text : sessions[index].text,
            project: project !== undefined ? project : sessions[index].project,
            date: date !== undefined ? date : sessions[index].date,
            time: time !== undefined ? time : sessions[index].time,
            duration: duration !== undefined ? duration : sessions[index].duration,
            updatedAt: new Date().toISOString()
        };

        writeData(SESSIONS_FILE, sessions);

        // Return populated session
        const populatedSession = populateProject(sessions[index]);
        res.json(populatedSession);
    } catch (err) {
        console.error('Error updating session:', err);
        res.status(500).json({ error: 'Failed to update session' });
    }
});

// Delete session
router.delete('/:id', async (req, res) => {
    try {
        const sessions = readData(SESSIONS_FILE);
        const index = findIndexById(sessions, req.params.id);

        if (index === -1) {
            return res.status(404).json({ error: 'Session not found' });
        }

        sessions.splice(index, 1);
        writeData(SESSIONS_FILE, sessions);

        res.json({ message: 'Session deleted successfully' });
    } catch (err) {
        console.error('Error deleting session:', err);
        res.status(500).json({ error: 'Failed to delete session' });
    }
});

// Clear all sessions
router.delete('/clear', async (req, res) => {
    try {
        writeData(SESSIONS_FILE, []);
        res.status(200).json({ message: 'All sessions cleared successfully' });
    } catch (err) {
        console.error('Error clearing sessions:', err);
        res.status(500).json({ error: 'Failed to clear sessions' });
    }
});

// Restore sessions (for import functionality)
router.post('/restore', async (req, res) => {
    try {
        const newSessions = req.body;
        const sessions = readData(SESSIONS_FILE);

        // Add _id to sessions that don't have one
        const sessionsToAdd = newSessions.map(session => ({
            ...session,
            _id: session._id || generateId(),
            createdAt: session.createdAt || new Date().toISOString(),
            updatedAt: session.updatedAt || new Date().toISOString()
        }));

        sessions.push(...sessionsToAdd);
        writeData(SESSIONS_FILE, sessions);

        res.status(200).json({ count: sessionsToAdd.length, message: 'Sessions restored successfully' });
    } catch (err) {
        console.error('Error restoring sessions:', err);
        res.status(500).json({ error: 'Failed to restore sessions' });
    }
});

module.exports = router;
