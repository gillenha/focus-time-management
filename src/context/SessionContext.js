import React, { createContext, useContext, useState } from 'react';

const SessionContext = createContext(null);

export const SessionProvider = ({ children }) => {
  const [sessionState, setSessionState] = useState({
    isActive: false,
    startTime: null,
    focusText: '',
    playbackState: {
      isPlaying: false,
      currentTrack: null,
      playlist: null
    }
  });

  // Reset all session-related state
  const resetSession = () => {
    console.log('Resetting session state...');
    setSessionState({
      isActive: false,
      startTime: null,
      focusText: '',
      playbackState: {
        isPlaying: false,
        currentTrack: null,
        playlist: null
      }
    });
  };

  // Start new session
  const startSession = (focusText) => {
    console.log('Starting new session with focus:', focusText);
    setSessionState(prev => ({
      ...prev,
      isActive: true,
      startTime: new Date(),
      focusText
    }));
  };

  // Update playback state
  const updatePlayback = (playbackUpdate) => {
    console.log('Updating playback state:', playbackUpdate);
    setSessionState(prev => ({
      ...prev,
      playbackState: {
        ...prev.playbackState,
        ...playbackUpdate
      }
    }));
  };

  return (
    <SessionContext.Provider value={{
      sessionState,
      startSession,
      resetSession,
      updatePlayback
    }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => useContext(SessionContext); 