// backend/routes/queueRoutes.js
const express = require('express');
const {
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
  resetSimulation
} = require('../controllers/queueController');
const { protect, admin } = require('../middleware/auth');
const { assertServiceAccess } = require('../middleware/serviceAccess');

const router = express.Router();
const staff = [protect, admin, assertServiceAccess];

router.get('/:serviceType/simulation', ...staff, getSimulationStatus);
router.post('/:serviceType/simulation/start', ...staff, startSimulation);
router.post('/:serviceType/simulation/stop', ...staff, stopSimulation);
router.post('/:serviceType/simulation/reset', ...staff, resetSimulation);

router.get('/:serviceType', ...staff, getQueue);
router.get('/:serviceType/analytics', ...staff, getAnalytics);
router.put('/:serviceType/next', ...staff, callNext);
router.put('/:serviceType/complete/:tokenId', ...staff, completeToken);
router.put('/:serviceType/skip/:tokenId', ...staff, skipToken);
router.put('/:serviceType/counter', ...staff, manageCounter);
router.post('/:serviceType/simulate', ...staff, simulateArrival);

module.exports = router;
