const rateLimit = require('express-rate-limit');
const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');
const { RateLimitError } = require('./errorHandler');

// Create Redis store for rate limiting (if Redis is available)
const createRedisStore = () => {
  // Skip Redis store in test environment
  if (process.env.NODE_ENV === 'test') {
    return undefined;
  }
  
  try {
    const redisClient = getRedisClient();
    if (redisClient) {
      // Try to import RedisStore, fall back to memory store if not available
      try {
        const RedisStore = require('rate-limit-redis');
        return new RedisStore({
          sendCommand: (...args) => redisClient.call(...args),
        });
      } catch (redisStoreError) {
        logger.warn('rate-limit-redis not available, using memory store');
        return undefined;
      }
    }
  } catch (error) {
    logger.warn('Redis not available for rate limiting, using memory store');
  }
  return undefined; // Fall back to memory store
};

// Enhanced rate limit handler
const rateLimitHandler = (req, res, next) => {
  const error = new RateLimitError('Too many requests, please try again later');
  
  // Log rate limit violations
  logger.warn('Rate limit exceeded', {
    ip: req.ip,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    user: req.user ? {
      id: req.user._id,
      email: req.user.email,
      role: req.user.role
    } : null,
    timestamp: new Date().toISOString()
  });

  // Send rate limit headers
  res.set({
    'Retry-After': Math.round(req.rateLimit.resetTime / 1000) || 60,
    'X-RateLimit-Limit': req.rateLimit.limit,
    'X-RateLimit-Remaining': req.rateLimit.remaining,
    'X-RateLimit-Reset': new Date(req.rateLimit.resetTime)
  });

  next(error);
};

// Skip rate limiting for certain conditions
const skipRateLimit = (req, res) => {
  // Skip for health checks
  if (req.path === '/health' || req.path === '/api/health') {
    return true;
  }
  
  // Skip for admin users in development
  if (process.env.NODE_ENV === 'development' && req.user?.role === 'admin') {
    return true;
  }
  
  // Skip for internal requests (if applicable)
  if (req.headers['x-internal-request'] === 'true') {
    return true;
  }
  
  return false;
};

// Key generator for rate limiting with IPv6 support
const keyGenerator = (req, res) => {
  // Use user ID if authenticated, otherwise use IP
  if (req.user) {
    return `user:${req.user._id}`;
  }
  
  // Handle IPv6 addresses properly
  let ip = req.ip;
  if (ip && ip.includes(':')) {
    // IPv6 address - use a hash or truncated version
    ip = ip.replace(/:/g, '_');
  }
  
  return `ip:${ip}`;
};

// General rate limiter
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Too many requests from this IP, please try again later',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore(),
  keyGenerator,
  skip: skipRateLimit,
  handler: rateLimitHandler
});

// Strict rate limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 5,
  message: {
    error: 'Too many authentication attempts, please try again later',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore(),
  keyGenerator: (req) => `auth:${req.ip}`,
  skip: skipRateLimit,
  handler: rateLimitHandler,
  skipSuccessfulRequests: true // Don't count successful requests
});

// Case creation rate limiter
const caseCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: parseInt(process.env.CASE_CREATION_LIMIT_MAX) || 10,
  message: {
    error: 'Too many cases created, please try again later',
    code: 'CASE_CREATION_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore(),
  keyGenerator: (req) => `case_creation:${req.user?._id || req.ip}`,
  skip: (req) => skipRateLimit(req) || req.user?.role === 'admin',
  handler: rateLimitHandler
});

// File upload rate limiter
const fileUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 file uploads per hour
  message: {
    error: 'Too many file uploads, please try again later',
    code: 'FILE_UPLOAD_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore(),
  keyGenerator: (req) => `file_upload:${req.user?._id || req.ip}`,
  skip: skipRateLimit,
  handler: rateLimitHandler
});

// API endpoint specific rate limiter
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: {
    error: 'API rate limit exceeded, please slow down',
    code: 'API_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore(),
  keyGenerator,
  skip: skipRateLimit,
  handler: rateLimitHandler
});

// Simulation rate limiter (prevent rapid simulation starts)
const simulationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 simulation starts per 5 minutes
  message: {
    error: 'Too many simulation attempts, please wait before starting another',
    code: 'SIMULATION_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore(),
  keyGenerator: (req) => `simulation:${req.user?._id || req.ip}`,
  skip: skipRateLimit,
  handler: rateLimitHandler
});

// Discussion posting rate limiter
const discussionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 posts per minute
  message: {
    error: 'Too many discussion posts, please slow down',
    code: 'DISCUSSION_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore(),
  keyGenerator: (req) => `discussion:${req.user?._id || req.ip}`,
  skip: skipRateLimit,
  handler: rateLimitHandler
});

// Password reset rate limiter
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 password reset attempts per hour
  message: {
    error: 'Too many password reset attempts, please try again later',
    code: 'PASSWORD_RESET_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore(),
  keyGenerator: (req) => `password_reset:${req.ip}`,
  skip: skipRateLimit,
  handler: rateLimitHandler
});

// Dynamic rate limiter based on user role
const createRoleBasedLimiter = (limits) => {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: (req) => {
      const userRole = req.user?.role || 'anonymous';
      return limits[userRole] || limits.default || 100;
    },
    message: {
      error: 'Rate limit exceeded for your user role',
      code: 'ROLE_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: createRedisStore(),
    keyGenerator,
    skip: skipRateLimit,
    handler: rateLimitHandler
  });
};

// Get rate limit statistics
const getRateLimitStats = async () => {
  try {
    const redisClient = getRedisClient();
    if (!redisClient) {
      return { error: 'Redis not available for rate limit statistics' };
    }

    // Get all rate limit keys
    const keys = await redisClient.keys('rl:*');
    const stats = {
      totalKeys: keys.length,
      activeUsers: 0,
      activeIPs: 0,
      byType: {}
    };

    for (const key of keys) {
      const parts = key.split(':');
      if (parts.length >= 3) {
        const type = parts[1];
        const identifier = parts[2];
        
        if (!stats.byType[type]) {
          stats.byType[type] = 0;
        }
        stats.byType[type]++;
        
        if (identifier.startsWith('user:')) {
          stats.activeUsers++;
        } else if (identifier.startsWith('ip:')) {
          stats.activeIPs++;
        }
      }
    }

    return stats;
  } catch (error) {
    logger.error('Failed to get rate limit statistics:', error);
    return { error: 'Failed to retrieve rate limit statistics' };
  }
};

module.exports = {
  generalLimiter,
  authLimiter,
  caseCreationLimiter,
  fileUploadLimiter,
  apiLimiter,
  simulationLimiter,
  discussionLimiter,
  passwordResetLimiter,
  createRoleBasedLimiter,
  getRateLimitStats
};