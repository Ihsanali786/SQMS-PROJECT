const express = require('express');
const { generateToken, getMyTokens, getQueueStatus, cancelToken, rescheduleToken } = require('../controllers/tokenController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, generateToken);
router.get('/my-tokens', protect, getMyTokens);
router.get('/queue/:serviceType', getQueueStatus);
router.put('/:tokenNumber/cancel', protect, cancelToken);
router.put('/:tokenNumber/reschedule', protect, rescheduleToken);

module.exports = router;
