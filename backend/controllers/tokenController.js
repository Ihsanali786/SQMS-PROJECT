const Token = require('../models/Token');
const Queue = require('../models/Queue');
const { getIO } = require('../config/socket');
const {
  DEFAULT_SERVICE_MIN,
  SERVICE_TYPES,
  computeEstimatedWait,
  recalculateQueue
} = require('../services/queueEngine');

// Helpers
const emitQueueUpdate = (serviceType, payload = {}) => {
  const io = getIO();
  if (!io) return;
  io.to(`queue-${serviceType}`).emit('queue-update', {
    serviceType,
    ...payload
  });
};

// Generate new token
// POST /api/tokens
// Private
const generateToken = async (req, res) => {
  try {
    const { service, serviceType, branch, date, time } = req.body;

    if (!service || !serviceType || !branch || !date || !time) {
      return res.status(400).json({
        success: false,
        message: 'service, serviceType, branch, date and time are required'
      });
    }

    const prefix = {
      bank: 'B',
      nadra: 'N',
      university: 'U',
      hospital: 'H'
    };

    if (!SERVICE_TYPES.includes(serviceType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid serviceType'
      });
    }

    // Calculate queue position and estimated wait.
    const waitingCount = await Token.countDocuments({
      serviceType,
      branch,
      status: 'waiting'
    });

    const queue = await Queue.findOne({ serviceType });
    const openCounters = queue?.openCounters ?? 1;
    const estimatedWaitTime = computeEstimatedWait(
      waitingCount,
      openCounters
    );

    let token = null;

    // Generate a unique number, retrying if a concurrent request collides.
    for (let attempt = 0; attempt < 5; attempt++) {
      const prefixText = `${prefix[serviceType]}-`;

      const existingTokens = await Token.find({
        serviceType,
        tokenNumber: new RegExp(`^${prefixText}\\d+$`)
      })
        .select('tokenNumber')
        .lean();

      let maxNumber = 0;

      for (const existing of existingTokens) {
        const number = Number(
          existing.tokenNumber.slice(prefixText.length)
        );

        if (Number.isInteger(number) && number > maxNumber) {
          maxNumber = number;
        }
      }

      const tokenNumber =
        `${prefix[serviceType]}-${String(maxNumber + 1).padStart(3, '0')}`;

      try {
        token = await Token.create({
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

        break;
      } catch (error) {
        if (error.code === 11000 && attempt < 4) {
          continue;
        }

        throw error;
      }
    }

    if (!token) {
      return res.status(503).json({
        success: false,
        message: 'Could not generate a unique token. Please try again.'
      });
    }

    // Update queue waiting count.
    await recalculateQueue(serviceType, branch);

    emitQueueUpdate(serviceType, {
      action: 'new-token',
      tokenNumber: token.tokenNumber
    });

    const refreshed = await Token.findById(token._id);

    return res.status(201).json({
      success: true,
      data: refreshed || token
    });
  } catch (error) {
    console.error('Generate token error:', error.message);

    return res.status(500).json({
      success: false,
      message: error.code === 11000
        ? 'Could not generate a unique token. Please try again.'
        : 'Failed to generate token.'
    });
  }
};

// Get user's tokens
// GET /api/tokens/my-tokens
// Private
const getMyTokens = async (req, res) => {
  try {
    const tokens = await Token.find({ customerId: req.user._id })
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: tokens
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get live queue status for a service type
// GET /api/tokens/queue/:serviceType
// Public
const getQueueStatus = async (req, res) => {
  try {
    const { serviceType } = req.params;
    const { branch } = req.query;

    if (!SERVICE_TYPES.includes(serviceType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid serviceType'
      });
    }

    const waitingFilter = { serviceType, status: 'waiting' };
    const servingFilter = { serviceType, status: 'serving' };
    if (branch) {
      waitingFilter.branch = branch;
      servingFilter.branch = branch;
    }

    const [waiting, serving, queue] = await Promise.all([
      Token.find(waitingFilter).sort({ position: 1, createdAt: 1 }),
      Token.findOne(servingFilter),
      Queue.findOne({ serviceType })
    ]);

    return res.json({
      success: true,
      data: {
        waitingCount: waiting.length,
        waitingList: waiting,
        currentServing: serving,
        openCounters: queue?.openCounters ?? 1,
        averageWaitTime: queue?.averageWaitTime ?? DEFAULT_SERVICE_MIN
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Cancel a token
// PUT /api/tokens/:tokenNumber/cancel
// Private
const cancelToken = async (req, res) => {
  try {
    const { tokenNumber } = req.params;
    const { reason } = req.body;

    const token = await Token.findOne({
      tokenNumber,
      customerId: req.user._id
    });

    if (!token) {
      return res.status(404).json({
        success: false,
        message: 'Token not found'
      });
    }

    if (token.status === 'serving') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel while being served'
      });
    }

    if (token.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a completed token'
      });
    }

    if (token.status === 'cancelled') {
      return res.json({
        success: true,
        data: token,
        message: 'Token already cancelled'
      });
    }

    const wasWaiting = token.status === 'waiting';

    token.status = 'cancelled';
    token.completedAt = new Date();
    token.cancellationReason = reason || '';

    await token.save();

    if (wasWaiting) {
      await recalculateQueue(token.serviceType, token.branch);
    }

    emitQueueUpdate(token.serviceType, {
      action: 'cancel',
      tokenNumber: token.tokenNumber
    });

    return res.json({
      success: true,
      data: token
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Reschedule a token
// PUT /api/tokens/:tokenNumber/reschedule
// Private
const rescheduleToken = async (req, res) => {
  try {
    const { tokenNumber } = req.params;
    const { newDate, newTime } = req.body;

    if (!newDate || !newTime) {
      return res.status(400).json({
        success: false,
        message: 'newDate and newTime are required'
      });
    }

    const token = await Token.findOne({
      tokenNumber,
      customerId: req.user._id
    });

    if (!token) {
      return res.status(404).json({
        success: false,
        message: 'Token not found'
      });
    }

    if (token.status !== 'waiting') {
      return res.status(400).json({
        success: false,
        message: 'Only waiting tokens can be rescheduled'
      });
    }

    token.date = new Date(newDate);
    token.time = newTime;

    await token.save();

    emitQueueUpdate(token.serviceType, {
      action: 'reschedule',
      tokenNumber: token.tokenNumber
    });

    return res.json({
      success: true,
      data: token
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  generateToken,
  getMyTokens,
  getQueueStatus,
  cancelToken,
  rescheduleToken
};