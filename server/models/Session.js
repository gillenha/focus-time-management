const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  date: {
    type: Date,
    default: Date.now
  },
  time: {
    type: String,
    required: true
  },
  duration: {
    type: String,
    required: true
  },
  text: {
    type: String,
    default: ''
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Session', sessionSchema); 