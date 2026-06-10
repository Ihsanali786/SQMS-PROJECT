// backend/models/AuditLog.js
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ['LOGIN', 'LOGOUT', 'REGISTER', 'TOKEN_GENERATED', 'TOKEN_CANCELLED', 
           'TOKEN_RESCHEDULED', 'CALL_NEXT', 'COMPLETE_TOKEN', 'SKIP_TOKEN',
           'EMERGENCY_OVERRIDE', 'BREAK_START', 'BREAK_END', 'STAFF_ADDED',
           'STAFF_REMOVED', 'BRANCH_MODIFIED', 'SETTINGS_CHANGED'],
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  userEmail: String,
  userRole: String,
  branchId: String,
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: String,
  userAgent: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);