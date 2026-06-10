// backend/config/redis.js
const redis = require('redis');

let redisClient = null;
let isRedisAvailable = false;

const connectRedis = async () => {
  try {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 3000,
        reconnectStrategy: false
      }
    });
    
    redisClient.on('error', (err) => {
      if (isRedisAvailable) {
        console.log('⚠️ Redis connection lost');
        isRedisAvailable = false;
      }
    });
    
    await redisClient.connect();
    isRedisAvailable = true;
    console.log('✅ Redis connected (caching enabled)');
    return redisClient;
  } catch (error) {
    console.log('⚠️ Redis not available - running without cache');
    console.log('   💡 To enable caching, install Redis from: https://redis.io/download');
    isRedisAvailable = false;
    redisClient = null;
    return null;
  }
};

const cacheQueueData = async (branchId, data, ttl = 30) => {
  if (!isRedisAvailable || !redisClient) return;
  try {
    await redisClient.setEx(`queue:${branchId}`, ttl, JSON.stringify(data));
  } catch (error) {
    // Silently fail
  }
};

const getCachedQueue = async (branchId) => {
  if (!isRedisAvailable || !redisClient) return null;
  try {
    const data = await redisClient.get(`queue:${branchId}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    return null;
  }
};

const invalidateQueueCache = async (branchId) => {
  if (!isRedisAvailable || !redisClient) return;
  try {
    await redisClient.del(`queue:${branchId}`);
  } catch (error) {
    // Silently fail
  }
};

const isRedisReady = () => isRedisAvailable && redisClient?.isReady;

module.exports = { 
  connectRedis, 
  cacheQueueData, 
  getCachedQueue, 
  invalidateQueueCache,
  isRedisReady
};