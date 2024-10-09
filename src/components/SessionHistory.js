import React, { useState } from 'react';
import './SessionHistory.css';

const API_BASE_URL = 'http://localhost:5001'; // Add this line

const SessionHistory = ({ sessionHistory, onClearHistory, onClose, isExiting }) => {
    const [editingIndex, setEditingIndex] = useState(null);
    const [editText, setEditText] = useState('');

    const formatDuration = (duration) => {
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
    };

    const sendToServer = async (session) => {
        try {
            console.log('Sending session to server:', session); // Log before sending

            const response = await fetch(`${API_BASE_URL}/api/log-session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(session),
            });
            
            if (!response.ok) {
                throw new Error('Failed to log session');
            }
            
            const result = await response.json();
            console.log('Server response:', result);

        } catch (error) {
            console.error('Error logging session:', error);
        }
    };

    const startEditing = (index, text) => {
        setEditingIndex(index);
        setEditText(text);
    };

    const saveEdit = (index) => {
        // Here you would typically update the sessionHistory state in the parent component
        console.log(`Saving edit for session ${index}: ${editText}`);
        setEditingIndex(null);
    };

    return (
        <div className={`session-history-drawer ${isExiting ? 'exit' : ''}`}>
            <div className="session-history-content">
                <span className="close-button" onClick={onClose} aria-label="Close"></span>
                <h2>Session History</h2>
                <ul style={{ display: 'flex', flexDirection: 'column' }}>
                    {sessionHistory.slice().reverse().map((session, index) => {
                        const reverseIndex = sessionHistory.length - 1 - index;
                        return (
                            <li key={`session-${reverseIndex}`} className="session-log-item">
                                <span className="session-date" data-label="Date:">{session.date}</span>
                                <span className="session-time" data-label="Time:">{session.time}</span>
                                <span className="session-duration" data-label="Duration:">{formatDuration(session.duration)}</span>
                                {editingIndex === reverseIndex ? (
                                    <input
                                        type="text"
                                        value={editText}
                                        onChange={(e) => setEditText(e.target.value)}
                                        onBlur={() => saveEdit(reverseIndex)}
                                        autoFocus
                                    />
                                ) : (
                                    <span className="session-text" data-label="Log:">{session.text}</span>
                                )}
                                <button onClick={() => sendToServer(session)}>Log to Server</button>
                                <button onClick={() => startEditing(reverseIndex, session.text)}>
                                    {editingIndex === reverseIndex ? 'Save' : 'Edit'}
                                </button>
                            </li>
                        );
                    })}
                </ul>
                <button onClick={onClearHistory}>Clear History</button>
                <button onClick={() => console.log("Data sent to Notion")}>Send to Notion</button>
            </div>
        </div>
    );
};

export default SessionHistory;