// backend/routes/branchRoutes.js
const express = require('express');
const Branch = require('../models/Branch');
const BranchToken = require('../models/BranchToken');
const { protect, admin } = require('../middleware/auth');

// Import services
const predictionService = require('../services/predictionService');
const recommendationService = require('../services/recommendationService');

const router = express.Router();

// Get all branches with filters
router.get('/', async (req, res) => {
  try {
    const { serviceType, city, isActive } = req.query;
    const filter = {};
    if (serviceType) filter.serviceType = serviceType;
    if (city) filter.city = city;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    
    const branches = await Branch.find(filter).select('-__v');
    
    // Add current load for each branch
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const branchesWithLoad = await Promise.all(branches.map(async (branch) => {
      const waitingCount = await BranchToken.countDocuments({
        branchId: branch.branchId,
        status: 'waiting',
        date: { $gte: today }
      });
      const branchObj = branch.toObject();
      branchObj.currentWaiting = waitingCount;
      branchObj.recommendation = waitingCount < (branch.capacity * 0.7) ? 'Available' : 'Busy';
      return branchObj;
    }));
    
    res.json({ success: true, data: branchesWithLoad });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single branch with full queue
router.get('/:branchId', async (req, res) => {
  try {
    const branch = await Branch.findOne({ branchId: req.params.branchId });
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const queue = await BranchToken.find({
      branchId: branch.branchId,
      status: { $in: ['waiting', 'serving'] },
      date: { $gte: today }
    }).sort({ position: 1 });
    
    const stats = {
      waiting: queue.filter(t => t.status === 'waiting').length,
      serving: queue.filter(t => t.status === 'serving').length,
      total: await BranchToken.countDocuments({ branchId: branch.branchId, date: { $gte: today } }),
      completed: await BranchToken.countDocuments({ branchId: branch.branchId, status: 'completed', date: { $gte: today } })
    };
    
    res.json({ success: true, data: { branch, queue, stats } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Compare branches for load balancing
router.get('/compare/:serviceType/:city', async (req, res) => {
  try {
    const { serviceType, city } = req.params;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const branches = await Branch.find({ serviceType, city, isActive: true });
    
    const comparison = await Promise.all(branches.map(async (branch) => {
      const waitingCount = await BranchToken.countDocuments({
        branchId: branch.branchId,
        status: 'waiting',
        date: { $gte: today }
      });
      
      // Use prediction service for accurate wait time
      let avgWaitTime = waitingCount * 3;
      if (predictionService) {
        try {
          avgWaitTime = await predictionService.predictWaitTime(branch.branchId, 'Default', waitingCount + 1);
        } catch (e) {
          // Fallback to simple calculation
        }
      }
      
      return {
        branchId: branch.branchId,
        name: branch.name,
        address: branch.address,
        waitingCount,
        avgWaitTime,
        capacity: branch.capacity,
        utilization: (waitingCount / branch.capacity) * 100,
        recommendation: waitingCount < 10 ? '✅ Recommended' : waitingCount < 20 ? '⚠️ Moderate' : '🔴 Busy'
      };
    }));
    
    // Sort by least waiting
    comparison.sort((a, b) => a.waitingCount - b.waitingCount);
    
    res.json({ success: true, data: comparison });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Generate token for specific branch
router.post('/:branchId/token', async (req, res) => {
  try {
    const { branchId } = req.params;
    const { service, customerId, customerName, customerEmail, customerPhone, date, time, isPriority, priorityReason } = req.body;
    
    const branch = await Branch.findOne({ branchId });
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }
    
    // Check branch capacity
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTokens = await BranchToken.countDocuments({
      branchId,
      date: { $gte: today }
    });
    
    if (todayTokens >= branch.capacity) {
      return res.status(400).json({ 
        success: false, 
        message: 'Branch is at full capacity today. Please try another branch.',
        alternativeBranches: await getAlternativeBranches(branch.serviceType, branch.city, branchId)
      });
    }
    
    // Get position with priority handling
    let position = await BranchToken.countDocuments({ branchId, status: 'waiting' });
    if (isPriority) {
      // Priority customers go to front
      position = 1;
      await BranchToken.updateMany(
        { branchId, status: 'waiting', position: { $gte: 1 } },
        { $inc: { position: 1 } }
      );
    } else {
      position += 1;
    }
    
    const tokenNumber = `${branch.tokenPrefix}${String(todayTokens + 1).padStart(4, '0')}`;
    
    // Use prediction service for accurate wait time
    let estimatedWaitTime = position * 3;
    if (predictionService) {
      try {
        estimatedWaitTime = await predictionService.predictWaitTime(branchId, service, position);
      } catch (e) {
        // Fallback to simple calculation
      }
    }
    
    const token = await BranchToken.create({
      tokenNumber,
      branchId,
      service,
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      date: new Date(date),
      time,
      position,
      estimatedWaitTime,
      isPriority: isPriority || false,
      priorityReason: priorityReason || 'none',
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours expiry
    });
    
    // Update branch counter
    await Branch.updateOne({ branchId }, { $inc: { currentCounter: 1, currentLoad: 1 } });
    
    res.status(201).json({ success: true, data: token });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Call next token for branch
router.put('/:branchId/queue/next', async (req, res) => {
  try {
    const { branchId } = req.params;
    const { counterNumber, staffId } = req.body;
    
    // Get next waiting token (priority first)
    const nextToken = await BranchToken.findOneAndUpdate(
      { branchId, status: 'waiting' },
      { 
        status: 'serving', 
        servedBy: staffId,
        counterNumber: counterNumber
      },
      { sort: { isPriority: -1, position: 1 }, new: true }
    );
    
    if (!nextToken) {
      return res.status(404).json({ success: false, message: 'No customers waiting' });
    }
    
    // Update counter status if counters exist
    await Branch.updateOne(
      { branchId, 'counters.counterNumber': counterNumber },
      { $set: { 'counters.$.currentToken': nextToken.tokenNumber, 'counters.$.staffId': staffId } }
    );
    
    res.json({ success: true, data: nextToken });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get branch recommendation (AI-powered)
router.get('/recommend/:serviceType/:city', async (req, res) => {
  try {
    const { serviceType, city } = req.params;
    
    if (!recommendationService) {
      // Fallback if service not available
      const branches = await Branch.find({ serviceType, city, isActive: true });
      const simpleRecommendation = branches[0];
      return res.json({ 
        success: true, 
        data: {
          bestBranch: { branch: simpleRecommendation, waitingCount: 0, avgWaitTime: 10, loadPercent: 30 },
          message: 'Branch recommendation available'
        }
      });
    }
    
    const recommendation = await recommendationService.getBestBranch(serviceType, city);
    res.json({ success: true, data: recommendation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get best time to visit a branch
router.get('/best-time/:branchId', async (req, res) => {
  try {
    const { branchId } = req.params;
    
    if (!recommendationService) {
      return res.json({ 
        success: true, 
        data: {
          recommendedHour: '10:00 - 11:00',
          peakHours: ['12:00 - 13:00', '14:00 - 15:00'],
          message: 'Visit during morning hours for shorter waits'
        }
      });
    }
    
    const bestTime = await recommendationService.getBestTimeToVisit(branchId);
    res.json({ success: true, data: bestTime });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Helper function to get alternative branches
async function getAlternativeBranches(serviceType, city, currentBranchId) {
  const branches = await Branch.find({ 
    serviceType, 
    city, 
    isActive: true,
    branchId: { $ne: currentBranchId }
  }).limit(3);
  
  return branches.map(b => ({
    branchId: b.branchId,
    name: b.name,
    address: b.address,
    phone: b.phone
  }));
}

module.exports = router;