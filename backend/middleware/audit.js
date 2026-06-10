// backend/middleware/audit.js
const AuditLog = require('../models/AuditLog');

const logAction = (action, getDetails = null) => {
  return async (req, res, next) => {
    const originalJson = res.json;
    
    res.json = async function(data) {
      try {
        const details = getDetails ? await getDetails(req, data) : {};
        
        await AuditLog.create({
          action,
          userId: req.user?._id,
          userEmail: req.user?.email,
          userRole: req.user?.role,
          branchId: req.params.branchId || req.body.branchId,
          details,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        });
      } catch (error) {
        console.error('Audit log error:', error);
      }
      
      originalJson.call(this, data);
    };
    
    next();
  };
};

// Get audit logs (admin only)
const getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, action, userId, startDate, endDate } = req.query;
    const filter = {};
    
    if (action) filter.action = action;
    if (userId) filter.userId = userId;
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }
    
    const logs = await AuditLog.find(filter)
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await AuditLog.countDocuments(filter);
    
    res.json({
      success: true,
      data: logs,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { logAction, getAuditLogs };