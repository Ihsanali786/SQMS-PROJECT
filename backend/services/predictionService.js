// backend/services/predictionService.js
const BranchToken = require('../models/BranchToken');
const Branch = require('../models/Branch');

class PredictionService {
  
  // Calculate average service time per service type
  async getAverageServiceTime(branchId, serviceType) {
    const completedTokens = await BranchToken.find({
      branchId,
      service: serviceType,
      status: 'completed'
    }).limit(50);
    
    if (completedTokens.length === 0) {
      return 5; // Default 5 minutes per customer
    }
    
    const totalTime = completedTokens.reduce((sum, token) => {
      if (token.actualWaitTime) return sum + token.actualWaitTime;
      return sum + 5;
    }, 0);
    
    return Math.ceil(totalTime / completedTokens.length);
  }
  
  // Predict wait time for a new token
  async predictWaitTime(branchId, serviceType, position) {
    const avgServiceTime = await this.getAverageServiceTime(branchId, serviceType);
    const branch = await Branch.findOne({ branchId });
    
    // Base calculation
    let predictedWait = position * avgServiceTime;
    
    // Adjust for peak hours
    const currentHour = new Date().getHours();
    const isPeakHour = await this.isPeakHour(branchId, currentHour);
    if (isPeakHour) {
      predictedWait *= 1.5;
    }
    
    // Adjust for branch load
    const utilization = (await BranchToken.countDocuments({ branchId, status: 'waiting' })) / (branch?.capacity || 50);
    if (utilization > 0.8) {
      predictedWait *= 1.3;
    }
    
    // Service type multiplier
    const multipliers = {
      'Account Opening': 8,
      'Emergency': 10,
      'CNIC Renewal': 7,
      'Default': 5
    };
    const multiplier = multipliers[serviceType] || multipliers.Default;
    predictedWait += multiplier;
    
    return Math.min(Math.max(predictedWait, 5), 120); // Between 5-120 minutes
  }
  
  // Detect peak hours
  async isPeakHour(branchId, hour) {
    const peakHours = await this.getPeakHours(branchId);
    return peakHours.includes(hour);
  }
  
  async getPeakHours(branchId) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const hourlyData = await BranchToken.aggregate([
      { $match: { branchId, createdAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 3 }
    ]);
    
    return hourlyData.map(h => h._id);
  }
  
  // Real-time ETA update
  async updateRealTimeETA(branchId) {
    const waitingTokens = await BranchToken.find({
      branchId,
      status: 'waiting'
    }).sort({ position: 1 });
    
    let cumulativeTime = 0;
    for (let i = 0; i < waitingTokens.length; i++) {
      const token = waitingTokens[i];
      const serviceTime = await this.getAverageServiceTime(branchId, token.service);
      cumulativeTime += serviceTime;
      token.estimatedWaitTime = cumulativeTime;
      await token.save();
    }
  }
  
  // Get optimal branch recommendation
  async getOptimalBranch(serviceType, city) {
    const branches = await Branch.find({ serviceType, city, isActive: true });
    
    const branchLoads = await Promise.all(branches.map(async (branch) => {
      const waitingCount = await BranchToken.countDocuments({
        branchId: branch.branchId,
        status: 'waiting'
      });
      const avgServiceTime = await this.getAverageServiceTime(branch.branchId, serviceType);
      const estimatedWait = waitingCount * avgServiceTime;
      const loadPercent = (waitingCount / branch.capacity) * 100;
      
      return {
        branch,
        waitingCount,
        estimatedWait,
        loadPercent,
        score: estimatedWait
      };
    }));
    
    branchLoads.sort((a, b) => a.score - b.score);
    return branchLoads[0];
  }
}

module.exports = new PredictionService();