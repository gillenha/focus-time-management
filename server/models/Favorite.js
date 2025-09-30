const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    imageUrl: {
        type: String,
        required: true,
        trim: true
    },
    source: {
        type: String,
        enum: ['unsplash', 'custom', 'upload'],
        default: 'custom'
    },
    tags: [{
        type: String,
        trim: true
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Favorite', favoriteSchema);