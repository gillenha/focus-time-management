import React, { createContext, useContext, useState } from 'react';

const SpotifyContext = createContext(null);

export const SpotifyProvider = ({ children }) => {
  const [isConnectedToSpotify, setIsConnectedToSpotify] = useState(false);

  const handleDisconnectSpotify = () => {
    // Clear all Spotify-related data
    localStorage.removeItem('spotifyAccessToken');
    localStorage.removeItem('spotifyRefreshToken');
    localStorage.removeItem('spotifyDeviceId');
    setIsConnectedToSpotify(false);
  };

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

  return (
    <SpotifyContext.Provider value={{
      isConnectedToSpotify,
      setIsConnectedToSpotify,
      handleDisconnectSpotify,
      refreshAccessToken
    }}>
      {children}
    </SpotifyContext.Provider>
  );
};

export const useSpotify = () => useContext(SpotifyContext);