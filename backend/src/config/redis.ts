import IORedis, { Redis } from 'ioredis';
import { env } from './env';

export function createRedisConnection(): Redis {
  if (env.redisUrl.trim()) {
    console.log('Redis: using REDIS_URL');

    return new IORedis(env.redisUrl, {
      maxRetriesPerRequest: null,
    });
  }

  if (env.isProduction) {
    throw new Error(
      'REDIS_URL is missing in production. Configure REDIS_URL in Render Environment Variables.',
    );
  }

  console.log(
    `Redis: using local ${env.redisHost}:${env.redisPort}`,
  );

  return new IORedis({
    host: env.redisHost,
    port: env.redisPort,
    password: env.redisPassword || undefined,
    maxRetriesPerRequest: null,
  });
}

export const redis = createRedisConnection();

redis.on('connect', () => {
  console.log('Redis connected');
});

redis.on('ready', () => {
  console.log('Redis ready');
});

redis.on('error', (error) => {
  console.error('Redis connection error:', error);
});