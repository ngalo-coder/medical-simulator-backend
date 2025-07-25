const logger = require('../utils/logger');

// Global error handler
const errorHandler = (err, req, res, next) => {
  logger.error('Unhandled error:', err);

  // Default error response
  const errorResponse = {
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  };

  // Handle specific error types
  if (err.name === 'ValidationError') {
    errorResponse.error = 'Validation error';
    errorResponse.code = 'VALIDATION_ERROR';
    errorResponse.details = Object.values(err.errors).map(e => e.message);
  } else if (err.name === 'CastError') {
    errorResponse.error = 'Invalid ID format';
    errorResponse.code = 'INVALID_ID';
  } else if (err.code === 11000) {
    errorResponse.error = 'Duplicate field value entered';
    errorResponse.code = 'DUPLICATE_VALUE';
  }

  res.status(500).json(errorResponse);
};

// 404 handler
const notFound = (req, res, next) => {
  res.status(404).json({
    error: 'Route not found',
    code: 'NOT_FOUND'
  });
};

module.exports = { errorHandler, notFound };