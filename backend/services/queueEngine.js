/**
 * SQMS queue / wait-time engine (hackathon MVP).
 *
 * Assumptions:
 * - Each open counter serves one customer at a time.
 * - Average service time is DEFAULT_SERVICE_MIN minutes (fixed; actuals update Queue.averageWaitTime).
 * - Waiting ETA = ceil(customersAhead / openCounters) * DEFAULT_SERVICE_MIN when openCounters > 0.
 * - When openCounters === 0, estimatedWaitTime is ETA_PAUSED (-1) — service paused, not a negative guess.
 * - Positions are 1-based among tokens with status "waiting", ordered by prior position then createdAt.
 * - Queue.openCounters is tracked per serviceType (shared across branches for this MVP).
 * - Branch filter applies to position recalculation when branch is provided on admin actions.
 */

const Token = require('../models/Token');
const Queue = require('../models/Queue');

const DEFAULT_SERVICE_MIN = 5;
const ETA_PAUSED = -1;
const SERVICE_TYPES = ['bank', 'nadra', 'university', 'hospital'];

const isValidServiceType = (serviceType) => SERVICE_TYPES.includes(serviceType);

const getQueueFilter = (serviceType, branch) => {
  const filter = { serviceType };
  if (branch) filter.branch = branch;
  return filter;
};

/**
 * @param {number} customersAhead 0-based count of waiting customers in front
 * @param {number} openCounters active counters for the service
 * @returns {number} minutes, or ETA_PAUSED when no counters are open
 */
const computeEstimatedWait = (customersAhead, openCounters) => {
  if (openCounters === 0) return ETA_PAUSED;
  const effectiveCounters = Math.max(openCounters, 1);
  return Math.ceil(customersAhead / effectiveCounters) * DEFAULT_SERVICE_MIN;
};

const recalculateQueueForBranch = async (serviceType, branch) => {
  const queue = await Queue.findOne({ serviceType });
  const openCounters = queue?.openCounters ?? 1;
  const queueFilter = getQueueFilter(serviceType, branch);

  const waitingTokens = await Token.find({ ...queueFilter, status: 'waiting' })
    .sort({ position: 1, createdAt: 1 });

  const bulkOps = waitingTokens.map((token, index) => {
    const newPosition = index + 1;
    const customersAhead = index;
    const estimatedWaitTime = computeEstimatedWait(customersAhead, openCounters);

    return {
      updateOne: {
        filter: { _id: token._id },
        update: { $set: { position: newPosition, estimatedWaitTime } }
      }
    };
  });

  if (bulkOps.length > 0) {
    await Token.bulkWrite(bulkOps);
  }

  return waitingTokens.length;
};

/** When branch is omitted, recalculate every branch queue separately (positions are per branch). */
const recalculateQueue = async (serviceType, branch = null) => {
  let updated = 0;
  if (branch) {
    updated = await recalculateQueueForBranch(serviceType, branch);
  } else {
    const branches = await Token.distinct('branch', { serviceType, status: 'waiting' });
    if (branches.length === 0) {
      updated = 0;
    } else {
      for (const b of branches) {
        updated += await recalculateQueueForBranch(serviceType, b);
      }
    }
  }

  const totalWaiting = await Token.countDocuments({ serviceType, status: 'waiting' });
  await Queue.findOneAndUpdate(
    { serviceType },
    { waitingCount: totalWaiting, lastUpdated: new Date() },
    { upsert: true }
  );

  return updated;
};

module.exports = {
  DEFAULT_SERVICE_MIN,
  ETA_PAUSED,
  SERVICE_TYPES,
  isValidServiceType,
  getQueueFilter,
  computeEstimatedWait,
  recalculateQueue
};
