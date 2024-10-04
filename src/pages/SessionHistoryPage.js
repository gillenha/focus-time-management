import React from 'react';
import './SessionHistoryPage.css';
import { Link } from 'react-router-dom';

function SessionHistoryPage({ sessionHistory, handleClearHistory }) {
  return (
    <div className="session-history-page">
      <h1>Session History</h1>
      <button onClick={handleClearHistory}>Clear History</button>
      <ul>
        {sessionHistory.map((session, index) => (
          <li key={index} className="session-log-item">
            <span className="session-date" data-label="Date: ">{session.date}</span>
            <span className="session-time" data-label="Time: ">{session.time}</span>
            <span className="session-duration" data-label="Duration: ">{session.duration}</span>
            <span className="session-text" data-label="Log: ">{session.text}</span>
          </li>
        ))}
      </ul>
      <Link to="/">Back to Home</Link>
    </div>
  );
}

export default SessionHistoryPage;
