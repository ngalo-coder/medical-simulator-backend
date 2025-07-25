const morgan = require('morgan');
const logger = require('../utils/logger');

// Custom morgan format for production
const productionFormat = JSON.stringify({
  method: ':method',
  url: ':url',
  status: ':status',
  responseTime: ':response-time',
  userAgent: ':user-agent',
  ip: ':remote-addr',
  date: ':date[iso]'
});

// Custom morgan format for development
const developmentFormat = ':method :url :status :response-time ms - :res[content-length]';

// Morgan middleware configuration
const httpLogger = morgan(process.env.NODE_ENV === 'production' ? productionFormat : developmentFormat, {
  stream: {
    write: (message) => {
      if (process.env.NODE_ENV === 'production') {
        try {
          const logData = JSON.parse(message.trim());
          logger.info('HTTP Request', logData);
        } catch (err) {
          logger.info(message.trim());
        }
      } else {
        logger.info(message.trim());
      }
    }
  },
  skip: (req, res) => {
    // Skip logging for health checks and static files
    return req.url === '/health' ||
           req.url.startsWith('/static') ||
           req.url.startsWith('/favicon.ico');
  }
});

module.exports = httpLogger;