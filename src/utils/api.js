let authToken = null;

export const setAuthToken = (token) => {
    authToken = token;
};

export const getAuthToken = () => authToken;

export const clearAuthToken = () => {
    authToken = null;
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
