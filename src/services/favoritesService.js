import { authFetch } from '../utils/api';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

export const fetchFavorites = async () => {
    try {
        const response = await authFetch(`${API_URL}/api/favorites`);
        if (!response.ok) {
            throw new Error('Failed to fetch favorites');
        }
        const data = await response.json();
        return data || [];
    } catch (error) {
        console.error('Error fetching favorites:', error);
        throw error;
    }
};

export const addFavorite = async ({ title, imageUrl, source = 'custom', tags = [] }) => {
    try {
        const response = await authFetch(`${API_URL}/api/favorites`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ title, imageUrl, source, tags }),
        });
        if (!response.ok) {
            throw new Error('Failed to add favorite');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error adding favorite:', error);
        throw error;
    }
};

export const deleteFavorite = async (id) => {
    try {
        const response = await authFetch(`${API_URL}/api/favorites/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            throw new Error('Failed to delete favorite');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error deleting favorite:', error);
        throw error;
    }
};