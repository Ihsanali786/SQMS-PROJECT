// backend/services/intelligenceService.js
const Branch = require('../models/Branch');
const BranchToken = require('../models/BranchToken');

class IntelligenceService {
  
  // Predict wait time based on historical data
  async predictWaitTime(branchId, serviceType, timeSlot) {
    const branch = await Branch.findOne({ branchId });
    if (!branch) return 15;
    
    const hour = parseInt(timeSlot.split(':')[0]);
    const isPeakHour = await this.isPeakHour(branchId, hour);
    
    // Base wait time calculation
    let baseWait = branch.averageWaitTime || 10;
    
    // Adjust for peak hours
    if (isPeakHour) baseWait *= 1.5;
    
    // Adjust for current queue length
    const currentQueue = await BranchToken.countDocuments({ branchId, status: 'waiting' });
    baseWait += currentQueue * 3;
    
    // Service type adjustment
    const serviceMultipliers = {
      'Account Opening': 8,
      'Cash Deposit': 3,
      'CNIC Renewal': 10,
      'Emergency': 15,
      'Admission': 12,
      'Default': 5
    };
    
    const multiplier = serviceMultipliers[serviceType] || serviceMultipliers.Default;
    baseWait += multiplier;
    
    return Math.min(Math.max(baseWait, 5), 120); // Between 5 and 120 minutes
  }
  
  // Detect peak hours
  async isPeakHour(branchId, hour) {
    const peakHours = await this.getPeakHours(branchId);
    return peakHours.includes(hour);
  }
  
  // Get peak hours from historical data
  async getPeakHours(branchId) {
    // Analyze last 7 days of data
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
  
  // Find best branch for user (load balancing)
  async findBestBranch(serviceType, city) {
    const branches = await Branch.find({ serviceType, city, isActive: true });
    
    const branchLoads = await Promise.all(branches.map(async (branch) => {
      const waitingCount = await BranchToken.countDocuments({ 
        branchId: branch.branchId, 
        status: 'waiting' 
      });
      
      const utilization = (waitingCount / branch.capacity) * 100;
      const score = utilization + (waitingCount * 2);
      
      return {
        branch,
        waitingCount,
        utilization,
        score
      };
    }));
    
    // Sort by best score (least loaded first)
    branchLoads.sort((a, b) => a.score - b.score);
    
    return branchLoads[0]?.branch || branches[0];
  }
  
  // Generate daily report with insights
  async generateDailyReport(branchId, date) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    
    const tokens = await BranchToken.find({
      branchId,
      createdAt: { $gte: startDate, $lte: endDate }
    });
    
    const completed = tokens.filter(t => t.status === 'completed');
    const averageWait = completed.reduce((sum, t) => sum + (t.actualWaitTime || 0), 0) / (completed.length || 1);
    
    // Hourly breakdown
    const hourly = {};
    tokens.forEach(token => {
      const hour = new Date(token.createdAt).getHours();
      if (!hourly[hour]) hourly[hour] = { count: 0, waitTime: 0 };
      hourly[hour].count++;
      if (token.actualWaitTime) hourly[hour].waitTime += token.actualWaitTime;
    });
    
    // Peak hour detection
    let peakHour = null;
    let maxCount = 0;
    Object.entries(hourly).forEach(([hour, data]) => {
      if (data.count > maxCount) {
        maxCount = data.count;
        peakHour = hour;
      }
    });
    
    return {
      date,
      totalTokens: tokens.length,
      completed: completed.length,
      cancelled: tokens.filter(t => t.status === 'cancelled').length,
      averageWaitTime: Math.round(averageWait),
      peakHour: peakHour ? `${peakHour}:00 - ${parseInt(peakHour) + 1}:00` : 'N/A',
      recommendations: this.generateRecommendations(tokens, averageWait, peakHour)
    };
  }
  
  // Generate actionable recommendations
  generateRecommendations(tokens, averageWait, peakHour) {
    const recommendations = [];
    
    if (averageWait > 30) {
      recommendations.push({
        type: 'staff',
        message: 'Average wait time is high. Consider adding more staff during peak hours.',
        priority: 'high'
      });
    }
    
    if (peakHour) {
      recommendations.push({
        type: 'scheduling',
        message: `Peak hour detected at ${peakHour}:00. Schedule additional resources for this time.`,
        priority: 'medium'
      });
    }
    
    const completionRate = (tokens.filter(t => t.status === 'completed').length / tokens.length) * 100;
    if (completionRate < 70) {
      recommendations.push({
        type: 'process',
        message: 'Low completion rate. Review service process for efficiency improvements.',
        priority: 'high'
      });
    }
    
    return recommendations;
  }
  
  // Suggest optimal staffing levels
  async suggestStaffing(branchId) {
    const peakHours = await this.getPeakHours(branchId);
    const currentStaff = 4; // Base staff count
    
    let suggestedStaff = currentStaff;
    const now = new Date().getHours();
    
    if (peakHours.includes(now)) {
      suggestedStaff = currentStaff + 2;
    }
    
    const waitingCount = await BranchToken.countDocuments({ branchId, status: 'waiting' });
    if (waitingCount > 15) {
      suggestedStaff = currentStaff + 3;
    }
    
    return {
      currentStaff,
      suggestedStaff,
      peakHours,
      recommendation: suggestedStaff > currentStaff ? 'Add more staff' : 'Staff level adequate'
    };
  }
}

module.exports = new IntelligenceService();