import Redis from 'ioredis';
import { config } from '../config.js';

let redis = null;

export async function connectRedis() {
  if (redis) return redis;
  redis = new Redis(config.redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 3) return null;
      return Math.min(times * 200, 2000);
    },
  });
  return redis;
}

export function getRedis() {
  return redis;
}
