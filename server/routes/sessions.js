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

module.exports = router; 