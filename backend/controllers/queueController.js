const Token = require('../models/Token');
const Queue = require('../models/Queue');
const { getIO } = require('../config/socket');

const emitQueueUpdate = (serviceType, payload = {}) => {
  const io = getIO();
  if (!io) return;
  io.to(`queue-${serviceType}`).emit('queue-update', { serviceType, ...payload });
};

// @desc    Get queue for admin
// @route   GET /api/queue/:serviceType
// @access  Private/Admin
const getQueue = async (req, res) => {
  try {
    const { serviceType } = req.params;
    
    const tokens = await Token.find({ 
      serviceType,
      status: { $in: ['waiting', 'serving'] }
    }).sort({ position: 1 });
    
    const stats = {
      total: await Token.countDocuments({ serviceType, createdAt: { $gte: new Date().setHours(0,0,0,0) } }),
      completed: await Token.countDocuments({ serviceType, status: 'completed', createdAt: { $gte: new Date().setHours(0,0,0,0) } }),
      waiting: tokens.filter(t => t.status === 'waiting').length
    };
    
    res.json({
      success: true,
      data: { tokens, stats }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Call next token
// @route   PUT /api/queue/:serviceType/next
// @access  Private/Admin
const callNext = async (req, res) => {
  try {
    const { serviceType } = req.params;
    
    // Find next waiting token
    const nextToken = await Token.findOneAndUpdate(
      { serviceType, status: 'waiting' },
      { status: 'serving' },
      { sort: { position: 1 }, new: true }
    );
    
    if (nextToken) {
      // Update queue
      await Queue.findOneAndUpdate(
        { serviceType },
        { 
          currentServing: nextToken.tokenNumber,
          currentServingName: nextToken.customerName,
          $inc: { waitingCount: -1 }
        },
        { upsert: true }
      );
      
      res.json({
        success: true,
        data: nextToken
      });

      emitQueueUpdate(serviceType, { action: 'call-next', tokenNumber: nextToken.tokenNumber });
    } else {
      res.status(404).json({
        success: false,
        message: 'No tokens waiting'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Complete token
// @route   PUT /api/queue/:serviceType/complete/:tokenId
// @access  Private/Admin
const completeToken = async (req, res) => {
  try {
    const { tokenId } = req.params;
    
    const token = await Token.findByIdAndUpdate(
      tokenId,
      { 
        status: 'completed',
        completedAt: new Date()
      },
      { new: true }
    );
    
    if (token) {
      await Queue.findOneAndUpdate(
        { serviceType: token.serviceType },
        { $inc: { completedToday: 1 } }
      );
      
      res.json({
        success: true,
        data: token
      });

      emitQueueUpdate(token.serviceType, { action: 'complete', tokenId: token._id, tokenNumber: token.tokenNumber });
    } else {
      res.status(404).json({
        success: false,
        message: 'Token not found'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Skip token
// @route   PUT /api/queue/:serviceType/skip/:tokenId
// @access  Private/Admin
const skipToken = async (req, res) => {
  try {
    const { tokenId } = req.params;
    
    const token = await Token.findByIdAndUpdate(
      tokenId,
      { status: 'skipped' },
      { new: true }
    );
    
    res.json({
      success: true,
      data: token
    });

    if (token?.serviceType) emitQueueUpdate(token.serviceType, { action: 'skip', tokenId: token._id, tokenNumber: token.tokenNumber });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getQueue,
  callNext,
  completeToken,
  skipToken
};
