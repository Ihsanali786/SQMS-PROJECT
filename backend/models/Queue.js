const mongoose = require('mongoose');

const queueSchema = new mongoose.Schema({
  serviceType: {
    type: String,
    enum: ['bank', 'nadra', 'university', 'hospital'],
    required: true,
    unique: true
  },
  currentServing: {
    type: String,
    default: null
  },
  currentServingName: {
    type: String,
    default: null
  },
  waitingCount: {
    type: Number,
    default: 0
  },
  completedToday: {
    type: Number,
    default: 0
  },
  averageWaitTime: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Queue', queueSchema);