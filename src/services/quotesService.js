const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const BUCKET_URL = 'https://storage.googleapis.com/react-app-assets';

export const fetchQuotes = async () => {
    try {
        if (process.env.NODE_ENV === 'production') {
            // Get a signed URL for reading
            const signedUrlResponse = await fetch(`${process.env.REACT_APP_API_URL}/get-quote-url`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ operation: 'read' }),
            });

            if (!signedUrlResponse.ok) {
                throw new Error('Failed to get signed URL');
            }

            const { signedUrl } = await signedUrlResponse.json();
            
            // Use the signed URL to fetch quotes
            const response = await fetch(signedUrl);
            if (!response.ok) {
                throw new Error('Failed to fetch quotes');
            }
            const data = await response.json();
            return data.quotes || [];
        } else {
            // Development environment
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/quotes`);
            if (!response.ok) {
                throw new Error('Failed to fetch quotes');
            }
            const data = await response.json();
            return data.quotes;
        }
    } catch (error) {
        console.error('Error fetching quotes:', error);
        throw error;
    }
};

export const addQuote = async (quote) => {
    try {
        if (process.env.NODE_ENV === 'production') {
            // First fetch existing quotes
            const existingQuotes = await fetchQuotes();
            const updatedQuotes = [...existingQuotes, quote];
            
            // Get a signed URL for writing
            const signedUrlResponse = await fetch(`${process.env.REACT_APP_API_URL}/get-quote-url`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ operation: 'write' }),
            });

            if (!signedUrlResponse.ok) {
                throw new Error('Failed to get signed URL');
            }

            const { signedUrl } = await signedUrlResponse.json();
            
            // Upload using the signed URL
            const response = await fetch(signedUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ quotes: updatedQuotes }),
            });
            
            if (!response.ok) {
                throw new Error('Failed to add quote');
            }
            
            return updatedQuotes;
        } else {
            // Development environment
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/quotes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ quote }),
            });
            if (!response.ok) {
                throw new Error('Failed to add quote');
            }
            const data = await response.json();
            return data.quotes;
        }
    } catch (error) {
        console.error('Error adding quote:', error);
        throw error;
    }
};

export const deleteQuote = async (index) => {
    try {
        if (process.env.NODE_ENV === 'production') {
            // First fetch existing quotes
            const existingQuotes = await fetchQuotes();
            const updatedQuotes = existingQuotes.filter((_, i) => i !== index);
            
            // Upload directly to Google Cloud Storage
            const content = JSON.stringify({ quotes: updatedQuotes });
            const response = await fetch(`${BUCKET_URL}/data/quotes.json`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: content
            });
            
            if (!response.ok) {
                throw new Error('Failed to delete quote');
            }
            
            return updatedQuotes;
        } else {
            // Development environment
            const response = await fetch(`${API_URL}/api/quotes/${index}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                throw new Error('Failed to delete quote');
            }
            const data = await response.json();
            return data.quotes;
        }
    } catch (error) {
        console.error('Error deleting quote:', error);
        throw error;
    }
}; 