import React, { useState, useEffect } from 'react';
import './App.css';
import './components/HandleFreeFlow.css';
import './components/HandleTimer.css';
import './components/MusicPlayer.css';
import HandleTimer from './components/HandleTimer';
import MusicPlayer from './components/MusicPlayer';
import VolumeBar from './components/VolumeBar';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import SessionHistoryPage from './pages/SessionHistoryPage';

function App() {
  const [isFreeflow, setIsFreeflow] = useState(false);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [showMusicPlayer, setShowMusicPlayer] = useState(false);
  const [time, setTime] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [currentSessionText, setCurrentSessionText] = useState('');
  const [volume, setVolume] = useState(0.5);
  const [showSessionHistory, setShowSessionHistory] = useState(false);
  const [totalFocusedTime, setTotalFocusedTime] = useState(0);
  const [isSessionHistoryExiting, setIsSessionHistoryExiting] = useState(false);

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

  const handleVolumeChange = (event) => {
    setVolume(event.target.value);
  };

  const toggleSessionHistory = () => {
    if (showSessionHistory) {
      setIsSessionHistoryExiting(true);
      setTimeout(() => {
        setShowSessionHistory(false);
        setIsSessionHistoryExiting(false);
      }, 500); // This should match the animation duration in SessionHistory.css
    } else {
      setShowSessionHistory(true);
    }
  };

  const fetchTotalFocusTime = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/total-focus-time');
      const data = await response.json();
      setTotalFocusedTime(data.totalFocusTime);
    } catch (error) {
      console.error('Error fetching total focus time:', error);
    }
  };

  return (
    <div className="grid-container">
      <div className="background"></div>
      <div className="app">
        <div className="top-bar">
          <button className="history-button" onClick={toggleSessionHistory}>
            {showSessionHistory ? "Hide History" : "Show History"}
          </button>
        </div>
        {showMusicPlayer && (
          <MusicPlayer
            isFreeflow={isFreeflow}
            onBeginClick={handleBeginClick}
            stopAudio={setTimerActive}
            setTimerActive={setTimerActive}
            volume={volume}
          />
        )}
        <HandleTimer time={time} slideUp={showMusicPlayer} sessionEnded={sessionEnded} />
        <div className="bottom-bar">
          <button className="freeflow-button" onClick={handleFreeFlowClick}>
            {isFreeflow ? "End Freeflow" : "Begin Freeflow"}
          </button>
        </div>
      </div>
      <VolumeBar volume={volume} onVolumeChange={handleVolumeChange} />
      {(showSessionHistory || isSessionHistoryExiting) && (
        <SessionHistoryPage
          sessionHistory={sessionHistory}
          onClearHistory={handleClearHistory}
          onClose={toggleSessionHistory}
          totalFocusedTime={totalFocusedTime}
          isExiting={isSessionHistoryExiting}
        />
      )}
      <nav className="bottom-navbar">
      </nav>
    </div>
  );
}

export default App;