import React, { useState } from 'react';
import SessionHistory from '../components/SessionHistory';
import './SessionHistoryPage.css';

function SessionHistoryPage({ sessionHistory, handleClearHistory, onClose }) {
  const [exitAnimation, setExitAnimation] = useState(false);

  const handleClose = () => {
    setExitAnimation(true);
    setTimeout(onClose, 500); // Call onClose after animation
  };

  return (
    <div className={`session-history-page ${exitAnimation ? 'exit' : ''}`}>
      <button onClick={handleClose} className="close-icon">×</button>
      <SessionHistory 
        sessionHistory={sessionHistory} 
        onClearHistory={handleClearHistory} 
      />
    </div>
  );
}

export default SessionHistoryPage;
