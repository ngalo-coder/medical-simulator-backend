const logger = require('../utils/logger');
const { redisUtils } = require('../config/redis');

// Enhanced error handler with detailed logging and metrics
const errorHandler = (err, req, res, next) => {
  const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Determine error status code
  let statusCode = 500;
  let errorCode = 'INTERNAL_ERROR';
  let errorMessage = 'Internal server error';
  let details = null;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    errorMessage = 'Validation failed';
    details = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message,
      value: e.value
    }));
  } else if (err.name === 'CastError') {
    statusCode = 400;
    errorCode = 'INVALID_ID';
    errorMessage = 'Invalid ID format';
    details = { field: err.path, value: err.value };
  } else if (err.code === 11000) {
    statusCode = 409;
    errorCode = 'DUPLICATE_VALUE';
    errorMessage = 'Duplicate field value';
    const field = Object.keys(err.keyValue)[0];
    details = { field, value: err.keyValue[field] };
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = 'INVALID_TOKEN';
    errorMessage = 'Invalid authentication token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = 'TOKEN_EXPIRED';
    errorMessage = 'Authentication token expired';
  } else if (err.name === 'MongoNetworkError') {
    statusCode = 503;
    errorCode = 'DATABASE_ERROR';
    errorMessage = 'Database connection error';
  } else if (err.status) {
    statusCode = err.status;
    errorMessage = err.message;
  }

  // Enhanced error logging
  const errorLog = {
    errorId,
    timestamp: new Date().toISOString(),
    level: statusCode >= 500 ? 'error' : 'warn',
    message: err.message,
    stack: err.stack,
    statusCode,
    errorCode,
    request: {
      method: req.method,
      url: req.originalUrl,
      headers: {
        'user-agent': req.get('User-Agent'),
        'content-type': req.get('Content-Type'),
        'authorization': req.get('Authorization') ? '[REDACTED]' : undefined
      },
      body: sanitizeRequestBody(req.body),
      params: req.params,
      query: req.query,
      ip: req.ip,
      requestId: req.requestId
    },
    user: req.user ? {
      id: req.user._id,
      email: req.user.email,
      role: req.user.role
    } : null
  };

  // Log error based on severity
  if (statusCode >= 500) {
    logger.error('Server error occurred', errorLog);
  } else {
    logger.warn('Client error occurred', errorLog);
  }

  // Store error metrics
  storeErrorMetrics(errorLog);

  // Send error response
  const errorResponse = {
    error: errorMessage,
    code: errorCode,
    errorId,
    timestamp: new Date().toISOString()
  };

  // Add details for client errors (4xx)
  if (statusCode < 500 && details) {
    errorResponse.details = details;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
    errorResponse.originalError = err.message;
  }

  res.status(statusCode).json(errorResponse);
};

// Sanitize request body for logging (remove sensitive data)
const sanitizeRequestBody = (body) => {
  if (!body || typeof body !== 'object') return body;
  
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
};

// Store error metrics in Redis
const storeErrorMetrics = async (errorLog) => {
  try {
    // Store individual error
    const errorKey = `error:${errorLog.errorId}`;
    await redisUtils.set(errorKey, errorLog, 86400); // 24 hours

    // Update error statistics
    const statsKey = 'error_statistics';
    const stats = await redisUtils.get(statsKey) || {
      total: 0,
      byStatusCode: {},
      byErrorCode: {},
      byEndpoint: {},
      last24Hours: 0,
      lastUpdated: new Date().toISOString()
    };

    stats.total++;
    stats.byStatusCode[errorLog.statusCode] = (stats.byStatusCode[errorLog.statusCode] || 0) + 1;
    stats.byErrorCode[errorLog.errorCode] = (stats.byErrorCode[errorLog.errorCode] || 0) + 1;
    
    const endpoint = `${errorLog.request.method} ${errorLog.request.url}`;
    stats.byEndpoint[endpoint] = (stats.byEndpoint[endpoint] || 0) + 1;
    
    stats.lastUpdated = new Date().toISOString();

    await redisUtils.set(statsKey, stats, 86400);

  } catch (error) {
    logger.error('Failed to store error metrics:', error);
  }
};

// Enhanced 404 handler
const notFoundHandler = (req, res, next) => {
  const error = {
    error: 'Route not found',
    code: 'NOT_FOUND',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    suggestion: 'Check the API documentation at /api-docs for available endpoints'
  };

  // Log 404 errors for monitoring
  logger.warn('Route not found', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: req.requestId
  });

  res.status(404).json(error);
};

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Custom error classes
class AppError extends Error {
  constructor(message, statusCode, errorCode = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }
}

// Get error statistics
const getErrorStatistics = async () => {
  try {
    const stats = await redisUtils.get('error_statistics');
    return stats || {
      total: 0,
      byStatusCode: {},
      byErrorCode: {},
      byEndpoint: {},
      last24Hours: 0,
      lastUpdated: null
    };
  } catch (error) {
    logger.error('Failed to get error statistics:', error);
    return null;
  }
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  getErrorStatistics
};
