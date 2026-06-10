// backend/models/BranchToken.js
const mongoose = require('mongoose');

const branchTokenSchema = new mongoose.Schema({
  tokenNumber: {
    type: String,
    required: true
  },
  branchId: {
    type: String,
    required: true,
    ref: 'Branch'
  },
  service: {
    type: String,
    required: true
  },
  customerId: {
    type: String,
    required: true
  },
  customerName: {
    type: String,
    required: true
  },
  customerEmail: {
    type: String,
    required: true
  },
  customerPhone: String,
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
    enum: ['waiting', 'serving', 'completed', 'cancelled', 'skipped', 'expired'],
    default: 'waiting'
  },
  position: {
    type: Number,
    default: 0
  },
  estimatedWaitTime: {
    type: Number,
    default: 0
  },
  actualWaitTime: {
    type: Number,
    default: 0
  },
  servedBy: {
    type: String,
    ref: 'Staff'
  },
  servedAt: Date,
  counterNumber: Number,
  isPriority: {
    type: Boolean,
    default: false
  },
  priorityReason: {
    type: String,
    enum: ['elderly', 'disabled', 'emergency', 'pregnant', 'none'],
    default: 'none'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date
  }
});

// Indexes for performance
branchTokenSchema.index({ branchId: 1, status: 1, position: 1 });
branchTokenSchema.index({ branchId: 1, date: 1 });
branchTokenSchema.index({ tokenNumber: 1 });
branchTokenSchema.index({ customerId: 1 });

module.exports = mongoose.model('BranchToken', branchTokenSchema);