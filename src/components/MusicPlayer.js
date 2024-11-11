import React, { useState, useEffect, useRef, useCallback } from 'react';
import './MusicPlayer.css';
import { useSpotify } from '../context/SpotifyContext';
import { useSession } from '../context/SessionContext';

// Add debounce utility at the top of the file
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

function MusicPlayer({ isFreeflow, onBeginClick, stopAudio, setTimerActive, volume }) {
  const [fadeOut, setFadeOut] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);
  const [slideIn, setSlideIn] = useState(false);
  const [userPlaylists, setUserPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [player, setPlayer] = useState(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [pendingTrack, setPendingTrack] = useState(null);
  const [sdkInstance, setSdkInstance] = useState(null);
  const {
    isConnectedToSpotify,
    setIsConnectedToSpotify,
    handleDisconnectSpotify,
    refreshAccessToken
  } = useSpotify();
  const { sessionState, startSession, resetSession, updatePlayback } = useSession();

  // Simplify state management
  const [sessionStarted, setSessionStarted] = useState(false);

  const handleClick = async () => {
    console.log('Begin button clicked');
    console.log('Input value:', inputValue);
    setFadeOut(true);
    
    // Play bell chime
    const audio = new Audio('/effects/bell.mp3');
    await audio.play();

    // Start visual transition
    setTimeout(() => {
      setSlideIn(true);
    }, 1000);

    // Delay playlist start
    setTimeout(() => {
      handleBeginSession(inputValue);
    }, 3000);
  };

  const handleInputChange = (event) => {
    setInputValue(event.target.value);
  };

  const handlePlaylistSelect = async (event) => {
    const playlistId = event.target.value;
    if (!playlistId) return;
    setSelectedPlaylist(playlistId);
  };

  const handlePlayPauseClick = async () => {
    if (!player) return;
    try {
      if (isPlaying) {
        await player.pause();
      } else {
        await player.resume();
      }
    } catch (error) {
      console.error('Playback control error:', error);
    }
  };

  const handleNextTrackClick = async () => {
    if (!player) return;
    try {
      await player.nextTrack();
    } catch (error) {
      console.error('Next track error:', error);
    }
  };

  const fetchUserPlaylists = useCallback(async () => {
    if (!isConnectedToSpotify) return;
    
    try {
      let accessToken = localStorage.getItem('spotifyAccessToken');
      let response = await fetch('https://api.spotify.com/v1/me/playlists', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (response.status === 401) {
        const refreshToken = localStorage.getItem('spotifyRefreshToken');
        accessToken = await refreshAccessToken(refreshToken);
        if (!accessToken) return;

        response = await fetch('https://api.spotify.com/v1/me/playlists', {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
      }

      if (!response.ok) throw new Error('Failed to fetch playlists');

      const data = await response.json();
      setUserPlaylists(data.items || []);
    } catch (error) {
      console.error('Error fetching playlists:', error);
      setUserPlaylists([]);
    }
  }, [isConnectedToSpotify, refreshAccessToken]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
      window.history.replaceState({}, document.title, "/");
    }

    if (localStorage.getItem('spotifyAccessToken')) {
      setIsConnectedToSpotify(true);
      fetchUserPlaylists();
      return;
    }

    if (code) {
      const getAccessToken = async () => {
        try {
          const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': 'Basic ' + btoa(`${process.env.REACT_APP_SPOTIFY_CLIENT_ID}:${process.env.REACT_APP_SPOTIFY_CLIENT_SECRET}`)
            },
            body: new URLSearchParams({
              grant_type: 'authorization_code',
              code: code,
              redirect_uri: process.env.REACT_APP_REDIRECT_URI
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Token exchange failed');
          }

          const data = await response.json();
          localStorage.setItem('spotifyAccessToken', data.access_token);
          localStorage.setItem('spotifyRefreshToken', data.refresh_token);
          setIsConnectedToSpotify(true);
          await fetchUserPlaylists();
        } catch (error) {
          console.error('Auth error:', error);
          handleDisconnectSpotify();
        }
      };
      getAccessToken();
    }
  }, [fetchUserPlaylists]);

  const handleConnectToSpotify = () => {
    const scopes = [
      'streaming',
      'user-read-email',
      'user-read-private',
      'user-read-playback-state',
      'user-modify-playback-state',
      'playlist-read-private',
      'app-remote-control'
    ].join(' ');

    const authUrl = `https://accounts.spotify.com/authorize?client_id=${process.env.REACT_APP_SPOTIFY_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(process.env.REACT_APP_REDIRECT_URI)}&scope=${encodeURIComponent(scopes)}`;

    console.log('Authorizing with scopes:', scopes); // Debug log
    window.location.href = authUrl;
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Add initialization tracking
  const [isInitializing, setIsInitializing] = useState(false);
  const initializationRef = useRef(false);

  // Update the SDK initialization effect
  useEffect(() => {
    if (!isConnectedToSpotify || initializationRef.current) return;
    
    const initializeSpotifySDK = async () => {
      if (isInitializing || window.Spotify) return;
      setIsInitializing(true);
      
      window.onSpotifyWebPlaybackSDKReady = () => {
        if (!window.Spotify) return;
        
        const spotifyPlayer = new window.Spotify.Player({
          name: 'Focus Timer Web Player',
          getOAuthToken: cb => cb(localStorage.getItem('spotifyAccessToken')),
          volume: volume
        });

        spotifyPlayer.addListener('ready', ({ device_id }) => {
          console.log('Player ready with device ID:', device_id);
          localStorage.setItem('spotifyDeviceId', device_id);
          setPlayer(spotifyPlayer);
          setSdkReady(true);
          setSdkInstance(spotifyPlayer);
        });

        spotifyPlayer.addListener('player_state_changed', state => {
          if (state) setIsPlaying(!state.paused);
        });

        spotifyPlayer.connect();
      };

      const script = document.createElement('script');
      script.id = 'spotify-sdk';
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.async = true;
      document.body.appendChild(script);
    };

    initializeSpotifySDK();

    return () => {
      if (sdkInstance) {
        sdkInstance.disconnect();
      }
      const script = document.getElementById('spotify-sdk');
      if (script) {
        document.body.removeChild(script);
      }
      initializationRef.current = false;
      setIsInitializing(false);
    };
  }, [isConnectedToSpotify]);

  // Simplified session start
  const handleBeginSession = async (inputText) => {
    try {
      if (selectedPlaylist) {
        await startPlayback(selectedPlaylist);
        updatePlayback({
          isPlaying: true,
          currentTrack: selectedPlaylist
        });
      }
      setSessionStarted(true);
      startSession(inputText);
      onBeginClick(inputText);
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  };

  // Combine session-related effects
  useEffect(() => {
    const handleSessionState = async () => {
      if (!isFreeflow) {
        setSessionStarted(false);
        setIsPlaying(false);
        if (player) {
          await player.pause();
        }
      }
    };

    handleSessionState();
  }, [isFreeflow, player]);

  // Add component unmount cleanup
  useEffect(() => {
    return () => {
      if (player) {
        player.pause();
      }
      initializationRef.current = false;
    };
  }, []);

  const startPlayback = async (playlistId) => {
    try {
      const deviceId = localStorage.getItem('spotifyDeviceId');
      const accessToken = localStorage.getItem('spotifyAccessToken');

      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context_uri: `spotify:playlist:${playlistId}`,
          position_ms: 0
        })
      });
      setIsPlaying(true);
    } catch (error) {
      console.error('Error starting playlist:', error);
    }
  };

  // Simplify the volume control effect
  useEffect(() => {
    const setPlayerVolume = async () => {
      if (!player || !sdkReady) {
        console.log('Player not ready for volume change');
        return;
      }

      try {
        await player.setVolume(volume);
        console.log('Volume set:', volume);
      } catch (error) {
        console.error('Volume control error:', error);
        
        // Simple recovery attempt
        if (error.message.includes('disconnected')) {
          try {
            await player.connect();
            await player.setVolume(volume);
          } catch (recoveryError) {
            console.error('Volume recovery failed:', recoveryError);
          }
        }
      }
    };

    setPlayerVolume();
  }, [volume, player, sdkReady]);

  // Add control rendering check
  const canRenderControls = player && sdkReady && isConnectedToSpotify && sessionStarted;

  // Reset session started state when session ends
  useEffect(() => {
    if (!isFreeflow) {
      setSessionStarted(false);
      // ... rest of cleanup code ...
    }
  }, [isFreeflow]);

  // Remove duplicate session start
  const handleBeginButton = (e) => {
    e.preventDefault();
    handleClick();
    // Remove this line since handleClick now handles session start
    // handleBeginSession(inputValue);
  };

  return (
    <div className={`
      tw-relative 
      tw-flex 
      tw-flex-col 
      tw-items-center 
      tw-justify-center 
      tw-w-full 
      tw-h-full
      ${isFreeflow ? 'tw-animate-fadeIn' : 'tw-animate-fadeOut'}
    `}>
      {/* Container for music player box */}
      <div className="
        tw-bg-black/30 
        tw-backdrop-blur-md 
        tw-rounded-xl 
        tw-p-8 
        tw-flex 
        tw-flex-col 
        tw-items-center 
        tw-gap-6 
        tw-w-[90%]
        tw-max-w-[384px]
        tw-h-[400px]
        tw-min-h-[400px]
        sm:tw-w-96
        tw-overflow-hidden
      ">
        {/* Focus text */}
        <p className={`
          tw-text-white
          tw-font-medium
          tw-text-2xl
          tw-absolute           // Position absolutely in container
          tw-left-1/2          // Center horizontally
          tw-transform
          tw-transition-all
          tw-duration-500
          tw-ease-out
          tw--translate-x-1/2  // Center horizontally (offset)
          ${slideIn ?
            'tw-top-1/3 tw-scale-150 tw-opacity-100'  // Slide to 25% from top
            :
            'tw-top-0 tw-scale-100 tw-opacity-70'     // Start at top
          }`}>
          Time to focus
        </p>

        <div className={`
          tw-flex 
          tw-flex-col 
          tw-items-center 
          tw-justify-center 
          tw-gap-2
          tw-absolute 
          tw-top-[40%]         // Position below the "Time to focus" text which slides to top-1/3
          tw-left-1/2 
          tw--translate-x-1/2 
          tw--translate-y-1/2  // Center vertically relative to its position
          tw-w-full
          tw-transition-all
          ${fadeOut ? 'tw-animate-fadeOut' : 'tw-opacity-100'}
        `}>
          {/* Connect to Spotify Button - no need for absolute positioning */}
          {isConnectedToSpotify ? (
            <div className="tw-flex tw-flex-row tw-gap-2 tw-items-center">
              <select
                onChange={handlePlaylistSelect}
                className="tw-mt-16 tw-px-4 tw-py-2 tw-bg-green-500 tw-text-white tw-rounded-full tw-font-medium hover:tw-bg-green-600 tw-transition-colors tw-border-0 tw-cursor-pointer tw-w-64"
              >
                <option value="">Select a Playlist</option>
                {userPlaylists && userPlaylists.map(playlist => (
                  <option key={playlist.id} value={playlist.id}>
                    {playlist.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <button
              onClick={handleConnectToSpotify}
              className="tw-mt-16 tw-px-4 tw-py-2 tw-bg-green-500 tw-text-white tw-rounded-full tw-font-medium hover:tw-bg-green-600 tw-transition-colors tw-border-0 tw-cursor-pointer"
            >
              Connect to Spotify
            </button>
          )}

          {/* Textarea - no need for absolute positioning */}
          <textarea
            value={inputValue}
            onChange={handleInputChange}
            placeholder="What do you want to focus on?"
            className={`
              tw-w-[83%]\
              tw-mt-0
              tw-mb-0
              tw-h-32
              tw-bg-white
              tw-rounded-lg
              tw-p-4
              tw-font-sans
              tw-text-lg
              tw-text-gray-800
              tw-resize-none
              tw-outline-none
            `}
          />

          {/* Begin Button - no need for absolute positioning */}
          <button
            onClick={handleBeginButton}
            className={`
              tw-py-3
              tw-px-6
              tw-bg-gray-700
              tw-rounded-lg
              tw-shadow-[0_4px_8px_rgba(0,0,0,0.25)]
              tw-font-sans
              tw-text-lg
              tw-text-white
              tw-cursor-pointer
              tw-border-0
              tw-transition-all
              hover:tw-bg-gray-600
              active:tw-transform
              active:tw-scale-95
            `}
          >
            Begin Session
          </button>
        </div>

        {/* Control Bar - Only shows after session starts */}
        {canRenderControls && (
          <div className={`
            tw-mt-16 
            tw-absolute 
            tw-bottom-8 
            tw-left-0 
            tw-right-0 
            tw-flex 
            tw-justify-center 
            tw-gap-4 
            tw-h-[10%]
            tw-animate-fadeIn
            tw-transition-opacity
            tw-duration-500
            tw-ease-in-out
          `}>
            <button
              onClick={handlePlayPauseClick}
              className="tw-w-12 
              tw-h-12
              tw-flex 
              tw-items-center
              tw-justify-center 
              tw-bg-gray-600 
              tw-rounded-full 
              tw-shadow-[0_4px_8px_rgba(0,0,0,0.25)] 
              tw-border-0 
              tw-outline-none 
              focus:tw-outline-none 
              hover:tw-cursor-pointer 
              tw-transition-all
              "
            >
              {isPlaying ? (
                // Pause icon
                <svg
                  stroke="currentColor"
                  fill="currentColor"
                  strokeWidth="0"
                  viewBox="0 0 448 512"
                  className="tw-text-slate-200 tw-scale-105"
                  height="1em"
                  width="1em"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M144 479H48c-26.5 0-48-21.5-48-48V79c0-26.5 21.5-48 48-48h96c26.5 0 48 21.5 48 48v352c0 26.5-21.5 48-48 48zm304-48V79c0-26.5-21.5-48-48-48h-96c-26.5 0-48 21.5-48 48v352c0 26.5 21.5 48 48 48h96c26.5 0 48-21.5 48-48z" />
                </svg>
              ) : (
                // Play icon
                <svg
                  stroke="currentColor"
                  fill="currentColor"
                  strokeWidth="0"
                  viewBox="0 0 448 512"
                  className="tw-text-slate-200 tw-scale-105"
                  height="1em"
                  width="1em"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M424.4 214.7L72.4 6.6C43.8-10.3 0 6.1 0 47.9V464c0 37.5 40.7 60.1 72.4 41.3l352-208c31.4-18.5 31.5-64.1 0-82.6z" />
                </svg>
              )}
            </button>
            <button
              onClick={handleNextTrackClick}
              className="tw-w-12 tw-h-12 tw-flex tw-flex-row tw-items-center tw-gap-2 tw-justify-center tw-bg-gray-600 tw-rounded-full hover:tw-cursor-pointer tw-transition-all tw-border-0 tw-outline-none focus:tw-outline-none tw-shadow-[0_4px_8px_rgba(0,0,0,0.25)]"
            >
              {/* Next Track icon */}
              <svg
                stroke="currentColor"
                fill="currentColor"
                strokeWidth="0"
                viewBox="0 0 448 512"
                className="tw-text-slate-200 tw-scale-105"
                height="1em"
                width="1em"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M384 44v424c0 6.6-5.4 12-12 12h-48c-6.6 0-12-5.4-12-12V291.6l-195.5 181C95.9 489.7 64 475.4 64 448V64c0-27.4 31.9-41.7 52.5-24.6L312 219.3V44c0-6.6 5.4-12 12-12h48c6.6 0 12 5.4 12 12z" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default MusicPlayer;
