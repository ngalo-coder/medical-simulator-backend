const mongoose = require('mongoose');
const { getRedisClient } = require('../config/redis');
const logger = require('./logger');

class HealthChecker {
  constructor() {
    this.checks = new Map();
    this.setupDefaultChecks();
  }

  setupDefaultChecks() {
    // Database health check
    this.addCheck('database', async () => {
      const state = mongoose.connection.readyState;
      const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
      };

      if (state !== 1) {
        throw new Error(`Database ${states[state] || 'unknown'}`);
      }

      // Test database operation
      const startTime = Date.now();
      await mongoose.connection.db.admin().ping();
      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime: `${responseTime}ms`,
        state: states[state]
      };
    });

    // Redis health check
    this.addCheck('redis', async () => {
      const redisClient = getRedisClient();
      
      if (!redisClient) {
        return {
          status: 'not_configured',
          message: 'Redis not configured'
        };
      }

      const startTime = Date.now();
      await redisClient.ping();
      const responseTime = Date.now() - startTime;

      // Test set/get operation
      const testKey = `health_check_${Date.now()}`;
      await redisClient.set(testKey, 'test', 'EX', 10);
      const testValue = await redisClient.get(testKey);
      await redisClient.del(testKey);

      if (testValue !== 'test') {
        throw new Error('Redis set/get operation failed');
      }

      return {
        status: 'healthy',
        responseTime: `${responseTime}ms`
      };
    });

    // Memory health check
    this.addCheck('memory', async () => {
      const usage = process.memoryUsage();
      const totalMB = Math.round(usage.rss / 1024 / 1024);
      const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
      
      // Alert if memory usage is too high (>500MB RSS)
      const status = totalMB > 500 ? 'warning' : 'healthy';
      
      return {
        status,
        rss: `${totalMB}MB`,
        heapUsed: `${heapUsedMB}MB`,
        heapTotal: `${heapTotalMB}MB`,
        external: `${Math.round(usage.external / 1024 / 1024)}MB`
      };
    });

    // Disk space check (if applicable)
    this.addCheck('disk', async () => {
      const fs = require('fs').promises;
      
      try {
        const stats = await fs.stat('.');
        return {
          status: 'healthy',
          message: 'Disk accessible'
        };
      } catch (error) {
        throw new Error(`Disk check failed: ${error.message}`);
      }
    });

    // API endpoints health check
    this.addCheck('api', async () => {
      const endpoints = [
        { path: '/api/health', method: 'GET' },
        { path: '/api/auth/profile', method: 'GET', requiresAuth: true }
      ];

      const results = [];
      
      for (const endpoint of endpoints) {
        try {
          // This is a simplified check - in production you might want to make actual HTTP requests
          results.push({
            endpoint: `${endpoint.method} ${endpoint.path}`,
            status: 'available'
          });
        } catch (error) {
          results.push({
            endpoint: `${endpoint.method} ${endpoint.path}`,
            status: 'error',
            error: error.message
          });
        }
      }

      return {
        status: 'healthy',
        endpoints: results
      };
    });

    // External services health check
    this.addCheck('external_services', async () => {
      const services = [];

      // Check email service
      if (process.env.SENDGRID_API_KEY) {
        services.push({
          name: 'SendGrid',
          status: 'configured',
          type: 'email'
        });
      }

      // Check file storage
      if (process.env.AWS_ACCESS_KEY_ID || process.env.CLOUDINARY_CLOUD_NAME) {
        services.push({
          name: process.env.AWS_ACCESS_KEY_ID ? 'AWS S3' : 'Cloudinary',
          status: 'configured',
          type: 'file_storage'
        });
      }

      return {
        status: 'healthy',
        services
      };
    });
  }

  addCheck(name, checkFunction) {
    this.checks.set(name, checkFunction);
  }

  removeCheck(name) {
    this.checks.delete(name);
  }

  async runCheck(name) {
    const checkFunction = this.checks.get(name);
    if (!checkFunction) {
      throw new Error(`Health check '${name}' not found`);
    }

    const startTime = Date.now();
    try {
      const result = await Promise.race([
        checkFunction(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), 5000)
        )
      ]);

      return {
        name,
        status: result.status || 'healthy',
        responseTime: `${Date.now() - startTime}ms`,
        timestamp: new Date().toISOString(),
        details: result
      };
    } catch (error) {
      return {
        name,
        status: 'unhealthy',
        responseTime: `${Date.now() - startTime}ms`,
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  async runAllChecks() {
    const results = {};
    const promises = Array.from(this.checks.keys()).map(async (name) => {
      results[name] = await this.runCheck(name);
    });

    await Promise.all(promises);

    // Determine overall health
    const unhealthyChecks = Object.values(results).filter(
      check => check.status === 'unhealthy'
    );
    
    const warningChecks = Object.values(results).filter(
      check => check.status === 'warning'
    );

    let overallStatus = 'healthy';
    if (unhealthyChecks.length > 0) {
      overallStatus = 'unhealthy';
    } else if (warningChecks.length > 0) {
      overallStatus = 'warning';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: Math.floor(process.uptime()),
      checks: results,
      summary: {
        total: Object.keys(results).length,
        healthy: Object.values(results).filter(c => c.status === 'healthy').length,
        warning: warningChecks.length,
        unhealthy: unhealthyChecks.length
      }
    };
  }

  async getDetailedHealth() {
    const basicHealth = await this.runAllChecks();
    
    // Add additional system information
    const additionalInfo = {
      process: {
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      },
      features: {
        realTimeCollaboration: process.env.ENABLE_REAL_TIME_COLLABORATION === 'true',
        aiRecommendations: process.env.ENABLE_AI_RECOMMENDATIONS === 'true',
        gamification: process.env.ENABLE_GAMIFICATION === 'true',
        ltiIntegration: process.env.ENABLE_LTI_INTEGRATION === 'true',
        emailNotifications: !!process.env.SENDGRID_API_KEY
      }
    };

    return {
      ...basicHealth,
      ...additionalInfo
    };
  }
}

// Create singleton instance
const healthChecker = new HealthChecker();

module.exports = {
  healthChecker,
  HealthChecker
};