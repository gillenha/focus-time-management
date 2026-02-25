import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { setAuthToken, clearAuthToken, getAuthToken, getTokenExpiry, hasActiveSession } from '../utils/api';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

const REFRESH_BUFFER_MS = 5 * 60 * 1000; // Try refreshing 5 min before expiry
const RETRY_INTERVAL_MS = 60 * 1000;     // Retry every 60s if refresh fails

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(() => !!getAuthToken());
    const [isLoading, setIsLoading] = useState(() => !getAuthToken());
    const [authError, setAuthError] = useState(null);
    const expiryTimerRef = useRef(null);
    const retryTimerRef = useRef(null);

    const clearTimers = useCallback(() => {
        if (expiryTimerRef.current) {
            clearTimeout(expiryTimerRef.current);
            expiryTimerRef.current = null;
        }
        if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
        }
    }, []);

    const logout = useCallback(() => {
        clearTimers();
        clearAuthToken();
        setIsAuthenticated(false);
        setAuthError(null);
    }, [clearTimers]);

    // Try to silently get a fresh token from Google
    const trySilentRefresh = useCallback(() => {
        if (!window.google) return;

        window.google.accounts.id.prompt((notification) => {
            const dismissed = notification.isNotDisplayed() || notification.isSkippedMoment();
            if (dismissed) {
                // Silent refresh didn't work — decide what to do
                if (hasActiveSession()) {
                    // Session running, keep trying
                    retryTimerRef.current = setTimeout(trySilentRefresh, RETRY_INTERVAL_MS);
                } else {
                    // Idle, log out
                    logout();
                    setAuthError('Session expired. Please sign in again.');
                }
            }
            // If successful, handleCredentialResponse fires via the initialize callback
        });
    }, [logout]);

    // Schedule a refresh attempt before token expiry
    const scheduleExpiry = useCallback((token) => {
        clearTimers();

        const expiry = getTokenExpiry(token);
        if (!expiry) return;

        const msUntilRefresh = Math.max(expiry - Date.now() - REFRESH_BUFFER_MS, 0);

        expiryTimerRef.current = setTimeout(() => {
            if (hasActiveSession()) {
                trySilentRefresh();
            } else {
                logout();
                setAuthError('Session expired. Please sign in again.');
            }
        }, msUntilRefresh);
    }, [clearTimers, logout, trySilentRefresh]);

    // Listen for unauthorized events from authFetch
    useEffect(() => {
        const handleUnauthorized = () => {
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
            const expiry = getTokenExpiry(token);
            if (expiry && expiry <= Date.now()) {
                // Restored token is already expired
                if (!hasActiveSession()) {
                    logout();
                    setAuthError('Session expired. Please sign in again.');
                } else {
                    trySilentRefresh();
                }
            } else if (token) {
                scheduleExpiry(token);
            }
        }
    }, [scheduleExpiry, logout, trySilentRefresh]);

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
                auto_select: true,
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
