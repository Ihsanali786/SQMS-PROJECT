// backend/models/Branch.js
const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  branchId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  serviceType: {
    type: String,
    enum: ['bank', 'nadra', 'university', 'hospital'],
    required: true
  },
  city: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  managerName: {
    type: String,
    required: true
  },
  tokenPrefix: {
    type: String,
    required: true
  },
  currentCounter: {
    type: Number,
    default: 0
  },
  workingHours: {
    start: { type: String, default: '09:00' },
    end: { type: String, default: '17:00' }
  },
  breakTimes: [{
    start: String,
    end: String,
    reason: String
  }],
  counters: [{
    counterNumber: Number,
    isActive: { type: Boolean, default: true },
    currentToken: String,
    staffId: String
  }],
  capacity: {
    type: Number,
    default: 100
  },
  currentLoad: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  averageWaitTime: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Branch', branchSchema);