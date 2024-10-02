import React, { useState, useEffect } from 'react';
import './App.css';
import './components/HandleFreeFlow.css';
import './components/HandleTimer.css';
import './components/MusicPlayer.css';
import HandleTimer from './components/HandleTimer';
import MusicPlayer from './components/MusicPlayer';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  const [isFreeflow, setIsFreeflow] = useState(false);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [showMusicPlayer, setShowMusicPlayer] = useState(false);
  const [time, setTime] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [currentSessionText, setCurrentSessionText] = useState('');
  const [volume, setVolume] = useState(1); // Volume state

  useEffect(() => {
    const savedHistory = JSON.parse(localStorage.getItem('sessionHistory')) || [];
    setSessionHistory(savedHistory);
  }, []);

  useEffect(() => {
    let timer;
    if (timerActive) {
      timer = setInterval(() => {
        setTime(prevTime => prevTime + 1);
      }, 1000);
    } else if (!timerActive && time !== 0) {
      clearInterval(timer);
    }
    return () => clearInterval(timer);
  }, [timerActive, time]);

  const handleFreeFlowClick = () => {
    if (isFreeflow) {
      console.log("Freeflow ended");

      const now = new Date();
      const newSession = {
        date: now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
        time: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }).toLowerCase(),
        duration: formatDuration(time),
        text: currentSessionText
      };
      const updatedHistory = [...sessionHistory, newSession];
      setSessionHistory(updatedHistory);
      localStorage.setItem('sessionHistory', JSON.stringify(updatedHistory));

      setIsFreeflow(false);
      setTimeout(() => setShowMusicPlayer(false), 1000);
      setTimerActive(false);
      setSessionEnded(true);
    } else {
      console.log("Freeflow started");
      setShowMusicPlayer(true);
      setIsFreeflow(true);
      setSessionEnded(false);
      setTime(0);
      setCurrentSessionText('');
    }
  };

  const handleClearHistory = () => {
    setSessionHistory([]);
    localStorage.removeItem('sessionHistory');
  };

  const handleBeginClick = (inputText) => {
    setTimerActive(true);
    setCurrentSessionText(inputText);
  };

  const formatDuration = (duration) => {
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleVolumeChange = (newVolume) => {
    setVolume(newVolume); // Update volume state
  };

  return (
    <div className="grid-container">
      <div className="background"></div>
      <div className="app">
        <div className="navbar">
          <button className="freeflow-button" onClick={handleFreeFlowClick}>
            {isFreeflow ? "End Freeflow" : "Begin Freeflow"}
          </button>
        </div>
        {showMusicPlayer && (
          <MusicPlayer 
            isFreeflow={isFreeflow} 
            onBeginClick={handleBeginClick} 
            stopAudio={setTimerActive} 
            setTimerActive={setTimerActive} 
            volume={volume} // Pass volume state to MusicPlayer
          />        
        )}
        <HandleTimer time={time} slideUp={showMusicPlayer} sessionEnded={sessionEnded} />
        <div className="session-history-container">
          <button onClick={handleClearHistory}>
            Clear History
          </button>
          <div className="session-history">
            <h2>Session History</h2>
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
          </div>
        </div>
        <ToastContainer />
      </div>
      {/* Volume slider in the top-right corner */}
      <div className="volume-slider-container">
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(e) => handleVolumeChange(e.target.value)}
          className="volume-slider"
        />
      </div>
    </div>
  );
}

export default App;
