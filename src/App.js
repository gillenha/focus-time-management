import React, { useState, useEffect, useCallback } from 'react';
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
import Profile from './pages/Profile';
import ChangeBackground from './pages/ChangeBackground';

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
  const [photo, setPhoto] = useState({});
  const [photographer, setPhotographer] = useState({
    name: '',
    username: '',
    link: '',
    photoLink: ''
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [unsplashTheme, setUnsplashTheme] = useState('nature');
  const [showProfile, setShowProfile] = useState(false);
  const [isProfileExiting, setIsProfileExiting] = useState(false);
  const [showChangeBackgroundImage, setShowChangeBackgroundImage] = useState(false);
  const [isChangeBackgroundImageExiting, setIsChangeBackgroundImageExiting] = useState(false);

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

  const fetchBackgroundImage = async (theme, forceUpdate = false) => {
    try {
      const lastFetch = localStorage.getItem('lastImageFetch');
      const timeSinceLastFetch = Date.now() - parseInt(lastFetch || '0');
      
      // If not forcing update and less than 1 hour since last fetch, use cached image
      if (!forceUpdate && lastFetch && timeSinceLastFetch < 3600000) {
        const cachedImage = localStorage.getItem('backgroundImage');
        const cachedPhotographer = localStorage.getItem('photographer');
        if (cachedImage && cachedPhotographer) {
          setBackgroundImage(cachedImage);
          setPhotographer(JSON.parse(cachedPhotographer));
          return;
        }
      }

      const response = await fetch(
        `https://api.unsplash.com/photos/random?query=${theme}&orientation=landscape&content_filter=high&order_by=relevant`,
        {
          headers: {
            Authorization: `Client-ID ${process.env.REACT_APP_UNSPLASH_ACCESS_KEY}`
          }
        }
      );
      
      if (!response.ok) throw new Error('Failed to fetch image');
      
      const data = await response.json();
      
      setBackgroundImage(data.urls.regular);
      
      setPhotographer({
        name: data.user.name || '',
        username: data.user.username || '',
        link: data.user.links.html || '',
        photoLink: data.links.html || '',
        description: data.description || data.alt_description || ''
      });
      
      localStorage.setItem('backgroundImage', data.urls.regular);
      localStorage.setItem('photographer', JSON.stringify({
        name: data.user.name || '',
        username: data.user.username || '',
        link: data.user.links.html || '',
        photoLink: data.links.html || '',
        description: data.description || data.alt_description || ''
      }));
      localStorage.setItem('lastImageFetch', Date.now().toString());
      
    } catch (error) {
      console.error('Error fetching image:', error);
      // Use cached values
      const cachedImage = localStorage.getItem('backgroundImage');
      const cachedPhotographer = localStorage.getItem('photographer');
      
      if (cachedImage && cachedPhotographer) {
        setBackgroundImage(cachedImage);
        setPhotographer(JSON.parse(cachedPhotographer));
      } else {
        setBackgroundImage('/images/test.jpg');
        setPhotographer({ 
          name: '', 
          username: '', 
          link: '',
          photoLink: '' 
        });
      }
    }
  };

  useEffect(() => {
    // This will respect the 30-minute cache
    fetchBackgroundImage(unsplashTheme, false);
  }, [unsplashTheme]);

  const handleFreeFlowClick = () => {
    if (isFreeflow) {
      console.log("Freeflow ended");

      // Clean up audio if cleanup function exists
      if (window.audioCleanup) {
        window.audioCleanup();
        window.audioCleanup = null;
      }

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

  const handleVolumeChange = useCallback((newVolume) => {
    setVolume(newVolume);
    // Store in localStorage for persistence
    localStorage.setItem('userVolume', newVolume.toString());
  }, []);

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

  const toggleChangeBackgroundImage = () => {
    if (showChangeBackgroundImage) {
      setIsChangeBackgroundImageExiting(true);
    } else {
      setShowChangeBackgroundImage(true);
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

  window.fetchBackgroundImage = fetchBackgroundImage;

  const toggleProfile = () => {
    if (showProfile) {
      setIsProfileExiting(true);
      setTimeout(() => {
        setShowProfile(false);
        setIsProfileExiting(false);
      }, 300); // Match your animation duration
    } else {
      setShowProfile(true);
    }
  };

  const truncateText = (text, limit = 30) => {
    if (!text) return '';
    return text.length > limit ? `${text.slice(0, limit)}...` : text;
  };

  return (
    <div className="grid-container">
      <div 
        className="background" 
        style={{ backgroundImage: `url(${backgroundImage})` }}
      ></div>
      {photographer.name && (
        <div className="photo-attribution">
          <a 
            href={photographer.photoLink} 
            target="_blank" 
            rel="noopener noreferrer"
          >
            <p className="tw-text-right">
              {truncateText(
                photographer.description || 
                `${unsplashTheme.charAt(0).toUpperCase() + unsplashTheme.slice(1)} photo`
              )}
            </p>
          </a>
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
          onProfileClick={() => {
            setIsMenuOpen(false);
            toggleProfile();
          }}
          onShowHistory={() => {
            setIsMenuOpen(false);
            toggleSessionHistory();
          }}
          onBackgroundImage={() => {
            setIsMenuOpen(false);
            toggleChangeBackgroundImage();
          }}
        />
        {showMusicPlayer && (
          <MusicPlayer
            isFreeflow={isFreeflow}
            onBeginClick={handleBeginClick}
            stopAudio={setTimerActive}
            setTimerActive={setTimerActive}
            volume={volume}
            onVolumeChange={handleVolumeChange}
          />
        )}
        <HandleTimer time={time} slideUp={showMusicPlayer} sessionEnded={sessionEnded} />
        <div className="bottom-bar">
          <button className="freeflow-button" onClick={handleFreeFlowClick}>
            {isFreeflow ? "End Freeflow" : "Begin Freeflow"}
          </button>
        </div>
      </div>
      <VolumeBar 
        volume={volume} 
        onVolumeChange={handleVolumeChange} 
      />
      {(showSessionHistory || isSessionHistoryExiting) && (
        <SessionHistoryPage
          sessionHistory={sessionHistory}
          onClearHistory={handleClearHistory}
          onClose={toggleSessionHistory}
          totalFocusedTime={totalFocusedTime}
          isExiting={isSessionHistoryExiting}
        />
      )}
      {(showProfile || isProfileExiting) && (
        <Profile
          onClose={toggleProfile}
          theme={unsplashTheme}
          setTheme={setUnsplashTheme}
          isExiting={isProfileExiting}
        />
      )}
      {showChangeBackgroundImage && (
        <ChangeBackground
          onClose={() => {
            setIsChangeBackgroundImageExiting(true);
            setTimeout(() => {
              setShowChangeBackgroundImage(false);
              setIsChangeBackgroundImageExiting(false);
            }, 300);
          }}
          theme={unsplashTheme}
          setTheme={setUnsplashTheme}
          isExiting={isChangeBackgroundImageExiting}
          fetchBackgroundImage={fetchBackgroundImage}
        />
      )}
      <nav className="bottom-navbar">
      </nav>
    </div>
  );
}

export default App;