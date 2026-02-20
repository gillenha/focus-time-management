import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { setAuthToken, clearAuthToken } from '../utils/api';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [authError, setAuthError] = useState(null);

    const logout = useCallback(() => {
        clearAuthToken();
        setIsAuthenticated(false);
        setAuthError(null);
    }, []);

    // Listen for unauthorized events from authFetch
    useEffect(() => {
        const handleUnauthorized = () => {
            logout();
            setAuthError('Session expired. Please sign in again.');
        };

        window.addEventListener('auth:unauthorized', handleUnauthorized);
        return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
    }, [logout]);

    // Load Google Identity Services script
    useEffect(() => {
        const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
        if (!clientId) {
            console.warn('REACT_APP_GOOGLE_CLIENT_ID not set, skipping auth');
            setIsLoading(false);
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            window.google.accounts.id.initialize({
                client_id: clientId,
                callback: handleCredentialResponse,
            });
            setIsLoading(false);
        };
        script.onerror = () => {
            setAuthError('Failed to load Google Sign-In');
            setIsLoading(false);
        };

        document.body.appendChild(script);

        return () => {
            if (document.body.contains(script)) {
                document.body.removeChild(script);
            }
        };
    }, []);

    const handleCredentialResponse = (response) => {
        if (response.credential) {
            setAuthToken(response.credential);
            setIsAuthenticated(true);
            setAuthError(null);
        }
    };

    const value = {
        isAuthenticated,
        isLoading,
        authError,
        setAuthError,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
