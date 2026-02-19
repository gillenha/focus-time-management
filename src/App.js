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
import TrackListPage from './pages/TrackListPage';
import QuoteList from './pages/QuoteList';
import Projects from './pages/Projects';

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
  const [showChangeBackgroundImage, setShowChangeBackgroundImage] = useState(false);
  const [isChangeBackgroundImageExiting, setIsChangeBackgroundImageExiting] = useState(false);
  const [showTrackList, setShowTrackList] = useState(false);
  const [isTrackListExiting, setIsTrackListExiting] = useState(false);
  const [playlistTracks, setPlaylistTracks] = useState(() => {
    const saved = localStorage.getItem('focusPlaylist');
    const parsed = saved ? JSON.parse(saved) : [];
    return parsed.length > 0 ? parsed : [/* default track */];
  });
  const [sessionInputValue, setSessionInputValue] = useState('');
  const [sessionStarted, setSessionStarted] = useState(false);
  const [showQuoteList, setShowQuoteList] = useState(false);
  const [isQuoteListExiting, setIsQuoteListExiting] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [isProjectsExiting, setIsProjectsExiting] = useState(false);

  // Add effect to load tracks from server if none in localStorage
  useEffect(() => {
    const loadTracksFromServer = async () => {
      if (playlistTracks.length === 0) {
        try {
          console.log('Loading tracks from server...');
          const response = await fetch(`${process.env.REACT_APP_API_URL}/api/files/list-tracks`);
          const data = await response.json();
          
          if (data.items && data.items.length > 0) {
            console.log('Tracks loaded from server:', data.items);
            const formattedTracks = data.items.map(item => ({
              id: `playlist-${item.name.replace(/[^a-zA-Z0-9]/g, '')}`,
              title: item.name.replace('.mp3', '').replace(/^(test\/|tracks\/)/, ''),
              fileName: item.name
            }));
            
            setPlaylistTracks(formattedTracks);
            localStorage.setItem('focusPlaylist', JSON.stringify(formattedTracks));
          } else {
            console.error('No tracks found on server');
          }
        } catch (error) {
          console.error('Error loading tracks from server:', error);
        }
      }
    };

    loadTracksFromServer();
  }, [playlistTracks.length]);

  // Add ref to track session state without causing re-renders
  const sessionRef = React.useRef({
    timerActive: false,
    isFreeflow: false,
    time: 0,
    sessionStarted: false,
    sessionEnded: false
  });

  // Update ref when relevant state changes
  useEffect(() => {
    sessionRef.current = {
      timerActive,
      isFreeflow,
      time,
      sessionStarted,
      sessionEnded
    };
  }, [timerActive, isFreeflow, time, sessionStarted, sessionEnded]);

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

  // Utility function to validate if a URL is a valid image
  const isValidImageUrl = (url) => {
    if (!url || typeof url !== 'string') return false;

    // Check if URL has valid image extensions
    const imageExtensions = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i;
    const hasImageExtension = imageExtensions.test(url);

    // Check if URL starts with http/https
    const isValidUrl = /^https?:\/\/.+/i.test(url);

    // For URLs without extensions but from known image hosts (like Unsplash)
    const knownImageHosts = [
      'images.unsplash.com',
      'unsplash.com',
      'storage.googleapis.com',
      'images.pexels.com',
      'pixabay.com'
    ];
    const isFromImageHost = knownImageHosts.some(host => url.includes(host));

    return isValidUrl && (hasImageExtension || isFromImageHost);
  };

  // Utility function to test if image URL actually loads
  const testImageLoad = (url) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;

      // Timeout after 5 seconds
      setTimeout(() => resolve(false), 5000);
    });
  };

  const fetchBackgroundImage = async (theme, forceUpdate = false) => {
    try {
      console.log('Fetching fresh background image for theme:', theme);

      if (theme === 'my-images') {
        // Fetch from our GCS bucket
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/files/list-images`);
        if (!response.ok) throw new Error('Failed to fetch images');
        
        const data = await response.json();
        if (!data.items || data.items.length === 0) {
          throw new Error('No images found in my-images folder');
        }

        // Pick a random image from the list
        const randomImage = data.items[Math.floor(Math.random() * data.items.length)];
        
        setBackgroundImage(randomImage.url);
        setPhotographer({
          name: 'My Images',
          username: '',
          link: '',
          photoLink: '',
          description: randomImage.name.split('/').pop()
        });

        // No caching - always fetch fresh images

      } else if (theme === 'favorites') {
        // Handle favorites from MongoDB with validation
        const customImage = localStorage.getItem('customBackgroundImage');
        let imageUrl = null;
        let imageTitle = 'From your favorites collection';
        let isValidImage = false;

        if (customImage) {
          console.log('Testing custom favorite image:', customImage);
          isValidImage = isValidImageUrl(customImage) && await testImageLoad(customImage);
          if (isValidImage) {
            imageUrl = customImage;
          } else {
            console.warn('Custom favorite image failed validation or load test');
          }
        }

        // If no custom image or custom image failed, try getting from API
        if (!isValidImage) {
          console.log('Fetching favorites from API...');
          const response = await fetch(`${process.env.REACT_APP_API_URL}/api/favorites`);
          if (response.ok) {
            const favorites = await response.json();
            if (favorites.length > 0) {
              console.log(`Found ${favorites.length} favorites, selecting randomly...`);

              // Shuffle the favorites array to randomize selection
              const shuffledFavorites = [...favorites].sort(() => Math.random() - 0.5);

              // Try each favorite in random order until we find a working one
              for (const favorite of shuffledFavorites) {
                console.log('Testing favorite image:', favorite.title, favorite.imageUrl);
                const isValid = isValidImageUrl(favorite.imageUrl) && await testImageLoad(favorite.imageUrl);
                if (isValid) {
                  imageUrl = favorite.imageUrl;
                  imageTitle = favorite.title;
                  isValidImage = true;
                  console.log('Selected valid favorite:', favorite.title);
                  break;
                }
                console.warn('Favorite image failed validation:', favorite.title);
              }
            }
          }
        }

        if (isValidImage && imageUrl) {
          console.log('Using valid favorite image:', imageUrl);
          setBackgroundImage(imageUrl);
          setPhotographer({
            name: 'Favorites',
            username: '',
            link: '',
            photoLink: imageUrl,
            description: imageTitle
          });
          // No caching - always fetch fresh images
        } else {
          // All favorites failed - use fallback
          console.error('All favorite images failed validation - using fallback');
          const fallbackUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgdmlld0JveD0iMCAwIDgwMCA2MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjQwMCIgeT0iMjgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNkI3Mjg0IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiPkZhdm9yaXRlIEltYWdlIE5vdCBGb3VuZDwvdGV4dD4KPHR5ZXh0IHg9IjQwMCIgeT0iMzIwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOUI5QkEwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiPkxpbmsgaGFzIG5vIGltYWdlIG9yIGZhaWxlZCB0byBsb2FkPC90ZXh0Pgo8L3N2Zz4K';
          setBackgroundImage(fallbackUrl);
          setPhotographer({
            name: 'Error',
            username: '',
            link: '',
            photoLink: '',
            description: 'Favorite image link has no image or failed to load'
          });
          // No caching - always fetch fresh images
        }

      } else {
        // Existing Unsplash API call
        const response = await fetch(
          `https://api.unsplash.com/photos/random?query=${theme}&orientation=landscape&content_filter=high&order_by=relevant&featured=true`,
          {
            headers: {
              Authorization: `Client-ID ${process.env.REACT_APP_UNSPLASH_ACCESS_KEY}`
            }
          }
        );
        
        if (!response.ok) throw new Error('Failed to fetch image');
        
        const data = await response.json();
        
        setBackgroundImage(data.urls.full);
        
        setPhotographer({
          name: data.user.name || '',
          username: data.user.username || '',
          link: data.user.links.html || '',
          photoLink: data.links.html || '',
          description: data.description || data.alt_description || ''
        });
        
        // No caching - always fetch fresh images
      }
      
    } catch (error) {
      console.error('Error fetching image:', error);
      // Use fallback image instead of cache
      setBackgroundImage('/images/test.jpg');
      setPhotographer({
        name: 'Error',
        username: '',
        link: '',
        photoLink: '',
        description: 'Failed to load background image'
      });
    }
  };

  useEffect(() => {
    // Clear any existing image cache on app load
    localStorage.removeItem('backgroundImage');
    localStorage.removeItem('photographer');
    localStorage.removeItem('lastImageFetch');
    localStorage.removeItem('customBackgroundImage');

    // Always fetch fresh images (no caching)
    fetchBackgroundImage(unsplashTheme, true);
  }, [unsplashTheme]);

  const handleFreeFlowClick = async () => {
    if (isFreeflow) {
      console.log("Freeflow ended");

      // Clean up audio if cleanup function exists
      if (window.audioCleanup) {
        window.audioCleanup();
        window.audioCleanup = null;
      }

      const now = new Date();
      const currentSession = JSON.parse(localStorage.getItem('currentSession'));
      const newSession = {
        date: now.toISOString(),
        time: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }).toLowerCase(),
        duration: formatDuration(time),
        text: currentSessionText,
        project: currentSession?.projectId || null
      };

      try {
        // Save to MongoDB
        console.log('Attempting to save session to MongoDB:', newSession);
        
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/sessions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newSession),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Server response:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData
          });
          throw new Error(`Failed to save session to MongoDB: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log('Session saved to MongoDB:', result);

        // Update local state with the populated session from the response
        const updatedHistory = [...sessionHistory, result];
        setSessionHistory(updatedHistory);
        localStorage.setItem('sessionHistory', JSON.stringify(updatedHistory));
      } catch (error) {
        console.error('Error saving session to MongoDB:', {
          message: error.message,
          stack: error.stack
        });
        // Still update local storage even if MongoDB save fails
        const updatedHistory = [...sessionHistory, newSession];
        setSessionHistory(updatedHistory);
        localStorage.setItem('sessionHistory', JSON.stringify(updatedHistory));
      }
      
      // First set freeflow to false to trigger fade out animation
      setIsFreeflow(false);
      setTimerActive(false);
      setSessionEnded(true);

      // Wait for fade out animation before unmounting music player
      setTimeout(() => {
        setShowMusicPlayer(false);
        // Only reset session state, not the timer
        localStorage.removeItem('currentSession');
        setSessionStarted(false);
        setSessionInputValue('');
        setCurrentSessionText('');
        // Note: we're not resetting the time here anymore
      }, 1000);
    } else {
      console.log("Freeflow started");
      // Clear any existing session state AND reset timer when starting new session
      localStorage.removeItem('currentSession');
      setSessionStarted(false);
      setSessionInputValue('');
      setCurrentSessionText('');
      setTime(0); // Only reset timer when starting new session
      setTimerActive(false);
      setSessionEnded(false);
      
      // Start new session
      setShowMusicPlayer(true);
      setIsFreeflow(true);
    }
  };

  const handleClearHistory = () => {
    setSessionHistory([]);
    localStorage.removeItem('sessionHistory');
  };

  const handleBeginClick = (inputText, projectId) => {
    setTimerActive(true);
    setCurrentSessionText(inputText);
    setSessionInputValue(inputText);
    setSessionStarted(true);
    
    // Play bell sound
    const bell = new Audio(`${process.env.REACT_APP_API_URL}/effects/bell.mp3`);
    bell.volume = volume;
    bell.play().catch(error => {
      console.error('Error playing bell sound:', error);
    });
    
    // Save current session state with project
    const sessionData = {
      time,
      timerActive: true,
      text: inputText,
      projectId,
      isFreeflow,
      showMusicPlayer,
      sessionInputValue: inputText,
      sessionStarted: true
    };
    localStorage.setItem('currentSession', JSON.stringify(sessionData));
  };

  const formatDuration = (duration) => {
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/total-focus-time`);
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
    setShowProfile(prev => !prev);
  };

  const truncateText = (text, limit = 30) => {
    if (!text) return '';
    return text.length > limit ? `${text.slice(0, limit)}...` : text;
  };

  useEffect(() => {
    console.log('Bottom bar rendered:', document.querySelector('.bottom-bar'));
    console.log('Freeflow button rendered:', document.querySelector('.freeflow-button'));
  }, []);

  const toggleTrackList = () => {
    if (showTrackList) {
      setIsTrackListExiting(true);
      setTimeout(() => {
        setShowTrackList(false);
        setIsTrackListExiting(false);
      }, 300); // Match animation duration
    } else {
      setShowTrackList(true);
    }
  };

  useEffect(() => {
    localStorage.setItem('focusPlaylist', JSON.stringify(playlistTracks));
  }, [playlistTracks]);

  // Session persistence effect (existing)
  useEffect(() => {
    // Load saved session on mount
    const savedSession = JSON.parse(localStorage.getItem('currentSession'));
    if (savedSession) {
      setTime(savedSession.time);
      setTimerActive(savedSession.timerActive);
      setCurrentSessionText(savedSession.text);
      setIsFreeflow(savedSession.isFreeflow);
      setShowMusicPlayer(savedSession.showMusicPlayer);
      setSessionInputValue(savedSession.sessionInputValue);
      setSessionStarted(savedSession.sessionStarted);
      
      // If session was active, automatically restart it
      if (savedSession.sessionStarted && savedSession.timerActive) {
        handleBeginClick(savedSession.text, savedSession.projectId);
      }
    }
  }, []);

  // Separate beforeunload handler effect
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      const session = sessionRef.current;
      if (session.timerActive || (session.isFreeflow && session.time > 0) || (session.sessionStarted && !session.sessionEnded)) {
        e.preventDefault();
        e.returnValue = 'You have an active focus session. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []); // No dependencies needed as we use ref

  // Auto-save current session
  useEffect(() => {
    if (timerActive || time > 0) {
      const currentSession = JSON.parse(localStorage.getItem('currentSession'));
      const sessionData = {
        time,
        timerActive,
        text: currentSessionText,
        projectId: currentSession?.projectId, // Preserve project ID
        isFreeflow,
        showMusicPlayer,
        sessionInputValue,
        sessionStarted
      };
      localStorage.setItem('currentSession', JSON.stringify(sessionData));
    } else {
      localStorage.removeItem('currentSession');
    }
  }, [time, timerActive, currentSessionText, isFreeflow, showMusicPlayer, sessionInputValue, sessionStarted]);

  // Add this new helper function near your other formatting functions
  const formatTitleTime = (time) => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = time % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  };

  // Add this new effect to update the document title
  useEffect(() => {
    if (timerActive || time > 0) {
      document.title = `${formatTitleTime(time)} - Flow State`;
    } else {
      document.title = 'Flow State';
    }
  }, [time, timerActive]);

  // Add this function to handle track removal
  const handleRemoveTrack = (trackId) => {
    setPlaylistTracks(currentTracks => {
      // Only allow removal if more than one track remains
      if (currentTracks.length <= 1) {
        // You could show a toast notification here if you want
        return currentTracks;
      }
      return currentTracks.filter(track => track.id !== trackId);
    });
  };

  const toggleQuoteList = () => {
    if (showQuoteList) {
      setIsQuoteListExiting(true);
      setTimeout(() => {
        setShowQuoteList(false);
        setIsQuoteListExiting(false);
      }, 300); // Match animation duration
    } else {
      setShowQuoteList(true);
    }
  };

  const toggleProjects = () => {
    if (showProjects) {
      setIsProjectsExiting(true);
      setTimeout(() => {
        setShowProjects(false);
        setIsProjectsExiting(false);
      }, 300); // Match animation duration
    } else {
      setShowProjects(true);
    }
  };

  return (
    <div className="grid-container">
      <div 
        className="background" 
        style={{ backgroundImage: `url(${backgroundImage})` }}
      ></div>
      {photographer.name && photographer.name !== 'My Images' && (
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
          onTrackList={() => {
            setIsMenuOpen(false);
            toggleTrackList();
          }}
          onQuoteList={() => {
            setIsMenuOpen(false);
            toggleQuoteList();
          }}
          onProjects={() => {
            setIsMenuOpen(false);
            toggleProjects();
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
            playlistTracks={playlistTracks}
            sessionInputValue={sessionInputValue}
            setSessionInputValue={setSessionInputValue}
            sessionStarted={sessionStarted}
            setSessionStarted={setSessionStarted}
          />
        )}
        <HandleTimer time={time} slideUp={showMusicPlayer} sessionEnded={sessionEnded} />
        <nav className="bottom-navbar">
          <button className="freeflow-button" onClick={handleFreeFlowClick}>
            {isFreeflow ? "Exit Flow State" : "Enter Flow State"}
          </button>
        </nav>
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
      <Profile
        isOpen={showProfile}
        onClose={toggleProfile}
      />
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
      {(showTrackList || isTrackListExiting) && (
        <TrackListPage
          onClose={toggleTrackList}
          isExiting={isTrackListExiting}
          playlistTracks={playlistTracks}
          setPlaylistTracks={setPlaylistTracks}
          onRemoveTrack={handleRemoveTrack}
        />
      )}
      {(showQuoteList || isQuoteListExiting) && (
        <QuoteList
          onClose={toggleQuoteList}
          isExiting={isQuoteListExiting}
        />
      )}
      {(showProjects || isProjectsExiting) && (
        <Projects
          onClose={toggleProjects}
          isExiting={isProjectsExiting}
        />
      )}
    </div>
  );
}

export default App;