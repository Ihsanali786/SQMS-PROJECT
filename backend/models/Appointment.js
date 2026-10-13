const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  tokenId: {
    type: String,
    required: true
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
  customerName: {
    type: String,
    required: true
  },
  customerEmail: {
    type: String,
    required: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  date: {
    type: Date,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  branch: {
    type: String,
    required: true
  },
  city: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['upcoming', 'waiting', 'completed', 'cancelled'],
    default: 'waiting'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Appointment', appointmentSchema);