const { isValidServiceType } = require('../services/queueEngine');

/**
 * Admins may manage all service types unless managedServiceTypes is set on their user profile.
 */
const assertServiceAccess = (req, res, next) => {
  const serviceType = req.params.serviceType;
  if (!isValidServiceType(serviceType)) {
    return res.status(400).json({ success: false, message: 'Invalid serviceType' });
  }

  const allowed = req.user?.managedServiceTypes;
  if (Array.isArray(allowed) && allowed.length > 0 && !allowed.includes(serviceType)) {
    return res.status(403).json({
      success: false,
      message: `You are not authorized to manage the ${serviceType} queue`
    });
  }

  return next();
};

module.exports = { assertServiceAccess };
