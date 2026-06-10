const Token = require('../models/Token');
const Queue = require('../models/Queue');
const { getIO } = require('../config/socket');

const emitQueueUpdate = (serviceType, payload = {}) => {
  const io = getIO();
  if (!io) return;
  io.to(`queue-${serviceType}`).emit('queue-update', { serviceType, ...payload });
};

// @desc    Generate new token
// @route   POST /api/tokens
// @access  Private
const generateToken = async (req, res) => {
  try {
    const { service, serviceType, branch, date, time } = req.body;
    
    // Generate token number
    const prefix = {
      bank: 'B',
      nadra: 'N',
      university: 'U',
      hospital: 'H'
    };
    
    const count = await Token.countDocuments({ serviceType }) + 1;
    const tokenNumber = `${prefix[serviceType]}-${String(count).padStart(3, '0')}`;
    
    // Calculate position and wait time
    const waitingCount = await Token.countDocuments({ 
      serviceType, 
      status: 'waiting' 
    });
    
    const estimatedWaitTime = waitingCount * 5; // 5 minutes per person
    
    const token = await Token.create({
      tokenNumber,
      service,
      serviceType,
      branch,
      customerName: req.user.name,
      customerId: req.user._id,
      date: new Date(date),
      time,
      position: waitingCount + 1,
      estimatedWaitTime
    });
    
    // Update queue waiting count
    await Queue.findOneAndUpdate(
      { serviceType },
      { 
        $inc: { waitingCount: 1 },
        lastUpdated: new Date()
      },
      { upsert: true }
    );

    emitQueueUpdate(serviceType, { action: 'new-token', tokenNumber: token.tokenNumber });
    
    res.status(201).json({
      success: true,
      data: token
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get user's tokens
// @route   GET /api/tokens/my-tokens
// @access  Private
const getMyTokens = async (req, res) => {
  try {
    const tokens = await Token.find({ customerId: req.user._id })
      .sort({ createdAt: -1 });
    res.json({
      success: true,
      data: tokens
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get queue status
// @route   GET /api/tokens/queue/:serviceType
// @access  Public
const getQueueStatus = async (req, res) => {
  try {
    const { serviceType } = req.params;
    
    const waiting = await Token.find({ 
      serviceType, 
      status: 'waiting' 
    }).sort({ position: 1 });
    
    const serving = await Token.findOne({ 
      serviceType, 
      status: 'serving' 
    });
    
    const queue = await Queue.findOne({ serviceType });
    
    res.json({
      success: true,
      data: {
        waitingCount: waiting.length,
        waitingList: waiting,
        currentServing: serving,
        averageWaitTime: queue?.averageWaitTime || 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Cancel a token
// @route   PUT /api/tokens/:tokenNumber/cancel
// @access  Private
const cancelToken = async (req, res) => {
  try {
    const { tokenNumber } = req.params;
    const { reason } = req.body;

    const token = await Token.findOne({ tokenNumber, customerId: req.user._id });
    if (!token) {
      return res.status(404).json({ success: false, message: 'Token not found' });
    }

    if (token.status === 'serving') {
      return res.status(400).json({ success: false, message: 'Cannot cancel while being served' });
    }
    if (token.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Cannot cancel a completed token' });
    }
    if (token.status === 'cancelled') {
      return res.json({ success: true, data: token, message: 'Token already cancelled' });
    }

    const wasWaiting = token.status === 'waiting';
    token.status = 'cancelled';
    token.completedAt = new Date();
    token.cancellationReason = reason || '';
    await token.save();

    if (wasWaiting) {
      await Queue.findOneAndUpdate(
        { serviceType: token.serviceType },
        { $inc: { waitingCount: -1 }, lastUpdated: new Date() },
        { upsert: true }
      );
    }

    emitQueueUpdate(token.serviceType, { action: 'cancel', tokenNumber: token.tokenNumber });

    return res.json({ success: true, data: token });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reschedule a token
// @route   PUT /api/tokens/:tokenNumber/reschedule
// @access  Private
const rescheduleToken = async (req, res) => {
  try {
    const { tokenNumber } = req.params;
    const { newDate, newTime } = req.body;

    if (!newDate || !newTime) {
      return res.status(400).json({ success: false, message: 'newDate and newTime are required' });
    }

    const token = await Token.findOne({ tokenNumber, customerId: req.user._id });
    if (!token) {
      return res.status(404).json({ success: false, message: 'Token not found' });
    }

    if (token.status !== 'waiting') {
      return res.status(400).json({ success: false, message: 'Only waiting tokens can be rescheduled' });
    }

    token.date = new Date(newDate);
    token.time = newTime;
    await token.save();

    emitQueueUpdate(token.serviceType, { action: 'reschedule', tokenNumber: token.tokenNumber });

    return res.json({ success: true, data: token });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  generateToken,
  getMyTokens,
  getQueueStatus,
  cancelToken,
  rescheduleToken
};
