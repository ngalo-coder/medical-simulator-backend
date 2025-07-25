const logger = require('../utils/logger');
const { redisUtils } = require('../config/redis');
const mongoose = require('mongoose');

// Request ID middleware for tracing
const requestId = (req, res, next) => {
  req.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-ID', req.requestId);
  next();
};

// Performance monitoring middleware
const performanceMonitoring = (req, res, next) => {
  const startTime = Date.now();
  const startMemory = process.memoryUsage();

  // Override res.end to capture response metrics
  const originalEnd = res.end;
  res.end = function(...args) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    const endMemory = process.memoryUsage();
    
    // Log performance metrics
    const metrics = {
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration,
      memoryDelta: {
        rss: endMemory.rss - startMemory.rss,
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - startMemory.heapTotal
      },
      timestamp: new Date().toISOString(),
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      user: req.user ? {
        id: req.user._id,
        role: req.user.role
      } : null
    };

    // Store metrics asynchronously
    storePerformanceMetrics(metrics);

    // Log slow requests
    if (duration > 5000) { // 5 seconds
      logger.warn('Slow request detected', metrics);
    }

    // Log high memory usage
    if (metrics.memoryDelta.heapUsed > 50 * 1024 * 1024) { // 50MB
      logger.warn('High memory usage detected', metrics);
    }

    originalEnd.apply(this, args);
  };

  next();
};

// Store performance metrics
const storePerformanceMetrics = async (metrics) => {
  try {
    // Store individual request metrics
    const metricsKey = `metrics:${metrics.requestId}`;
    await redisUtils.set(metricsKey, metrics, 3600); // 1 hour

    // Update aggregated statistics
    const statsKey = 'performance_statistics';
    const stats = await redisUtils.get(statsKey) || {
      totalRequests: 0,
      averageResponseTime: 0,
      slowRequests: 0,
      errorRate: 0,
      byEndpoint: {},
      byStatusCode: {},
      lastUpdated: new Date().toISOString()
    };

    stats.totalRequests++;
    
    // Update average response time
    stats.averageResponseTime = (
      (stats.averageResponseTime * (stats.totalRequests - 1) + metrics.duration) / 
      stats.totalRequests
    );

    // Count slow requests
    if (metrics.duration > 5000) {
      stats.slowRequests++;
    }

    // Update endpoint statistics
    const endpoint = `${metrics.method} ${metrics.url}`;
    if (!stats.byEndpoint[endpoint]) {
      stats.byEndpoint[endpoint] = {
        count: 0,
        averageTime: 0,
        slowCount: 0
      };
    }
    
    const endpointStats = stats.byEndpoint[endpoint];
    endpointStats.count++;
    endpointStats.averageTime = (
      (endpointStats.averageTime * (endpointStats.count - 1) + metrics.duration) / 
      endpointStats.count
    );
    
    if (metrics.duration > 5000) {
      endpointStats.slowCount++;
    }

    // Update status code statistics
    stats.byStatusCode[metrics.statusCode] = (stats.byStatusCode[metrics.statusCode] || 0) + 1;

    // Calculate error rate
    const errorCount = Object.keys(stats.byStatusCode)
      .filter(code => parseInt(code) >= 400)
      .reduce((sum, code) => sum + stats.byStatusCode[code], 0);
    stats.errorRate = (errorCount / stats.totalRequests) * 100;

    stats.lastUpdated = new Date().toISOString();

    await redisUtils.set(statsKey, stats, 86400); // 24 hours

  } catch (error) {
    logger.error('Failed to store performance metrics:', error);
  }
};

// System health monitoring
const systemHealthCheck = async () => {
  const health = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    checks: {},
    metrics: {}
  };

  try {
    // Database health check
    health.checks.database = await checkDatabaseHealth();
    
    // Redis health check
    health.checks.redis = await checkRedisHealth();
    
    // Memory health check
    health.checks.memory = checkMemoryHealth();
    
    // Disk space check (if applicable)
    health.checks.disk = await checkDiskHealth();
    
    // External services check
    health.checks.externalServices = await checkExternalServices();

    // System metrics
    health.metrics = getSystemMetrics();

    // Determine overall health status
    const failedChecks = Object.values(health.checks).filter(check => check.status !== 'healthy');
    if (failedChecks.length > 0) {
      health.status = failedChecks.some(check => check.critical) ? 'unhealthy' : 'degraded';
    }

  } catch (error) {
    logger.error('Health check failed:', error);
    health.status = 'unhealthy';
    health.error = error.message;
  }

  return health;
};

// Database health check
const checkDatabaseHealth = async () => {
  try {
    const start = Date.now();
    await mongoose.connection.db.admin().ping();
    const responseTime = Date.now() - start;

    return {
      status: 'healthy',
      responseTime,
      connection: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      collections: mongoose.connection.collections ? Object.keys(mongoose.connection.collections).length : 0
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      critical: true
    };
  }
};

// Redis health check
const checkRedisHealth = async () => {
  try {
    const start = Date.now();
    await redisUtils.set('health_check', 'ok', 10);
    const value = await redisUtils.get('health_check');
    const responseTime = Date.now() - start;

    if (value === 'ok') {
      return {
        status: 'healthy',
        responseTime
      };
    } else {
      return {
        status: 'unhealthy',
        error: 'Redis ping failed',
        critical: false
      };
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      critical: false
    };
  }
};

// Memory health check
const checkMemoryHealth = () => {
  const memoryUsage = process.memoryUsage();
  const totalMemory = memoryUsage.rss + memoryUsage.external;
  const memoryLimitMB = parseInt(process.env.MEMORY_LIMIT_MB) || 512;
  const memoryLimitBytes = memoryLimitMB * 1024 * 1024;
  
  const memoryUsagePercent = (totalMemory / memoryLimitBytes) * 100;
  
  let status = 'healthy';
  if (memoryUsagePercent > 90) {
    status = 'unhealthy';
  } else if (memoryUsagePercent > 80) {
    status = 'degraded';
  }

  return {
    status,
    usage: {
      rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
      external: Math.round(memoryUsage.external / 1024 / 1024) + 'MB'
    },
    percentage: Math.round(memoryUsagePercent),
    critical: status === 'unhealthy'
  };
};

// Disk health check
const checkDiskHealth = async () => {
  try {
    const fs = require('fs').promises;
    const stats = await fs.stat('.');
    
    return {
      status: 'healthy',
      available: true
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      critical: true
    };
  }
};

// External services health check
const checkExternalServices = async () => {
  const services = {};
  
  // Check email service
  if (process.env.SENDGRID_API_KEY) {
    services.email = {
      status: 'healthy',
      provider: 'SendGrid'
    };
  }

  // Check file storage service
  if (process.env.AWS_ACCESS_KEY_ID) {
    services.fileStorage = {
      status: 'healthy',
      provider: 'AWS S3'
    };
  }

  return services;
};

// Get system metrics
const getSystemMetrics = () => {
  return {
    uptime: Math.floor(process.uptime()),
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    pid: process.pid,
    cpuUsage: process.cpuUsage(),
    memoryUsage: process.memoryUsage(),
    loadAverage: require('os').loadavg(),
    freeMemory: require('os').freemem(),
    totalMemory: require('os').totalmem()
  };
};

// Get performance statistics
const getPerformanceStatistics = async () => {
  try {
    const stats = await redisUtils.get('performance_statistics');
    return stats || {
      totalRequests: 0,
      averageResponseTime: 0,
      slowRequests: 0,
      errorRate: 0,
      byEndpoint: {},
      byStatusCode: {},
      lastUpdated: null
    };
  } catch (error) {
    logger.error('Failed to get performance statistics:', error);
    return null;
  }
};

// Alert system for critical issues
const checkAndSendAlerts = async (health) => {
  try {
    if (health.status === 'unhealthy') {
      const criticalIssues = Object.entries(health.checks)
        .filter(([_, check]) => check.status === 'unhealthy' && check.critical)
        .map(([name, check]) => ({ name, error: check.error }));

      if (criticalIssues.length > 0) {
        logger.error('Critical system issues detected:', {
          issues: criticalIssues,
          timestamp: health.timestamp
        });

        // Send alert to monitoring service
        // await sendCriticalAlert(criticalIssues);
      }
    }
  } catch (error) {
    logger.error('Failed to send alerts:', error);
  }
};

// Cleanup old metrics
const cleanupOldMetrics = async () => {
  try {
    // This would typically be run as a scheduled job
    // Clean up metrics older than 24 hours
    logger.info('Cleaning up old metrics...');
  } catch (error) {
    logger.error('Failed to cleanup old metrics:', error);
  }
};

module.exports = {
  requestId,
  performanceMonitoring,
  systemHealthCheck,
  getPerformanceStatistics,
  checkAndSendAlerts,
  cleanupOldMetrics
};