const mongoose = require('mongoose');

const imagePreferenceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    enabled: {
        type: Boolean,
        default: true
    }
});

module.exports = mongoose.model('ImagePreference', imagePreferenceSchema);
