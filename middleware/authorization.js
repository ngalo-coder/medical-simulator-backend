const User = require('../models/User');
const Case = require('../models/Case');
const Progress = require('../models/Progress');
const Review = require('../models/Review');
const Discussion = require('../models/Discussion');

const getModelFromRequest = (req) => {
  const url = req.originalUrl;
  if (url.includes('/api/cases')) return Case;
  if (url.includes('/api/simulation')) return Progress;
  if (url.includes('/api/reviews')) return Review;
  if (url.includes('/api/discussions')) return Discussion;
  return null;
};

// Role-based authorization
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required', code: 'NO_AUTH' });
    }

    // Super admin bypass
    if (req.user.role === 'admin') {
      return next();
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: roles,
        current: req.user.role
      });
    }

    next();
  };
};

// Resource ownership check
const authorizeOwnership = (resourceParam = 'id', ownerField = 'author') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[resourceParam];
      const Model = getModelFromRequest(req);
      if (!Model) {
        return res.status(500).json({ error: 'Resource model not found' });
      }

      const resource = await Model.findById(resourceId);
      if (!resource) {
        return res.status(404).json({ error: 'Resource not found', code: 'RESOURCE_NOT_FOUND' });
      }

      const ownerId = resource[ownerField]?.toString() || resource[ownerField];
      if (req.user._id.toString() !== ownerId && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied', code: 'ACCESS_DENIED' });
      }

      next();
    } catch (error) {
      logger.error('Authorization error:', error);
      res.status(500).json({ error: 'Authorization check failed', code: 'AUTH_CHECK_ERROR' });
    }
  };
};

module.exports = { authorize, authorizeOwnership };