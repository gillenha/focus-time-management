import React from 'react';
import './SessionHistoryPage.css';
import SessionHistory from '../components/SessionHistory';

function SessionHistoryPage({ sessionHistory, onClearHistory, onClose, totalFocusedTime, isExiting }) {
  return (
    <div className="session-history-page">
      <SessionHistory
        sessionHistory={sessionHistory}
        onClearHistory={onClearHistory}
        onClose={onClose}
        totalFocusedTime={totalFocusedTime}
        isExiting={isExiting}
      />
    </div>
  );
}

export default SessionHistoryPage;
