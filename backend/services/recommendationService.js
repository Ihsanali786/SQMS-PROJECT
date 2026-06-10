// backend/services/recommendationService.js
const Branch = require('../models/Branch');
const BranchToken = require('../models/BranchToken');
const predictionService = require('./predictionService');

class RecommendationService {
  
  // Find best branch for user
  async getBestBranch(serviceType, city, userLocation = null) {
    const branches = await Branch.find({ serviceType, city, isActive: true });
    
    const branchScores = await Promise.all(branches.map(async (branch) => {
      const waitingCount = await BranchToken.countDocuments({
        branchId: branch.branchId,
        status: 'waiting'
      });
      
      const avgWaitTime = await predictionService.predictWaitTime(
        branch.branchId,
        serviceType,
        waitingCount + 1
      );
      
      const loadPercent = (waitingCount / branch.capacity) * 100;
      
      // Calculate score (lower is better)
      let score = avgWaitTime;
      if (loadPercent > 80) score += 20;
      
      return {
        branch,
        waitingCount,
        avgWaitTime,
        loadPercent,
        score,
        recommendation: this.getRecommendationText(loadPercent, avgWaitTime)
      };
    }));
    
    branchScores.sort((a, b) => a.score - b.score);
    
    return {
      bestBranch: branchScores[0],
      alternatives: branchScores.slice(1, 4),
      message: this.generateRecommendationMessage(branchScores[0])
    };
  }
  
  getRecommendationText(loadPercent, waitTime) {
    if (loadPercent < 30 && waitTime < 10) return '🌟 Highly Recommended';
    if (loadPercent < 60 && waitTime < 20) return '✅ Recommended';
    if (loadPercent < 80) return '⚠️ Moderately Busy';
    return '🔴 Very Busy - Consider Alternative';
  }
  
  generateRecommendationMessage(best) {
    if (best.loadPercent < 30 && best.avgWaitTime < 10) {
      return `Good news! ${best.branch.name} has only ${best.waitingCount} people waiting. Estimated wait: ${best.avgWaitTime} minutes.`;
    } else if (best.loadPercent < 60) {
      return `${best.branch.name} has ${best.waitingCount} people ahead. Wait time ~${best.avgWaitTime} minutes.`;
    } else {
      return `${best.branch.name} is busy (${best.waitingCount} waiting). Consider visiting during off-peak hours.`;
    }
  }
  
  // Suggest best time to visit
  async getBestTimeToVisit(branchId) {
    const peakHours = await predictionService.getPeakHours(branchId);
    const allHours = [9, 10, 11, 12, 13, 14, 15, 16, 17];
    const offPeakHours = allHours.filter(h => !peakHours.includes(h));
    
    const hourlyData = await BranchToken.aggregate([
      { $match: { branchId } },
      { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } }
    ]);
    
    const hourMap = {};
    hourlyData.forEach(h => { hourMap[h._id] = h.count; });
    
    const bestTime = offPeakHours.reduce((best, hour) => {
      const count = hourMap[hour] || 0;
      return count < (hourMap[best] || Infinity) ? hour : best;
    }, offPeakHours[0]);
    
    return {
      recommendedHour: `${bestTime}:00 - ${bestTime + 1}:00`,
      peakHours: peakHours.map(h => `${h}:00 - ${h + 1}:00`),
      message: `Visit between ${bestTime}:00 - ${bestTime + 1}:00 for shortest wait times.`
    };
  }
}

module.exports = new RecommendationService();