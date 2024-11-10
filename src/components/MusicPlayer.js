import React, { useState, useEffect, useRef } from 'react';
import './MusicPlayer.css';

const refreshAccessToken = async (refreshToken) => {
  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${process.env.REACT_APP_SPOTIFY_CLIENT_ID}:${process.env.REACT_APP_SPOTIFY_CLIENT_SECRET}`)
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    });

    if (!response.ok) throw new Error('Failed to refresh token');
    
    const data = await response.json();
    localStorage.setItem('spotifyAccessToken', data.access_token);
    return data.access_token;
  } catch (error) {
    console.error('Error refreshing token:', error);
    handleDisconnectSpotify();
    return null;
  }
};

function MusicPlayer({ isFreeflow, onBeginClick, stopAudio, setTimerActive, volume }) {
  const [fadeOut, setFadeOut] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);
  const [slideIn, setSlideIn] = useState(false);
  const [isConnectedToSpotify, setIsConnectedToSpotify] = useState(false);
  const [userPlaylists, setUserPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [player, setPlayer] = useState(null);
  const [playerVolume, setPlayerVolume] = useState(volume);
  const [sdkReady, setSdkReady] = useState(false);
  const [pendingTrack, setPendingTrack] = useState(null);

  const handleClick = async () => {
    console.log('Begin button clicked');
    console.log('Input value:', inputValue);
    setFadeOut(true);
    const audio = new Audio('/effects/bell.mp3');
    await audio.play();
    setTimeout(() => {
      setSlideIn(true);
      handleBeginSession(inputValue);
    }, 1000);
  };

  const handleInputChange = (event) => {
    setInputValue(event.target.value);
  };

  const handlePlaylistSelect = async (event) => {
    const playlistId = event.target.value;
    if (!playlistId) return;

    try {
      let accessToken = localStorage.getItem('spotifyAccessToken');
      let response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (response.status === 401) {
        const refreshToken = localStorage.getItem('spotifyRefreshToken');
        accessToken = await refreshAccessToken(refreshToken);
        if (!accessToken) return;

        response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
      }

      if (!response.ok) throw new Error('Failed to fetch playlist tracks');
      
      const data = await response.json();
      setSelectedPlaylist(data.items);
      if (data.items.length > 0) {
        setPendingTrack(data.items[0].track.uri);
      }
    } catch (error) {
      console.error('Error fetching playlist tracks:', error);
    }
  };

  const handlePlayPauseClick = async () => {
    if (!player) return;
    
    try {
      if (isPlaying) {
        await player.pause();
      } else {
        await player.resume();
      }
      setIsPlaying(!isPlaying);
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  };

  const handleNextTrackClick = async () => {
    if (!selectedPlaylist || currentTrackIndex >= selectedPlaylist.length - 1) return;
    
    const nextIndex = currentTrackIndex + 1;
    const nextTrack = selectedPlaylist[nextIndex].track;
    
    try {
      await startPlayback(nextTrack.uri);
      setCurrentTrackIndex(nextIndex);
    } catch (error) {
      console.error('Error playing next track:', error);
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    // Clear URL parameters immediately
    if (code) {
      window.history.replaceState({}, document.title, "/");
    }

    // Check if we already have valid tokens
    const existingToken = localStorage.getItem('spotifyAccessToken');
    if (existingToken) {
      setIsConnectedToSpotify(true);
      fetchUserPlaylists();
      return;
    }

    // Only proceed with token exchange if we have a new code
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
  }, []);

  const fetchUserPlaylists = async () => {
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
  };

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

  useEffect(() => {
    if (!isFreeflow && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setTimerActive(false);
    }
  }, [isFreeflow]);

  useEffect(() => {
    if (!isConnectedToSpotify) return;
    
    let spotifyPlayer = null;
    
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;

    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {
      try {
        spotifyPlayer = new window.Spotify.Player({
          name: 'Focus Timer Web Player',
          getOAuthToken: cb => { 
            const token = localStorage.getItem('spotifyAccessToken');
            if (token) cb(token);
          },
          volume: volume,
          enableMediaSession: true,
          robustnessLevel: 'premium'
        });

        spotifyPlayer.addListener('ready', ({ device_id }) => {
          console.log('Player ready');
          localStorage.setItem('spotifyDeviceId', device_id);
          setPlayer(spotifyPlayer);
          setSdkReady(true);
        });

        spotifyPlayer.connect();
      } catch (error) {
        console.error('SDK initialization error:', error);
        if (isConnectedToSpotify) {
          handleDisconnectSpotify();
        }
      }
    };

    return () => {
      if (spotifyPlayer) {
        spotifyPlayer.disconnect();
      }
      document.body.removeChild(script);
    };
  }, [isConnectedToSpotify]);

  // Add disconnect function
  const handleDisconnectSpotify = () => {
    localStorage.removeItem('spotifyAccessToken');
    localStorage.removeItem('spotifyRefreshToken');
    localStorage.removeItem('spotifyDeviceId');
    setIsConnectedToSpotify(false);
    setUserPlaylists([]);
  };

  const startPlayback = async (trackUri) => {
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
          uris: [trackUri]
        })
      });
      setIsPlaying(true);
    } catch (error) {
      console.error('Error starting playback:', error);
    }
  };

  useEffect(() => {
    const handleVolumeChange = async () => {
      if (player && sdkReady) {
        try {
          await player.setVolume(volume);
        } catch (error) {
          console.error('Volume control error:', error);
          if (isConnectedToSpotify) {
            handleDisconnectSpotify();
          }
        }
      }
    };

    handleVolumeChange();
  }, [volume, player, sdkReady, isConnectedToSpotify]);

  const handleBeginSession = async (inputText) => {
    if (pendingTrack) {
      try {
        await startPlayback(pendingTrack);
      } catch (error) {
        console.error('Error starting playback:', error);
      }
    }
    onBeginClick(inputText);
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
              <button 
                onClick={handleDisconnectSpotify}
                className="tw-mt-16 tw-px-4 tw-py-2 tw-bg-red-500 tw-text-white tw-rounded-full tw-font-medium hover:tw-bg-red-600 tw-transition-colors tw-border-0 tw-cursor-pointer"
              >
                Disconnect
              </button>
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
          <form onSubmit={(e) => {
            e.preventDefault();
            handleBeginSession(inputValue);
          }}>
            <button
              onClick={handleClick}
              className={`
                tw-w-[90%]
                tw-py-3
                tw-bg-gray-700
                tw-rounded-lg
                tw-shadow-[0_4px_8px_rgba(0,0,0,0.25)]
                tw-font-sans
                tw-text-lg
                tw-text-white
                tw-cursor-pointer
                tw-border-0
                tw-transition-all
              `}
            >
              Begin Session
            </button>
          </form>
        </div>

        {/* Control Bar - Fixed at bottom */}
        <div className="
          // Positioning
          tw-mt-16
          tw-absolute
          tw-bottom-8         // 32px from bottom
          tw-left-0
          tw-right-0
          
          // Layout
          tw-flex
          tw-justify-center
          tw-gap-4
          
          // Dimensions
          tw-h-[10%]
        ">
          <button 
            onClick={handlePlayPauseClick}
            className="
              // Dimensions
              tw-w-12
              tw-h-12
              
              // Layout
              tw-flex
              tw-items-center
              tw-justify-center
              
              // Styling
              tw-bg-gray-600
              tw-rounded-full
              tw-shadow-[0_4px_8px_rgba(0,0,0,0.25)]
              
              // Behavior
              tw-border-0
              tw-outline-none
              focus:tw-outline-none
              hover:tw-cursor-pointer
              tw-transition-all
            "
          >
            {isPlaying ? (
              // Pause SVG
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
              // Play SVG
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
            className="
              tw-w-12 
              tw-h-12 
              tw-flex 
              tw-flex-row 
              tw-items-center 
              tw-gap-2 
              tw-justify-center 
              tw-bg-gray-600
              tw-rounded-full 
              hover:tw-cursor-pointer 
              tw-transition-all
              tw-border-0
              tw-outline-none
              focus:tw-outline-none
              tw-shadow-[0_4px_8px_rgba(0,0,0,0.25)]
            "
          >
            {/* Next Track SVG */}
            <svg 
              className="tw-w-6 tw-h-6 tw-fill-white" 
              viewBox="0 0 24 24"
            >
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default MusicPlayer;
