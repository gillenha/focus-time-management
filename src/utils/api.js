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

export const authFetch = async (url, options = {}) => {
    const headers = { ...options.headers };

    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401 || response.status === 403) {
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }

    return response;
};
