// backend/controllers/queueController.js
const Token = require('../models/Token');
const Queue = require('../models/Queue');
const { getIO } = require('../config/socket');
const {
  DEFAULT_SERVICE_MIN,
  ETA_PAUSED,
  isValidServiceType,
  getQueueFilter,
  computeEstimatedWait,
  recalculateQueue
} = require('../services/queueEngine');

/** In-memory auto-arrival simulators (never touch non-simulated tokens) */
const simulationState = new Map();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Emit a queue-update event scoped to the serviceType room.
 * Also emits turn-alert for any token now at position ≤ 2.
 */
const emitQueueUpdate = async (serviceType, payload = {}) => {
  const io = getIO();
  if (!io) return;

  io.to(`queue-${serviceType}`).emit('queue-update', { serviceType, ...payload });

  // Notify customers whose turn is near (position 1 or 2)
  try {
    const nearTokens = await Token.find({
      serviceType,
      status: 'waiting',
      position: { $lte: 2 }
    });
    for (const t of nearTokens) {
      io.to(`token-${t.tokenNumber}`).emit('turn-alert', {
        tokenNumber: t.tokenNumber,
        position: t.position,
        message: `Your turn is almost here! You are #${t.position} in the queue.`
      });
    }
  } catch (_) {
    // Non-fatal — don't crash the handler
  }
};

const emitTokenAlert = (token, message, extra = {}) => {
  const io = getIO();
  if (!io || !token?.tokenNumber) return;
  io.to(`token-${token.tokenNumber}`).emit('turn-alert', {
    tokenNumber: token.tokenNumber,
    position: token.position,
    message,
    ...extra
  });
};

// ─── Controllers ──────────────────────────────────────────────────────────────

// @desc    Get queue for admin (waiting + serving)
// @route   GET /api/queue/:serviceType
// @access  Private/Admin
const getQueue = async (req, res) => {
  try {
    const { serviceType } = req.params;
    const { branch } = req.query;
    if (!isValidServiceType(serviceType)) {
      return res.status(400).json({ success: false, message: 'Invalid serviceType' });
    }

    const filter = getQueueFilter(serviceType, branch);
    const tokens = await Token.find({
      ...filter,
      status: { $in: ['waiting', 'serving'] }
    }).sort({ position: 1 });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const statsFilter = getQueueFilter(serviceType, branch);
    const [total, completed, skipped, queue, completedTokens, skippedTokens] = await Promise.all([
      Token.countDocuments({ ...statsFilter, createdAt: { $gte: todayStart } }),
      Token.countDocuments({ ...statsFilter, status: 'completed', createdAt: { $gte: todayStart } }),
      Token.countDocuments({ ...statsFilter, status: 'skipped', createdAt: { $gte: todayStart } }),
      Queue.findOne({ serviceType }),
      Token.find({ ...statsFilter, status: 'completed', createdAt: { $gte: todayStart } })
        .sort({ completedAt: -1 }).limit(15),
      Token.find({ ...statsFilter, status: 'skipped', createdAt: { $gte: todayStart } })
        .sort({ completedAt: -1 }).limit(15)
    ]);

    const uniqueBranches = [...new Set(tokens.map((t) => t.branch).filter(Boolean))];

    const stats = {
      total,
      totalToday: total,
      completed,
      skipped,
      waiting: tokens.filter(t => t.status === 'waiting').length,
      serving: tokens.filter(t => t.status === 'serving').length,
      openCounters: queue?.openCounters ?? 1,
      averageWaitTime: queue?.averageWaitTime ?? DEFAULT_SERVICE_MIN,
      avgWaitTime: `${queue?.averageWaitTime ?? DEFAULT_SERVICE_MIN} min`,
      branches: uniqueBranches.length,
      simulationRunning: simulationState.get(serviceType)?.running === true
    };

    res.json({
      success: true,
      data: { tokens, completedTokens, skippedTokens, stats }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get live analytics for a service type
// @route   GET /api/queue/:serviceType/analytics
// @access  Private/Admin
const getAnalytics = async (req, res) => {
  try {
    const { serviceType } = req.params;
    if (!isValidServiceType(serviceType)) {
      return res.status(400).json({ success: false, message: 'Invalid serviceType' });
    }
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [waiting, serving, completed, skipped, totalToday, queue] = await Promise.all([
      Token.countDocuments({ serviceType, status: 'waiting' }),
      Token.countDocuments({ serviceType, status: 'serving' }),
      Token.countDocuments({ serviceType, status: 'completed', createdAt: { $gte: todayStart } }),
      Token.countDocuments({ serviceType, status: 'skipped', createdAt: { $gte: todayStart } }),
      Token.countDocuments({ serviceType, createdAt: { $gte: todayStart } }),
      Queue.findOne({ serviceType })
    ]);

    // Compute average wait from completedAt - createdAt for tokens completed today
    const completedTokens = await Token.find({
      serviceType,
      status: 'completed',
      completedAt: { $gte: todayStart },
      createdAt: { $gte: todayStart }
    }).select('createdAt completedAt');

    let avgWait = queue?.averageWaitTime || DEFAULT_SERVICE_MIN;
    if (completedTokens.length > 0) {
      const totalMinutes = completedTokens.reduce((sum, t) => {
        const diffMs = (t.completedAt || new Date()) - t.createdAt;
        return sum + diffMs / 60000;
      }, 0);
      avgWait = Math.round(totalMinutes / completedTokens.length);
    }

    res.json({
      success: true,
      data: {
        serviceType,
        totalToday,
        waiting,
        serving,
        completed,
        skipped,
        openCounters: queue?.openCounters ?? 1,
        averageWaitTime: Math.max(avgWait, 0),
        completionRate: totalToday > 0 ? Math.round((completed / totalToday) * 100) : 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Open or close counters for a service
// @route   PUT /api/queue/:serviceType/counter
// @access  Private/Admin
// Body: { action: 'open'|'close'|'set', count: N }
const manageCounter = async (req, res) => {
  try {
    const { serviceType } = req.params;
    const { action, count } = req.body;
    if (!isValidServiceType(serviceType)) {
      return res.status(400).json({ success: false, message: 'Invalid serviceType' });
    }

    const queue = await Queue.findOne({ serviceType }) ||
      new Queue({ serviceType });

    let current = queue.openCounters ?? 1;

    if (action === 'open') {
      current = Math.min(current + 1, 20);
    } else if (action === 'close') {
      current = Math.max(current - 1, 0);
    } else if (action === 'set' && Number.isInteger(Number(count))) {
      current = Math.max(0, Math.min(Number(count), 20));
    } else {
      return res.status(400).json({ success: false, message: 'action must be open, close, or set' });
    }

    await Queue.findOneAndUpdate(
      { serviceType },
      { openCounters: current, lastUpdated: new Date() },
      { upsert: true, new: true }
    );

    // Recalculate ETA for all waiting tokens now that counter count changed
    await recalculateQueue(serviceType);
    await emitQueueUpdate(serviceType, { action: 'counter-change', openCounters: current });

    res.json({ success: true, data: { openCounters: current } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Call next token in queue
// @route   PUT /api/queue/:serviceType/next
// @access  Private/Admin
const callNext = async (req, res) => {
  try {
    const { serviceType } = req.params;
    const { branch } = req.body || {};
    if (!isValidServiceType(serviceType)) {
      return res.status(400).json({ success: false, message: 'Invalid serviceType' });
    }

    // Find next waiting token (lowest position)
    const nextToken = await Token.findOneAndUpdate(
      { ...getQueueFilter(serviceType, branch), status: 'waiting' },
      { status: 'serving' },
      { sort: { position: 1 }, new: true }
    );

    if (!nextToken) {
      return res.status(404).json({ success: false, message: 'No tokens waiting' });
    }

    // Update queue's currentServing
    await Queue.findOneAndUpdate(
      { serviceType },
      {
        currentServing: nextToken.tokenNumber,
        currentServingName: nextToken.customerName,
        lastUpdated: new Date()
      },
      { upsert: true }
    );

    // Recalculate positions for remaining waiters
    await recalculateQueue(serviceType, nextToken.branch);

    res.json({ success: true, data: nextToken });

    emitTokenAlert(nextToken, 'It is your turn now. Please proceed to the counter.', {
      status: 'serving'
    });

    // Emit after response to avoid blocking
    await emitQueueUpdate(serviceType, {
      action: 'call-next',
      tokenNumber: nextToken.tokenNumber
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Complete a token
// @route   PUT /api/queue/:serviceType/complete/:tokenId
// @access  Private/Admin
const completeToken = async (req, res) => {
  try {
    const { tokenId } = req.params;
    const { serviceType } = req.params;

    const token = await Token.findById(tokenId);
    if (!token) {
      return res.status(404).json({ success: false, message: 'Token not found' });
    }
    if (serviceType !== token.serviceType) {
      return res.status(400).json({ success: false, message: 'Token does not belong to this serviceType' });
    }

    const now = new Date();
    token.status = 'completed';
    token.completedAt = now;
    await token.save();

    // Update rolling average wait time in Queue document
    const serviceMs = now - token.createdAt;
    const serviceMin = Math.round(serviceMs / 60000);

    const queue = await Queue.findOne({ serviceType: token.serviceType });
    const prevAvg = queue?.averageWaitTime || DEFAULT_SERVICE_MIN;
    const prevCount = queue?.completedToday || 0;
    // Rolling average
    const newAvg = prevCount === 0
      ? serviceMin
      : Math.round((prevAvg * prevCount + serviceMin) / (prevCount + 1));

    await Queue.findOneAndUpdate(
      { serviceType: token.serviceType },
      {
        $inc: { completedToday: 1 },
        averageWaitTime: newAvg,
        currentServing: null,
        currentServingName: null,
        lastUpdated: new Date()
      },
      { upsert: true }
    );

    // Recalculate for remaining
    await recalculateQueue(token.serviceType, token.branch);

    res.json({ success: true, data: token });

    await emitQueueUpdate(token.serviceType, {
      action: 'complete',
      tokenId: token._id,
      tokenNumber: token.tokenNumber
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Skip a token
// @route   PUT /api/queue/:serviceType/skip/:tokenId
// @access  Private/Admin
const skipToken = async (req, res) => {
  try {
    const { tokenId } = req.params;
    const { serviceType } = req.params;

    const token = await Token.findById(tokenId);

    if (!token) {
      return res.status(404).json({ success: false, message: 'Token not found' });
    }
    if (serviceType !== token.serviceType) {
      return res.status(400).json({ success: false, message: 'Token does not belong to this serviceType' });
    }

    token.status = 'skipped';
    token.completedAt = new Date();
    await token.save();

    // If it was serving, clear currentServing
    await Queue.findOneAndUpdate(
      { serviceType: token.serviceType, currentServing: token.tokenNumber },
      { currentServing: null, currentServingName: null }
    );

    await recalculateQueue(token.serviceType, token.branch);

    res.json({ success: true, data: token });

    if (token.serviceType) {
      await emitQueueUpdate(token.serviceType, {
        action: 'skip',
        tokenId: token._id,
        tokenNumber: token.tokenNumber
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add a simulated customer arrival (admin/demo only)
// @route   POST /api/queue/:serviceType/simulate
// @access  Private/Admin
const simulateArrival = async (req, res) => {
  try {
    const { serviceType } = req.params;
    const { customerName, service } = req.body;
    if (!isValidServiceType(serviceType)) {
      return res.status(400).json({ success: false, message: 'Invalid serviceType' });
    }

    const prefix = { bank: 'B', nadra: 'N', university: 'U', hospital: 'H' };

    // Generate a unique token number
    const count = await Token.countDocuments({ serviceType }) + 1;
    const tokenNumber = `${prefix[serviceType] || 'X'}-SIM-${String(count).padStart(3, '0')}`;

    const waitingCount = await Token.countDocuments({ serviceType, status: 'waiting' });
    const queue = await Queue.findOne({ serviceType });
    const openCounters = queue?.openCounters ?? 1;
    const customersAhead = waitingCount;
    const estimatedWaitTime = computeEstimatedWait(customersAhead, openCounters);

    const defaultServices = {
      bank: 'Account Opening',
      nadra: 'CNIC Renewal',
      university: 'Admission',
      hospital: 'General Checkup'
    };

    const token = await Token.create({
      tokenNumber,
      service: service || defaultServices[serviceType] || 'General Service',
      serviceType,
      branch: 'Demo Branch',
      customerName: customerName || `Demo Customer ${count}`,
      customerId: req.user._id,
      date: new Date(),
      time: new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }),
      position: waitingCount + 1,
      estimatedWaitTime,
      status: 'waiting',
      isSimulated: true
    });

    await recalculateQueue(serviceType);

    await emitQueueUpdate(serviceType, {
      action: 'simulated-arrival',
      tokenNumber: token.tokenNumber
    });

    const refreshed = await Token.findById(token._id);
    res.status(201).json({ success: true, data: refreshed || token, simulated: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createSimulatedTokenInternal = async (serviceType, adminUserId, customerName, service) => {
  const prefix = { bank: 'B', nadra: 'N', university: 'U', hospital: 'H' };
  const count = await Token.countDocuments({ serviceType }) + 1;
  const tokenNumber = `${prefix[serviceType] || 'X'}-SIM-${String(count).padStart(3, '0')}`;
  const waitingCount = await Token.countDocuments({ serviceType, status: 'waiting' });
  const queue = await Queue.findOne({ serviceType });
  const openCounters = queue?.openCounters ?? 1;
  const estimatedWaitTime = computeEstimatedWait(waitingCount, openCounters);

  const defaultServices = {
    bank: 'Account Opening',
    nadra: 'CNIC Renewal',
    university: 'Admission',
    hospital: 'General Checkup'
  };

  const token = await Token.create({
    tokenNumber,
    service: service || defaultServices[serviceType] || 'General Service',
    serviceType,
    branch: 'Demo Branch',
    customerName: customerName || `Sim Customer ${count}`,
    customerId: adminUserId,
    date: new Date(),
    time: new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }),
    position: waitingCount + 1,
    estimatedWaitTime,
    status: 'waiting',
    isSimulated: true
  });

  await recalculateQueue(serviceType);
  await emitQueueUpdate(serviceType, { action: 'simulated-arrival', tokenNumber: token.tokenNumber });
  return token;
};

const getSimulationStatus = async (req, res) => {
  try {
    const { serviceType } = req.params;
    if (!isValidServiceType(serviceType)) {
      return res.status(400).json({ success: false, message: 'Invalid serviceType' });
    }
    const state = simulationState.get(serviceType);
    const simulatedWaiting = await Token.countDocuments({
      serviceType,
      isSimulated: true,
      status: 'waiting'
    });
    res.json({
      success: true,
      data: {
        running: state?.running === true,
        intervalMs: state?.intervalMs || 8000,
        simulatedWaiting
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const startSimulation = async (req, res) => {
  try {
    const { serviceType } = req.params;
    const intervalMs = Math.max(Number(req.body?.intervalMs) || 8000, 3000);
    if (!isValidServiceType(serviceType)) {
      return res.status(400).json({ success: false, message: 'Invalid serviceType' });
    }

    const existing = simulationState.get(serviceType);
    if (existing?.timer) clearInterval(existing.timer);

    const adminUserId = req.user._id;
    const timer = setInterval(async () => {
      try {
        await createSimulatedTokenInternal(
          serviceType,
          adminUserId,
          `Auto Sim ${Date.now() % 10000}`,
          null
        );
      } catch (err) {
        console.error('Simulation tick error:', err.message);
      }
    }, intervalMs);

    simulationState.set(serviceType, { running: true, intervalMs, timer });

    res.json({ success: true, data: { running: true, intervalMs } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const stopSimulation = async (req, res) => {
  try {
    const { serviceType } = req.params;
    if (!isValidServiceType(serviceType)) {
      return res.status(400).json({ success: false, message: 'Invalid serviceType' });
    }
    const state = simulationState.get(serviceType);
    if (state?.timer) clearInterval(state.timer);
    simulationState.set(serviceType, { running: false, intervalMs: state?.intervalMs || 8000, timer: null });
    res.json({ success: true, data: { running: false } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const resetSimulation = async (req, res) => {
  try {
    const { serviceType } = req.params;
    if (!isValidServiceType(serviceType)) {
      return res.status(400).json({ success: false, message: 'Invalid serviceType' });
    }

    const state = simulationState.get(serviceType);
    if (state?.timer) clearInterval(state.timer);
    simulationState.set(serviceType, { running: false, intervalMs: state?.intervalMs || 8000, timer: null });

    const removed = await Token.deleteMany({
      serviceType,
      isSimulated: true,
      status: { $in: ['waiting', 'serving', 'skipped', 'cancelled'] }
    });

    await Queue.findOneAndUpdate(
      { serviceType },
      { currentServing: null, currentServingName: null, lastUpdated: new Date() }
    );
    await recalculateQueue(serviceType);
    await emitQueueUpdate(serviceType, { action: 'simulation-reset' });

    res.json({
      success: true,
      data: { removed: removed.deletedCount || 0 }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getQueue,
  getAnalytics,
  manageCounter,
  callNext,
  completeToken,
  skipToken,
  simulateArrival,
  getSimulationStatus,
  startSimulation,
  stopSimulation,
  resetSimulation,
  recalculateQueue,
  ETA_PAUSED
};
