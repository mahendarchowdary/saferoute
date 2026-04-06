import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Memory fallback for development (no Redis needed)
const memoryStore = new Map<string, { value: string; expires: number }>();

let redisConnected = false;

export const redis = new Redis(redisUrl, {
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  lazyConnect: true, // Don't connect immediately
});

// Try to connect, but don't fail if Redis is not available
redis.connect().then(() => {
  redisConnected = true;
  console.log('✅ Connected to Redis');
}).catch(() => {
  console.log('⚠️  Redis not available, using in-memory store (OK for testing)');
});

redis.on('error', () => {
  redisConnected = false;
});

// Helper to use Redis if available, memory if not
async function storeSet(key: string, value: string, ttlSeconds: number) {
  if (redisConnected) {
    await redis.setex(key, ttlSeconds, value);
  } else {
    memoryStore.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
  }
}

async function storeGet(key: string): Promise<string | null> {
  if (redisConnected) {
    return redis.get(key);
  }
  const item = memoryStore.get(key);
  if (!item) return null;
  if (Date.now() > item.expires) {
    memoryStore.delete(key);
    return null;
  }
  return item.value;
}

async function storeDelete(key: string) {
  if (redisConnected) {
    await redis.del(key);
  } else {
    memoryStore.delete(key);
  }
}

// OTP Store - works with or without Redis
export const otpStore = {
  async set(phone: string, code: string, ttlSeconds: number = 300) {
    await storeSet(`otp:${phone}`, code, ttlSeconds);
  },

  async get(phone: string): Promise<string | null> {
    return storeGet(`otp:${phone}`);
  },

  async delete(phone: string) {
    await storeDelete(`otp:${phone}`);
  },

  async exists(phone: string): Promise<boolean> {
    const val = await storeGet(`otp:${phone}`);
    return val !== null;
  },
};

// Rate Limiting
export const rateLimiter = {
  async isAllowed(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    const current = await redis.incr(`ratelimit:${key}`);
    if (current === 1) {
      await redis.expire(`ratelimit:${key}`, windowSeconds);
    }
    return current <= limit;
  },

  async getRemaining(key: string, limit: number): Promise<number> {
    const current = await redis.get(`ratelimit:${key}`);
    return limit - (parseInt(current || '0', 10));
  },
};

// Session Store for tracking active sessions
export const sessionStore = {
  async setSession(userId: string, sessionId: string, data: any, ttlSeconds: number = 86400) {
    await redis.setex(`session:${userId}:${sessionId}`, ttlSeconds, JSON.stringify(data));
    await redis.sadd(`user:sessions:${userId}`, sessionId);
  },

  async getSession(userId: string, sessionId: string): Promise<any | null> {
    const data = await redis.get(`session:${userId}:${sessionId}`);
    return data ? JSON.parse(data) : null;
  },

  async deleteSession(userId: string, sessionId: string) {
    await redis.del(`session:${userId}:${sessionId}`);
    await redis.srem(`user:sessions:${userId}`, sessionId);
  },

  async getAllSessions(userId: string): Promise<string[]> {
    return redis.smembers(`user:sessions:${userId}`);
  },
};

// Real-time location cache for fast lookups
export const locationCache = {
  async setTripLocation(tripId: string, location: any, ttlSeconds: number = 60) {
    await redis.setex(`location:trip:${tripId}`, ttlSeconds, JSON.stringify(location));
  },

  async getTripLocation(tripId: string): Promise<any | null> {
    const data = await redis.get(`location:trip:${tripId}`);
    return data ? JSON.parse(data) : null;
  },

  async deleteTripLocation(tripId: string) {
    await redis.del(`location:trip:${tripId}`);
  },
};

// Notification queue for FCM/OneSignal
export const notificationQueue = {
  async add(userId: string, notification: any) {
    await redis.lpush(`notifications:${userId}`, JSON.stringify(notification));
    await redis.ltrim(`notifications:${userId}`, 0, 99); // Keep last 100
  },

  async getAll(userId: string): Promise<any[]> {
    const items = await redis.lrange(`notifications:${userId}`, 0, -1);
    return items.map(item => JSON.parse(item));
  },

  async clear(userId: string) {
    await redis.del(`notifications:${userId}`);
  },
};

// Pub/Sub for real-time features
export const pubsub = {
  async publish(channel: string, message: any) {
    await redis.publish(channel, JSON.stringify(message));
  },

  subscribe(channel: string, callback: (message: any) => void) {
    const subscriber = new Redis(redisUrl);
    subscriber.subscribe(channel, (err) => {
      if (err) console.error('Subscribe error:', err);
    });
    subscriber.on('message', (ch, message) => {
      if (ch === channel) {
        callback(JSON.parse(message));
      }
    });
    return subscriber;
  },
};

export default redis;
