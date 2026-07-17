const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

let redis;
let isInMemory = false;

if (process.env.USE_MOCKS === 'true') {
  setupInMemory();
} else {
  console.log(`Connecting to Redis server at ${REDIS_URL}...`);
  redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableOfflineQueue: false, // Prevents queuing commands when offline
    connectTimeout: 2000,
    retryStrategy(times) {
      if (times > 3) {
        console.warn('⚠️ Real Redis connection failed. Falling back to in-memory cache (ioredis-mock)...');
        setupInMemory();
        return null; // Stops attempting to connect to real Redis
      }
      return 500;
    }
  });

  redis.on('error', (err) => {
    if (!isInMemory) {
      console.error('Redis client error:', err.message);
    }
  });

  redis.on('connect', () => {
    if (!isInMemory) {
      console.log('Successfully connected to Redis.');
    }
  });
}

function setupInMemory() {
  if (isInMemory) return;
  console.log('⚠️ Falling back to in-memory Redis (ioredis-mock) cache emulator.');
  isInMemory = true;
  const RedisMock = require('ioredis-mock');
  redis = new RedisMock();
}

module.exports = {
  get client() {
    return redis;
  },
  isInMemory: () => isInMemory,
  
  async set(key, value, ttlSeconds) {
    const strVal = typeof value === 'string' ? value : JSON.stringify(value);
    if (ttlSeconds) {
      await redis.set(key, strVal, 'EX', ttlSeconds);
    } else {
      await redis.set(key, strVal);
    }
  },
  
  async get(key) {
    const val = await redis.get(key);
    if (!val) return null;
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  },
  
  async delete(key) {
    await redis.del(key);
  }
};
