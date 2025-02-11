const express = require('express');
const router = express.Router();
const Session = require('../models/Session');

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

// Get all sessions with project information
router.get('/', async (req, res) => {
    try {
        const sessions = await Session.find()
            .populate('project', 'name') // Only populate the project name
            .sort({ date: -1 });
        res.json(sessions);
    } catch (err) {
        console.error('Error fetching sessions:', err);
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
});

// Create new session
router.post('/', async (req, res) => {
    try {
        const { date, time, duration, text, project } = req.body;
        const session = new Session({
            date,
            time,
            duration,
            text,
            project // Include project ID if provided
        });
        const savedSession = await session.save();
        const populatedSession = await Session.findById(savedSession._id)
            .populate('project', 'name');
        res.status(201).json(populatedSession);
    } catch (err) {
        console.error('Error creating session:', err);
        res.status(500).json({ error: 'Failed to create session' });
    }
});

// Update session
router.put('/:id', async (req, res) => {
    try {
        const { text, project } = req.body;
        const updatedSession = await Session.findByIdAndUpdate(
            req.params.id,
            { text, project },
            { new: true }
        ).populate('project', 'name');
        res.json(updatedSession);
    } catch (err) {
        console.error('Error updating session:', err);
        res.status(500).json({ error: 'Failed to update session' });
    }
});

// Delete session
router.delete('/:id', async (req, res) => {
    try {
        await Session.findByIdAndDelete(req.params.id);
        res.json({ message: 'Session deleted successfully' });
    } catch (err) {
        console.error('Error deleting session:', err);
        res.status(500).json({ error: 'Failed to delete session' });
    }
});

// Clear all sessions
router.delete('/clear', async (req, res) => {
    try {
        await Session.deleteMany({});
        res.status(200).json({ message: 'All sessions cleared successfully' });
    } catch (err) {
        console.error('Error clearing sessions:', err);
        res.status(500).json({ error: 'Failed to clear sessions' });
    }
});

// Restore sessions (for import functionality)
router.post('/restore', async (req, res) => {
    try {
        const sessions = req.body;
        const result = await Session.insertMany(sessions);
        res.status(200).json({ count: result.length, message: 'Sessions restored successfully' });
    } catch (err) {
        console.error('Error restoring sessions:', err);
        res.status(500).json({ error: 'Failed to restore sessions' });
    }
});

module.exports = router; 