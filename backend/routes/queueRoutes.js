const express = require('express');
const { getQueue, callNext, completeToken, skipToken } = require('../controllers/queueController');
const { protect, admin } = require('../middleware/auth');

const router = express.Router();

// Generic admin queue routes (frontend calls `/queue/bank`, `/queue/nadra`, etc.)
router.get('/:serviceType', protect, admin, getQueue);
router.put('/:serviceType/next', protect, admin, callNext);
router.put('/:serviceType/complete/:tokenId', protect, admin, completeToken);
router.put('/:serviceType/skip/:tokenId', protect, admin, skipToken);

module.exports = router;

