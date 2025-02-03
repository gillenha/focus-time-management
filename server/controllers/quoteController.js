const Quote = require('../models/Quote');

// Get all quotes
exports.getQuotes = async (req, res) => {
    try {
        const quotes = await Quote.find().sort({ createdAt: -1 });
        res.json({ quotes });
    } catch (error) {
        console.error('Error fetching quotes:', error);
        res.status(500).json({ error: 'Failed to fetch quotes' });
    }
};

// Add a new quote
exports.addQuote = async (req, res) => {
    try {
        const { text, author = 'Unknown' } = req.body;
        
        if (!text) {
            return res.status(400).json({ error: 'Quote text is required' });
        }

        const quote = new Quote({
            text,
            author,
            isDefault: false
        });

        await quote.save();
        
        // Return all quotes after adding new one
        const quotes = await Quote.find().sort({ createdAt: -1 });
        res.json({ quotes });
    } catch (error) {
        console.error('Error adding quote:', error);
        res.status(500).json({ error: 'Failed to add quote' });
    }
};

// Delete a quote
exports.deleteQuote = async (req, res) => {
    try {
        const { id } = req.params;

        const quote = await Quote.findById(id);
        if (!quote) {
            return res.status(404).json({ error: 'Quote not found' });
        }

        // Prevent deletion of default quotes
        if (quote.isDefault) {
            return res.status(403).json({ error: 'Cannot delete default quotes' });
        }

        await quote.deleteOne();

        // Return remaining quotes
        const quotes = await Quote.find().sort({ createdAt: -1 });
        res.json({ quotes });
    } catch (error) {
        console.error('Error deleting quote:', error);
        res.status(500).json({ error: 'Failed to delete quote' });
    }
}; 