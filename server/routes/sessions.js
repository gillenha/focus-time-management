const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;

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

    const sessionsFilePath = path.join(process.cwd(), 'sessions.json');
    
    try {
        let sessions = [];
        try {
            const fileContent = await fs.readFile(sessionsFilePath, 'utf8');
            sessions = JSON.parse(fileContent);
        } catch (err) {
            if (err.code !== 'ENOENT') throw err;
        }

        sessions.push(sessionDetails);
        await fs.writeFile(sessionsFilePath, JSON.stringify(sessions, null, 2));

        console.log('Session logged:', sessionDetails);
        res.status(200).json({ message: 'Session details logged successfully', sessionDetails });
    } catch (err) {
        console.error('Error logging session:', err);
        res.status(500).json({ error: 'Failed to log session details' });
    }
});

module.exports = router; 