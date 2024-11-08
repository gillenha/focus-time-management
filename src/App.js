import React, { useState, useEffect } from 'react';
import './styles/tailwind.css';
import './App.css';
import './index.css';
import './components/HandleFreeFlow.css';
import './components/HandleTimer.css';
import './components/MusicPlayer.css';
import HandleTimer from './components/HandleTimer';
import MusicPlayer from './components/MusicPlayer';
import VolumeBar from './components/VolumeBar';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import SessionHistoryPage from './pages/SessionHistoryPage';
import Menu from './components/Menu';

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
  const [backgroundImage, setBackgroundImage] = useState('');
  const [photographer, setPhotographer] = useState({ name: '', username: '', link: '' });
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Get the Unsplash API key based on environment
  const UNSPLASH_ACCESS_KEY = process.env.REACT_APP_UNSPLASH_ACCESS_KEY;

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

  useEffect(() => {
    const fetchBackgroundImage = async () => {
      console.log('Starting background image fetch process...');
      console.log('Environment:', process.env.NODE_ENV);
      console.log('Unsplash API Key exists:', !!UNSPLASH_ACCESS_KEY);

      const lastFetchTime = localStorage.getItem('lastImageFetch');
      const savedImage = localStorage.getItem('backgroundImage');
      const savedPhotographer = localStorage.getItem('photographer');
      const THIRTY_MINUTES = 30 * 60 * 1000;

      if (lastFetchTime && savedImage && savedPhotographer) {
        const timeSinceLastFetch = Date.now() - parseInt(lastFetchTime);
        if (timeSinceLastFetch < THIRTY_MINUTES) {
          console.log('Using recently cached image (less than 30m old)');
          setBackgroundImage(savedImage);
          setPhotographer(JSON.parse(savedPhotographer));
          return;
        }
        console.log('Cached image is older than 30m, fetching new image');
      }

      try {
        if (!UNSPLASH_ACCESS_KEY) {
          throw new Error('No Unsplash API key found');
        }

        console.log('Fetching new image from Unsplash...');
        const response = await fetch(
          'https://api.unsplash.com/photos/random?query=nature&orientation=landscape',
          {
            headers: {
              'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`
            }
          }
        );

        if (!response.ok) {
          throw new Error(`Unsplash API error: ${response.status}`);
        }

        const data = await response.json();
        
        // Save the new image and photographer info
        setBackgroundImage(data.urls.full);
        setPhotographer({
          name: data.user.name,
          username: data.user.username,
          link: data.user.links.html
        });

        // Cache the results
        localStorage.setItem('backgroundImage', data.urls.regular);
        localStorage.setItem('photographer', JSON.stringify({
          name: data.user.name,
          username: data.user.username,
          link: data.user.links.html
        }));
        localStorage.setItem('lastImageFetch', Date.now().toString());

      } catch (error) {
        console.error('Error fetching background image:', error);
        
        // If we have cached data, use it as fallback
        if (savedImage && savedPhotographer) {
          console.log('Using cached image as fallback');
          setBackgroundImage(savedImage);
          setPhotographer(JSON.parse(savedPhotographer));
        } else {
          // Ultimate fallback to local image
          console.log('Using local fallback image');
          setBackgroundImage('/images/test.jpg');
          setPhotographer({ name: '', username: '', link: '' });
        }
      }
    };

    fetchBackgroundImage();
  }, []); // Empty dependency array means this runs once on mount

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
      }); // This should match the animation duration in SessionHistory.css
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

  useEffect(() => {
    console.log('App mounted');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Public URL:', process.env.PUBLIC_URL);
  }, []);

  return (
    <div className="grid-container">
      <div 
        className="background" 
        style={{ backgroundImage: `url(${backgroundImage})` }}
      ></div>
      {photographer.name && (
        <div className="photo-attribution">
          <p>
            Photo by{' '}
            <a 
              href={photographer.link} 
              target="_blank" 
              rel="noopener noreferrer"
            >
              {photographer.name}
            </a>
            {' '}on{' '}
            <a 
              href="https://unsplash.com" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              Unsplash
            </a>
          </p>
        </div>
      )}
      <div className="app">
        <div className="tw-fixed tw-top-0 tw-left-0 tw-z-50">
          <button 
            className="tw-p-4 tw-cursor-pointer tw-transition-all tw-duration-200 tw-ease-in-out tw-bg-transparent tw-border-0"
            onClick={() => setIsMenuOpen(true)}
          >
            <div className="tw-space-y-2">
              <span className="tw-block tw-h-0.5 tw-w-5 tw-bg-white"></span>
              <span className="tw-block tw-h-0.5 tw-w-8 tw-bg-white"></span>
              <span className="tw-block tw-h-0.5 tw-w-8 tw-bg-white"></span>
            </div>
          </button>
        </div>
        <Menu 
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          onShowHistory={toggleSessionHistory}
        />
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