// backend/middleware/security.js
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const hpp = require('hpp');
const { body, validationResult } = require('express-validator');

// Helmet for security headers
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
});

// Rate limiting to prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 1000 : 100000,
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limiter for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: 'Too many login attempts, please try again after 15 minutes',
});

// Parameter pollution protection
const preventParameterPollution = hpp();

// Input validation rules
const validateRegistration = [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
];

const validateToken = [
  body('service').trim().notEmpty().withMessage('Service required'),
  body('branchId').trim().notEmpty().withMessage('Branch required'),
  body('date').isDate().withMessage('Valid date required'),
  body('time').notEmpty().withMessage('Time required'),
];

// Validation result handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      errors: errors.array().map(err => ({ field: err.param, message: err.msg }))
    });
  }
  next();
};

// Session timeout middleware
const sessionTimeout = (req, res, next) => {
  const lastActivity = req.session?.lastActivity;
  const timeout = 30 * 60 * 1000;
  
  if (lastActivity && (Date.now() - lastActivity) > timeout) {
    return res.status(401).json({ success: false, message: 'Session expired, please login again' });
  }
  
  if (req.session) {
    req.session.lastActivity = Date.now();
  }
  next();
};

// Simple audit log middleware
const auditLog = (action) => {
  return async (req, res, next) => {
    const originalJson = res.json;
    res.json = function(data) {
      console.log(`[AUDIT] ${new Date().toISOString()} - User: ${req.user?.email || 'Anonymous'} - Action: ${action} - IP: ${req.ip}`);
      originalJson.call(this, data);
    };
    next();
  };
};

module.exports = {
  securityHeaders,
  limiter,
  authLimiter,
  preventParameterPollution,
  validateRegistration,
  validateLogin,
  validateToken,
  handleValidationErrors,
  sessionTimeout,
  auditLog
};
