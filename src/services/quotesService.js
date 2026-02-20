import { authFetch } from '../utils/api';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

export const fetchQuotes = async () => {
    try {
        const response = await authFetch(`${API_URL}/api/quotes`);
        if (!response.ok) {
            throw new Error('Failed to fetch quotes');
        }
        const data = await response.json();
        return data.quotes || [];
    } catch (error) {
        console.error('Error fetching quotes:', error);
        throw error;
    }
};

export const addQuote = async ({ text, author }) => {
    try {
        const response = await authFetch(`${API_URL}/api/quotes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text, author }),
        });
        if (!response.ok) {
            throw new Error('Failed to add quote');
        }
        const data = await response.json();
        return data.quotes;
    } catch (error) {
        console.error('Error adding quote:', error);
        throw error;
    }
};

export const deleteQuote = async (id) => {
    try {
        const response = await authFetch(`${API_URL}/api/quotes/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            throw new Error('Failed to delete quote');
        }
        const data = await response.json();
        return data.quotes;
    } catch (error) {
        console.error('Error deleting quote:', error);
        throw error;
    }
}; 