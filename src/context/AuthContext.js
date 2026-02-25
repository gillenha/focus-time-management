import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { setAuthToken, clearAuthToken, getAuthToken, getTokenExpiry, hasActiveSession } from '../utils/api';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(() => !!getAuthToken());
    const [isLoading, setIsLoading] = useState(() => !getAuthToken());
    const [authError, setAuthError] = useState(null);
    const expiryTimerRef = useRef(null);
    const pollIntervalRef = useRef(null);

    const clearTimers = useCallback(() => {
        if (expiryTimerRef.current) {
            clearTimeout(expiryTimerRef.current);
            expiryTimerRef.current = null;
        }
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
    }, []);

    const logout = useCallback(() => {
        clearTimers();
        clearAuthToken();
        setIsAuthenticated(false);
        setAuthError(null);
    }, [clearTimers]);

    // Start polling for session end, then logout
    const waitForSessionEnd = useCallback(() => {
        if (pollIntervalRef.current) return;

        pollIntervalRef.current = setInterval(() => {
            if (!hasActiveSession()) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
                logout();
                setAuthError('Session expired. Please sign in again.');
            }
        }, 5000);
    }, [logout]);

    // Schedule proactive logout based on token expiry
    const scheduleExpiry = useCallback((token) => {
        clearTimers();

        const expiry = getTokenExpiry(token);
        if (!expiry) return;

        const msUntilExpiry = expiry - Date.now();
        if (msUntilExpiry <= 0) {
            // Token already expired
            if (!hasActiveSession()) {
                logout();
                setAuthError('Session expired. Please sign in again.');
            } else {
                waitForSessionEnd();
            }
            return;
        }

        expiryTimerRef.current = setTimeout(() => {
            if (!hasActiveSession()) {
                logout();
                setAuthError('Session expired. Please sign in again.');
            } else {
                waitForSessionEnd();
            }
        }, msUntilExpiry);
    }, [clearTimers, logout, waitForSessionEnd]);

    // Listen for unauthorized events from authFetch
    useEffect(() => {
        const handleUnauthorized = () => {
            // Double-check: don't interrupt active focus sessions
            if (hasActiveSession()) return;
            logout();
            setAuthError('Session expired. Please sign in again.');
        };

        window.addEventListener('auth:unauthorized', handleUnauthorized);
        return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
    }, [logout]);

    // On mount, schedule expiry for restored token
    useEffect(() => {
        const token = getAuthToken();
        if (token) {
            scheduleExpiry(token);
        }
    }, [scheduleExpiry]);

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
            scheduleExpiry(response.credential);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => clearTimers();
    }, [clearTimers]);

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
