const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
  tokenNumber: {
    type: String,
    required: true,
    unique: true
  },
  service: {
    type: String,
    required: true
  },
  serviceType: {
    type: String,
    enum: ['bank', 'nadra', 'university', 'hospital'],
    required: true
  },
  branch: {
    type: String,
    required: true
  },
  customerName: {
    type: String,
    required: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['waiting', 'serving', 'completed', 'cancelled', 'skipped'],
    default: 'waiting'
  },
  priority: {
    type: String,
    enum: ['normal', 'high', 'critical'],
    default: 'normal'
  },
  position: {
    type: Number,
    default: 0
  },
  estimatedWaitTime: {
    type: Number,
    default: 0
  },
  completedAt: {
    type: Date
  },
  cancellationReason: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Only keep these indexes (remove duplicate tokenNumber index)
tokenSchema.index({ serviceType: 1, status: 1, position: 1 });
tokenSchema.index({ customerId: 1 });

module.exports = mongoose.model('Token', tokenSchema);
