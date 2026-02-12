const { readData, writeData, generateId, findById, findIndexById } = require('../utils/jsonStorage');

const QUOTES_FILE = 'quotes.json';

// Get all quotes
exports.getQuotes = async (req, res) => {
    console.log('GET /api/quotes called');
    try {
        console.log('Fetching quotes from JSON file...');
        const quotes = readData(QUOTES_FILE);
        // Sort by createdAt (newest first)
        const sortedQuotes = quotes.sort((a, b) =>
            new Date(b.createdAt) - new Date(a.createdAt)
        );
        console.log('Quotes fetched successfully:', sortedQuotes);
        res.json({ quotes: sortedQuotes });
    } catch (error) {
        console.error('Error fetching quotes:', error);
        res.status(500).json({ error: 'Failed to fetch quotes', details: error.message });
    }
};

// Add a new quote
exports.addQuote = async (req, res) => {
    console.log('POST /api/quotes called with body:', req.body);
    try {
        const { text, author = 'Unknown' } = req.body;

        if (!text) {
            console.log('Quote text is missing');
            return res.status(400).json({ error: 'Quote text is required' });
        }

        console.log('Creating new quote:', { text, author });
        const quotes = readData(QUOTES_FILE);

        const newQuote = {
            _id: generateId(),
            text,
            author,
            isDefault: false,
            createdAt: new Date().toISOString()
        };

        quotes.push(newQuote);
        writeData(QUOTES_FILE, quotes);

        // Return all quotes after adding new one
        console.log('Fetching updated quotes list...');
        const updatedQuotes = readData(QUOTES_FILE);
        const sortedQuotes = updatedQuotes.sort((a, b) =>
            new Date(b.createdAt) - new Date(a.createdAt)
        );
        console.log('Quotes fetched successfully:', sortedQuotes);
        res.json({ quotes: sortedQuotes });
    } catch (error) {
        console.error('Error adding quote:', error);
        res.status(500).json({ error: 'Failed to add quote', details: error.message });
    }
};

// Delete a quote
exports.deleteQuote = async (req, res) => {
    console.log('DELETE /api/quotes/:id called with id:', req.params.id);
    try {
        const { id } = req.params;

        console.log('Finding quote by ID:', id);
        const quotes = readData(QUOTES_FILE);
        const quote = findById(quotes, id);

        if (!quote) {
            console.log('Quote not found');
            return res.status(404).json({ error: 'Quote not found' });
        }

        // Prevent deletion of default quotes
        if (quote.isDefault) {
            console.log('Attempted to delete default quote');
            return res.status(403).json({ error: 'Cannot delete default quotes' });
        }

        console.log('Deleting quote...');
        const index = findIndexById(quotes, id);
        quotes.splice(index, 1);
        writeData(QUOTES_FILE, quotes);

        // Return remaining quotes
        console.log('Fetching updated quotes list...');
        const updatedQuotes = readData(QUOTES_FILE);
        const sortedQuotes = updatedQuotes.sort((a, b) =>
            new Date(b.createdAt) - new Date(a.createdAt)
        );
        console.log('Quotes fetched successfully:', sortedQuotes);
        res.json({ quotes: sortedQuotes });
    } catch (error) {
        console.error('Error deleting quote:', error);
        res.status(500).json({ error: 'Failed to delete quote', details: error.message });
    }
};

// Update a quote
exports.updateQuote = async (req, res) => {
    console.log('PUT /api/quotes/:id called with id:', req.params.id);
    try {
        const { id } = req.params;
        const { text, author = 'Unknown' } = req.body;

        if (!text) {
            console.log('Quote text is missing');
            return res.status(400).json({ error: 'Quote text is required' });
        }

        console.log('Finding and updating quote:', { id, text, author });
        const quotes = readData(QUOTES_FILE);
        const quote = findById(quotes, id);

        if (!quote) {
            console.log('Quote not found');
            return res.status(404).json({ error: 'Quote not found' });
        }

        // Prevent updating default quotes
        if (quote.isDefault) {
            console.log('Attempted to update default quote');
            return res.status(403).json({ error: 'Cannot update default quotes' });
        }

        const index = findIndexById(quotes, id);
        quotes[index] = {
            ...quotes[index],
            text,
            author
        };
        writeData(QUOTES_FILE, quotes);

        // Return all quotes after update
        console.log('Fetching updated quotes list...');
        const updatedQuotes = readData(QUOTES_FILE);
        const sortedQuotes = updatedQuotes.sort((a, b) =>
            new Date(b.createdAt) - new Date(a.createdAt)
        );
        console.log('Quotes updated successfully:', sortedQuotes);
        res.json({ quotes: sortedQuotes });
    } catch (error) {
        console.error('Error updating quote:', error);
        res.status(500).json({ error: 'Failed to update quote', details: error.message });
    }
};
