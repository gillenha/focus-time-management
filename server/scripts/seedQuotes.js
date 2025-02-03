require('dotenv').config();
const mongoose = require('mongoose');
const Quote = require('../models/Quote');
const defaultQuotes = require('../utils/defaultQuotes');

const seedQuotes = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Connected to MongoDB');

        // Clear existing default quotes
        await Quote.deleteMany({ isDefault: true });
        console.log('Cleared existing default quotes');

        // Process default quotes
        const quotesToInsert = defaultQuotes.map(quoteText => {
            // Extract author if present
            const match = quoteText.match(/"([^"]+)" - (.+)$/);
            if (match) {
                return {
                    text: match[1],
                    author: match[2],
                    isDefault: true
                };
            }
            return {
                text: quoteText.replace(/^"|"$/g, ''),
                isDefault: true
            };
        });

        // Insert default quotes
        await Quote.insertMany(quotesToInsert);
        console.log('Default quotes seeded successfully');

        // Close connection
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
    } catch (error) {
        console.error('Error seeding quotes:', error);
        process.exit(1);
    }
};

// Run the seeding function
seedQuotes(); 