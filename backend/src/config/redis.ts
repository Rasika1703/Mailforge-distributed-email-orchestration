import IORedis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

export function createRedisConnection(): IORedis {
  const connection = new IORedis({
    host: env.redisHost,
    port: env.redisPort,
    password: env.redisPassword || undefined,
    maxRetriesPerRequest: null,
  });

  connection.on('error', (err) => {
    logger.error({ err }, 'Redis connection error');
  });

  return connection;
}

export const redis = createRedisConnection();
