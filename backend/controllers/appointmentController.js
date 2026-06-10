// backend/controllers/appointmentController.js
const BranchToken = require('../models/BranchToken');
const notificationService = require('../services/notificationService');

// Cancel appointment
const cancelAppointment = async (req, res) => {
  try {
    const { tokenId } = req.params;
    const { reason } = req.body;
    
    const token = await BranchToken.findOne({ tokenNumber: tokenId, customerId: req.user._id });
    
    if (!token) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    
    if (token.status === 'serving') {
      return res.status(400).json({ success: false, message: 'Cannot cancel while being served' });
    }
    
    if (token.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Cannot cancel completed appointment' });
    }
    
    // Update token status
    token.status = 'cancelled';
    token.cancelledAt = new Date();
    token.cancellationReason = reason;
    await token.save();
    
    // Notify user
    await notificationService.sendEmail(
      token.customerEmail,
      'Appointment Cancelled',
      'appointment-cancelled',
      { token, reason }
    );
    
    res.json({ success: true, message: 'Appointment cancelled successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Reschedule appointment
const rescheduleAppointment = async (req, res) => {
  try {
    const { tokenId } = req.params;
    const { newDate, newTime, newBranchId } = req.body;
    
    const oldToken = await BranchToken.findOne({ tokenNumber: tokenId, customerId: req.user._id });
    
    if (!oldToken) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    
    if (oldToken.status !== 'waiting') {
      return res.status(400).json({ success: false, message: 'Can only reschedule waiting appointments' });
    }
    
    // Create new token
    const newToken = await createToken({
      ...oldToken.toObject(),
      date: newDate,
      time: newTime,
      branchId: newBranchId || oldToken.branchId,
      tokenNumber: generateNewTokenNumber(oldToken.branchId)
    });
    
    // Cancel old token
    oldToken.status = 'cancelled';
    oldToken.cancellationReason = 'Rescheduled';
    await oldToken.save();
    
    // Notify user
    await notificationService.sendEmail(
      oldToken.customerEmail,
      'Appointment Rescheduled',
      'appointment-rescheduled',
      { oldToken, newToken }
    );
    
    res.json({ success: true, data: newToken, message: 'Appointment rescheduled successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Auto-expire tokens
const expireOldTokens = async () => {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  
  await BranchToken.updateMany(
    {
      status: 'waiting',
      createdAt: { $lt: twoHoursAgo },
      expiresAt: { $lt: new Date() }
    },
    { status: 'expired' }
  );
};

// Handle late arrival
const handleLateArrival = async (req, res) => {
  try {
    const { tokenId } = req.params;
    const { lateMinutes } = req.body;
    
    const token = await BranchToken.findOne({ tokenNumber: tokenId, customerId: req.user._id });
    
    if (!token) {
      return res.status(404).json({ success: false, message: 'Token not found' });
    }
    
    if (lateMinutes > 30) {
      token.status = 'cancelled';
      token.cancellationReason = 'Late arrival (>30 min)';
      await token.save();
      return res.json({ success: false, message: 'Token cancelled due to excessive lateness' });
    }
    
    // Re-position at end of queue
    const maxPosition = await BranchToken.countDocuments({ branchId: token.branchId, status: 'waiting' });
    token.position = maxPosition + 1;
    token.status = 'waiting';
    await token.save();
    
    res.json({ success: true, message: 'You have been placed at the end of the queue' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  cancelAppointment,
  rescheduleAppointment,
  expireOldTokens,
  handleLateArrival
};