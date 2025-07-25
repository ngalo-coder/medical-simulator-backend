// config/redis.js
const redis = require('ioredis');
const logger = require('../utils/logger');

let redisClient = null;

const connectRedis = () => {
  if (!process.env.REDIS_URL) {
    logger.warn('Redis URL not configured, skipping Redis connection');
    return null;
  }

  try {
    const options = {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000
    };

    // Parse Redis URL if password is included
    if (process.env.REDIS_PASSWORD) {
      options.password = process.env.REDIS_PASSWORD;
    }

    redisClient = new redis(process.env.REDIS_URL, options);

    redisClient.on('connect', () => {
      logger.info('✅ Redis connected successfully');
    });

    redisClient.on('error', (err) => {
      logger.error('❌ Redis connection error:', err);
    });

    redisClient.on('close', () => {
      logger.warn('🔌 Redis connection closed');
    });

    redisClient.on('reconnecting', () => {
      logger.info('🔄 Redis reconnecting...');
    });

    return redisClient;
  } catch (error) {
    logger.error('Failed to create Redis client:', error);
    return null;
  }
};

const getRedisClient = () => {
  if (!redisClient) {
    redisClient = connectRedis();
  }
  return redisClient;
};

// Redis utility functions
const redisUtils = {
  // Set key with expiration
  async set(key, value, expireInSeconds = 3600) {
    const client = getRedisClient();
    if (!client) return false;
    
    try {
      await client.setex(key, expireInSeconds, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error('Redis set error:', error);
      return false;
    }
  },

  // Get key
  async get(key) {
    const client = getRedisClient();
    if (!client) return null;
    
    try {
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis get error:', error);
      return null;
    }
  },

  // Delete key
  async del(key) {
    const client = getRedisClient();
    if (!client) return false;
    
    try {
      await client.del(key);
      return true;
    } catch (error) {
      logger.error('Redis delete error:', error);
      return false;
    }
  },

  // Check if key exists
  async exists(key) {
    const client = getRedisClient();
    if (!client) return false;
    
    try {
      const exists = await client.exists(key);
      return exists === 1;
    } catch (error) {
      logger.error('Redis exists error:', error);
      return false;
    }
  },

  // Increment counter
  async incr(key, expireInSeconds = 3600) {
    const client = getRedisClient();
    if (!client) return 0;
    
    try {
      const value = await client.incr(key);
      if (value === 1) {
        await client.expire(key, expireInSeconds);
      }
      return value;
    } catch (error) {
      logger.error('Redis increment error:', error);
      return 0;
    }
  },

  // Add to set
  async sadd(key, value, expireInSeconds = 3600) {
    const client = getRedisClient();
    if (!client) return false;
    
    try {
      await client.sadd(key, value);
      await client.expire(key, expireInSeconds);
      return true;
    } catch (error) {
      logger.error('Redis sadd error:', error);
      return false;
    }
  },

  // Get set members
  async smembers(key) {
    const client = getRedisClient();
    if (!client) return [];
    
    try {
      return await client.smembers(key);
    } catch (error) {
      logger.error('Redis smembers error:', error);
      return [];
    }
  }
};

module.exports = {
  connectRedis,
  getRedisClient,
  redisUtils
};