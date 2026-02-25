const TOKEN_KEY = 'authToken';

let authToken = sessionStorage.getItem(TOKEN_KEY);

export const setAuthToken = (token) => {
    authToken = token;
    sessionStorage.setItem(TOKEN_KEY, token);
};

export const getAuthToken = () => authToken;

export const clearAuthToken = () => {
    authToken = null;
    sessionStorage.removeItem(TOKEN_KEY);
};

export const hasActiveSession = () => {
    try {
        const session = JSON.parse(localStorage.getItem('currentSession'));
        return session && session.timerActive;
    } catch {
        return false;
    }
};

export const getTokenExpiry = (token) => {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp ? payload.exp * 1000 : null;
    } catch {
        return null;
    }
};

export const authFetch = async (url, options = {}) => {
    const headers = { ...options.headers };

    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401 || response.status === 403) {
        // Don't interrupt an active focus session
        if (!hasActiveSession()) {
            window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        }
    }

    return response;
};
