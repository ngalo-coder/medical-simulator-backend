#!/usr/bin/env node

/**
 * Comprehensive Health Check Script
 * Can be run standalone or as part of monitoring systems
 */

const mongoose = require('mongoose');
const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');
require('dotenv').config();

class HealthChecker {
  constructor() {
    this.checks = [];
    this.results = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      checks: {},
      metrics: {},
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };
  }

  // Add a health check
  addCheck(name, checkFunction, critical = true) {
    this.checks.push({ name, checkFunction, critical });
  }

  // Run all health checks
  async runChecks() {
    console.log('🏥 Starting Medical Case Simulator Health Check...\n');

    for (const check of this.checks) {
      try {
        console.log(`⏳ Checking ${check.name}...`);
        const result = await check.checkFunction();
        
        this.results.checks[check.name] = {
          ...result,
          critical: check.critical,
          timestamp: new Date().toISOString()
        };

        this.results.summary.total++;
        
        if (result.status === 'healthy') {
          this.results.summary.passed++;
          console.log(`✅ ${check.name}: ${result.status}`);
        } else if (result.status === 'warning') {
          this.results.summary.warnings++;
          console.log(`⚠️  ${check.name}: ${result.status} - ${result.message}`);
        } else {
          this.results.summary.failed++;
          console.log(`❌ ${check.name}: ${result.status} - ${result.message}`);
          
          if (check.critical) {
            this.results.status = 'unhealthy';
          } else if (this.results.status === 'healthy') {
            this.results.status = 'degraded';
          }
        }
        
      } catch (error) {
        this.results.checks[check.name] = {
          status: 'error',
          message: error.message,
          critical: check.critical,
          timestamp: new Date().toISOString()
        };
        
        this.results.summary.total++;
        this.results.summary.failed++;
        
        console.log(`💥 ${check.name}: ERROR - ${error.message}`);
        
        if (check.critical) {
          this.results.status = 'unhealthy';
        }
      }
    }

    // Add system metrics
    this.results.metrics = this.getSystemMetrics();

    return this.results;
  }

  // Get system metrics
  getSystemMetrics() {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      uptime: Math.floor(process.uptime()),
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024)
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    };
  }

  // Print summary
  printSummary() {
    console.log('\n📊 Health Check Summary:');
    console.log(`Status: ${this.getStatusEmoji()} ${this.results.status.toUpperCase()}`);
    console.log(`Total Checks: ${this.results.summary.total}`);
    console.log(`Passed: ✅ ${this.results.summary.passed}`);
    console.log(`Warnings: ⚠️  ${this.results.summary.warnings}`);
    console.log(`Failed: ❌ ${this.results.summary.failed}`);
    console.log(`Uptime: ${this.formatUptime(this.results.metrics.uptime)}`);
    console.log(`Memory Usage: ${this.results.metrics.memory.heapUsed}MB / ${this.results.metrics.memory.heapTotal}MB`);
  }

  getStatusEmoji() {
    switch (this.results.status) {
      case 'healthy': return '🟢';
      case 'degraded': return '🟡';
      case 'unhealthy': return '🔴';
      default: return '⚪';
    }
  }

  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }
}

// Individual health check functions
const checkDatabase = async () => {
  try {
    const start = Date.now();
    
    // Connect if not already connected
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
    
    // Ping database
    await mongoose.connection.db.admin().ping();
    const responseTime = Date.now() - start;
    
    // Check connection state
    const connectionState = mongoose.connection.readyState;
    const stateNames = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    
    if (connectionState === 1) {
      return {
        status: responseTime > 1000 ? 'warning' : 'healthy',
        message: responseTime > 1000 ? 'Slow database response' : 'Database connection healthy',
        responseTime,
        connectionState: stateNames[connectionState],
        host: mongoose.connection.host,
        database: mongoose.connection.name
      };
    } else {
      return {
        status: 'unhealthy',
        message: `Database connection state: ${stateNames[connectionState]}`,
        connectionState: stateNames[connectionState]
      };
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `Database connection failed: ${error.message}`,
      error: error.message
    };
  }
};

const checkRedis = async () => {
  try {
    const redisClient = getRedisClient();
    
    if (!redisClient) {
      return {
        status: 'warning',
        message: 'Redis not configured - caching disabled',
        configured: false
      };
    }
    
    const start = Date.now();
    
    // Test Redis connection
    await redisClient.set('health_check', 'ok', 'EX', 10);
    const value = await redisClient.get('health_check');
    const responseTime = Date.now() - start;
    
    if (value === 'ok') {
      return {
        status: responseTime > 500 ? 'warning' : 'healthy',
        message: responseTime > 500 ? 'Slow Redis response' : 'Redis connection healthy',
        responseTime,
        configured: true
      };
    } else {
      return {
        status: 'unhealthy',
        message: 'Redis ping test failed',
        configured: true
      };
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `Redis connection failed: ${error.message}`,
      error: error.message,
      configured: true
    };
  }
};

const checkMemoryUsage = async () => {
  const memoryUsage = process.memoryUsage();
  const totalMemory = memoryUsage.rss;
  const heapUsed = memoryUsage.heapUsed;
  const heapTotal = memoryUsage.heapTotal;
  
  // Memory thresholds (in bytes)
  const memoryLimitMB = parseInt(process.env.MEMORY_LIMIT_MB) || 512;
  const memoryLimitBytes = memoryLimitMB * 1024 * 1024;
  
  const memoryUsagePercent = (totalMemory / memoryLimitBytes) * 100;
  const heapUsagePercent = (heapUsed / heapTotal) * 100;
  
  let status = 'healthy';
  let message = 'Memory usage normal';
  
  if (memoryUsagePercent > 90 || heapUsagePercent > 90) {
    status = 'unhealthy';
    message = 'Critical memory usage';
  } else if (memoryUsagePercent > 80 || heapUsagePercent > 80) {
    status = 'warning';
    message = 'High memory usage';
  }
  
  return {
    status,
    message,
    usage: {
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      heapUsed: Math.round(heapUsed / 1024 / 1024),
      heapTotal: Math.round(heapTotal / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024)
    },
    percentages: {
      total: Math.round(memoryUsagePercent),
      heap: Math.round(heapUsagePercent)
    },
    limits: {
      memoryLimitMB
    }
  };
};

const checkDiskSpace = async () => {
  try {
    const fs = require('fs').promises;
    const stats = await fs.stat('.');
    
    // For more detailed disk space checking, you might want to use a library like 'check-disk-space'
    // For now, we'll just check if we can access the current directory
    
    return {
      status: 'healthy',
      message: 'Disk access normal',
      accessible: true
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `Disk access failed: ${error.message}`,
      accessible: false,
      error: error.message
    };
  }
};

const checkEnvironmentVariables = async () => {
  const requiredVars = [
    'NODE_ENV',
    'MONGODB_URI',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET'
  ];
  
  const missingVars = [];
  const weakSecrets = [];
  
  for (const varName of requiredVars) {
    const value = process.env[varName];
    
    if (!value) {
      missingVars.push(varName);
    } else if (varName.includes('SECRET') && value.length < 32) {
      weakSecrets.push(varName);
    }
  }
  
  if (missingVars.length > 0) {
    return {
      status: 'unhealthy',
      message: `Missing required environment variables: ${missingVars.join(', ')}`,
      missingVars,
      weakSecrets
    };
  }
  
  if (weakSecrets.length > 0) {
    return {
      status: 'warning',
      message: `Weak secrets detected: ${weakSecrets.join(', ')} (should be at least 32 characters)`,
      missingVars: [],
      weakSecrets
    };
  }
  
  return {
    status: 'healthy',
    message: 'All required environment variables present',
    missingVars: [],
    weakSecrets: []
  };
};

const checkExternalServices = async () => {
  const services = {
    email: !!process.env.SENDGRID_API_KEY,
    fileStorage: !!(process.env.AWS_ACCESS_KEY_ID || process.env.CLOUDINARY_CLOUD_NAME),
    monitoring: !!process.env.SENTRY_DSN
  };
  
  const configuredServices = Object.entries(services)
    .filter(([_, configured]) => configured)
    .map(([service, _]) => service);
  
  return {
    status: 'healthy',
    message: `External services configured: ${configuredServices.join(', ') || 'none'}`,
    services,
    configuredCount: configuredServices.length
  };
};

// Main execution
const runHealthCheck = async () => {
  const checker = new HealthChecker();
  
  // Add all health checks
  checker.addCheck('Database Connection', checkDatabase, true);
  checker.addCheck('Redis Cache', checkRedis, false);
  checker.addCheck('Memory Usage', checkMemoryUsage, true);
  checker.addCheck('Disk Space', checkDiskSpace, true);
  checker.addCheck('Environment Variables', checkEnvironmentVariables, true);
  checker.addCheck('External Services', checkExternalServices, false);
  
  // Run all checks
  const results = await checker.runChecks();
  
  // Print summary
  checker.printSummary();
  
  // Close database connection
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
  
  // Exit with appropriate code
  const exitCode = results.status === 'unhealthy' ? 1 : 0;
  
  if (process.argv.includes('--json')) {
    console.log('\n📄 JSON Output:');
    console.log(JSON.stringify(results, null, 2));
  }
  
  if (process.argv.includes('--exit')) {
    process.exit(exitCode);
  }
  
  return results;
};

// Export for use in other modules
module.exports = {
  HealthChecker,
  runHealthCheck,
  checks: {
    checkDatabase,
    checkRedis,
    checkMemoryUsage,
    checkDiskSpace,
    checkEnvironmentVariables,
    checkExternalServices
  }
};

// Run if called directly
if (require.main === module) {
  runHealthCheck().catch(error => {
    console.error('💥 Health check failed:', error);
    process.exit(1);
  });
}