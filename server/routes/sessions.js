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

// Get all sessions
router.get('/', async (req, res) => {
    try {
        const sessions = await Session.find().sort({ date: -1 });
        res.json(sessions);
    } catch (err) {
        console.error('Error fetching sessions:', err);
        res.status(500).json({ error: 'Failed to fetch sessions' });
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

// Update a session
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const session = await Session.findById(id);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // Update only the text field
        session.text = updates.text;
        await session.save();

        res.json(session);
    } catch (err) {
        console.error('Error updating session:', err);
        res.status(500).json({ error: 'Failed to update session' });
    }
});

// Delete a session
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const session = await Session.findById(id);
        
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        await Session.findByIdAndDelete(id);
        res.json({ message: 'Session deleted successfully' });
    } catch (err) {
        console.error('Error deleting session:', err);
        res.status(500).json({ error: 'Failed to delete session' });
    }
});

// Freeflow route
router.put('/freeflow', (req, res) => {
    const { time } = req.body;

    if (!time) {
        return res.status(400).json({ error: 'Time is required' });
    }

    res.status(200).json({ message: 'Time received successfully', time });
});

// Log session route
router.post('/log', async (req, res) => {
    const sessionDetails = req.body;
    
    console.log('Received session details:', sessionDetails);
    
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

    sessionDetails.text = sessionDetails.text || '';
    sessionDetails.duration = formatDuration(sessionDetails.duration);

    try {
        const session = new Session(sessionDetails);
        await session.save();

        console.log('Session logged:', session);
        res.status(200).json({ message: 'Session details logged successfully', session });
    } catch (err) {
        console.error('Error logging session:', err);
        res.status(500).json({ error: 'Failed to log session details' });
    }
});

// Restore sessions from backup
router.post('/restore', async (req, res) => {
    try {
        const sessions = req.body;
        
        if (!Array.isArray(sessions)) {
            return res.status(400).json({ error: 'Request body must be an array of sessions' });
        }

        // Remove MongoDB-specific fields that might cause issues
        const cleanedSessions = sessions.map(session => ({
            date: session.date,
            time: session.time,
            duration: session.duration,
            text: session.text || ''
        }));

        // Insert all sessions
        const result = await Session.insertMany(cleanedSessions);
        
        res.status(200).json({ 
            message: 'Sessions restored successfully', 
            count: result.length 
        });
    } catch (err) {
        console.error('Error restoring sessions:', err);
        res.status(500).json({ error: 'Failed to restore sessions' });
    }
});

module.exports = router; 