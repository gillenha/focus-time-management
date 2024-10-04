import React from 'react';
import './SessionHistory.css';

const SessionHistory = ({ sessionHistory, onClearHistory, onClose, totalFocusedTime, isExiting }) => {
    const formatTotalTime = (minutes) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    return (
        <div className={`session-history-drawer ${isExiting ? 'exit' : ''}`}>
            <div className="session-history-content">
                <button className="close-button" onClick={onClose} aria-label="Close"></button>
                <h2>Session History</h2>
                <ul>
                    {sessionHistory.map((session, index) => (
                        <li key={index} className="session-log-item">
                            <span className="session-date" data-label="Date:">{session.date}</span>
                            <span className="session-time" data-label="Time:">{session.time}</span>
                            <span className="session-duration" data-label="Duration:">{session.duration}</span>
                            <span className="session-text" data-label="Log:">{session.text}</span>
                        </li>
                    ))}
                </ul>
                <div className="total-focus-time">
                    <span>Total Focus Time: {formatTotalTime(totalFocusedTime)}</span>
                </div>
                <button onClick={onClearHistory}>Clear History</button>
            </div>
        </div>
    );
};

export default SessionHistory;