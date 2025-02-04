import React from 'react';
import './SessionHistoryPage.css';
import SessionHistory from '../components/SessionHistory';

function SessionHistoryPage({ onClose, isExiting }) {
  return (
    <div className="session-history-page">
      <SessionHistory
        onClose={onClose}
        isExiting={isExiting}
      />
    </div>
  );
}

export default SessionHistoryPage;
