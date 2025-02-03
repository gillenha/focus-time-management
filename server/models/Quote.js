const mongoose = require('mongoose');

const quoteSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true,
        trim: true
    },
    author: {
        type: String,
        trim: true,
        default: 'Unknown'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    isDefault: {
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model('Quote', quoteSchema); 