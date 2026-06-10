// backend/controllers/adminController.js
const Branch = require('../models/Branch');
const BranchToken = require('../models/BranchToken');
const notificationService = require('../services/notificationService');

// Break management (staff lunch/pause)
const startBreak = async (req, res) => {
  try {
    const { branchId, counterNumber, staffId, breakDuration, breakReason } = req.body;
    
    // Mark counter as paused
    await Branch.updateOne(
      { branchId, 'counters.counterNumber': counterNumber },
      { 
        $set: { 
          'counters.$.isActive': false,
          'counters.$.breakUntil': new Date(Date.now() + breakDuration * 60000)
        }
      }
    );
    
    // Add break record
    await BreakLog.create({
      branchId,
      counterNumber,
      staffId,
      breakReason,
      startTime: new Date(),
      expectedEndTime: new Date(Date.now() + breakDuration * 60000)
    });
    
    // Notify waiting customers
    await notifyCustomersOfDelay(branchId, breakDuration);
    
    res.json({ success: true, message: `Break started for ${breakDuration} minutes` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Emergency override (hospital priority)
const emergencyOverride = async (req, res) => {
  try {
    const { branchId, tokenId, emergencyType } = req.body;
    
    const token = await BranchToken.findOne({ tokenNumber: tokenId, branchId });
    
    if (!token) {
      return res.status(404).json({ success: false, message: 'Token not found' });
    }
    
    // Move to front of queue
    await BranchToken.updateMany(
      { branchId, status: 'waiting', position: { $gte: 1 } },
      { $inc: { position: 1 } }
    );
    
    token.position = 1;
    token.isPriority = true;
    token.priorityReason = emergencyType;
    await token.save();
    
    // Notify staff
    const branch = await Branch.findOne({ branchId });
    await notifyStaffOfEmergency(branch, token);
    
    res.json({ success: true, message: `Emergency override applied for ${tokenId}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Auto-reassign skipped tokens
const autoReassignToken = async (req, res) => {
  try {
    const { branchId, tokenId, reason } = req.body;
    
    const token = await BranchToken.findOne({ tokenNumber: tokenId, branchId });
    
    if (!token) {
      return res.status(404).json({ success: false, message: 'Token not found' });
    }
    
    // Skip current token
    token.status = 'skipped';
    token.skipReason = reason;
    token.skippedAt = new Date();
    await token.save();
    
    // Call next token automatically
    const nextToken = await BranchToken.findOneAndUpdate(
      { branchId, status: 'waiting' },
      { status: 'serving' },
      { sort: { position: 1 }, new: true }
    );
    
    if (nextToken) {
      await notificationService.sendTurnAlert(
        { email: nextToken.customerEmail, phone: nextToken.customerPhone },
        nextToken,
        await Branch.findOne({ branchId }),
        1
      );
    }
    
    res.json({ success: true, message: `Token ${tokenId} skipped, next token called` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Counter management
const manageCounter = async (req, res) => {
  try {
    const { branchId, action, counterNumber, staffId } = req.body;
    
    const branch = await Branch.findOne({ branchId });
    
    switch(action) {
      case 'add':
        branch.counters.push({ counterNumber, isActive: true });
        break;
      case 'remove':
        branch.counters = branch.counters.filter(c => c.counterNumber !== counterNumber);
        break;
      case 'activate':
        const counter = branch.counters.find(c => c.counterNumber === counterNumber);
        if (counter) counter.isActive = true;
        break;
      case 'deactivate':
        const counterDeact = branch.counters.find(c => c.counterNumber === counterNumber);
        if (counterDeact) counterDeact.isActive = false;
        break;
    }
    
    await branch.save();
    
    res.json({ success: true, message: `Counter ${action} successful` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper functions
async function notifyCustomersOfDelay(branchId, delayMinutes) {
  const waitingCustomers = await BranchToken.find({ branchId, status: 'waiting' });
  
  for (const customer of waitingCustomers) {
    await notificationService.sendEmail(
      customer.customerEmail,
      'Service Delay Notification',
      'service-delay',
      { customer, delayMinutes }
    );
  }
}

async function notifyStaffOfEmergency(branch, token) {
  // Implementation for staff notification
  console.log(`🚨 EMERGENCY: ${token.tokenNumber} at ${branch.name}`);
}

module.exports = {
  startBreak,
  emergencyOverride,
  autoReassignToken,
  manageCounter
};