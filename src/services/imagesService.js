import { authFetch } from '../utils/api';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

export const fetchImages = async () => {
    try {
        const response = await authFetch(`${API_URL}/api/files/list-images`);
        if (!response.ok) {
            throw new Error('Failed to fetch images');
        }
        const data = await response.json();
        return data.items || [];
    } catch (error) {
        console.error('Error fetching images:', error);
        throw error;
    }
};

export const updateImagePreference = async (name, enabled) => {
    try {
        const response = await authFetch(`${API_URL}/api/files/image-preferences`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, enabled }),
        });
        if (!response.ok) {
            throw new Error('Failed to update image preference');
        }
        return response.json();
    } catch (error) {
        console.error('Error updating image preference:', error);
        throw error;
    }
};

export const deleteImage = async (name) => {
    try {
        const encodedPath = name.split('/').map(encodeURIComponent).join('/');
        const response = await authFetch(`${API_URL}/api/files/${encodedPath}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            throw new Error('Failed to delete image');
        }
        return response.json();
    } catch (error) {
        console.error('Error deleting image:', error);
        throw error;
    }
};
