import { prisma } from '../config/prisma';
import { redis } from '../config/redis';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { emailQueue } from '../queues/email.queue';

export interface HealthReport {
  status: 'ok' | 'degraded';

  checks: {
    database: boolean;
    redis: boolean;
    elasticsearch: boolean;
    worker: boolean;
  };
}

/**
 * Check PostgreSQL / Prisma
 */
async function checkDatabase(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return true;
  } catch (err) {
    logger.error(
      {
        err,
      },
      'Database health check failed',
    );

    return false;
  }
}

/**
 * Check Redis
 */
async function checkRedis(): Promise<boolean> {
  try {
    const pong = await redis.ping();

    return pong === 'PONG';
  } catch (err) {
    logger.error(
      {
        err,
      },
      'Redis health check failed',
    );

    return false;
  }
}

/**
 * Check Elasticsearch
 *
 * Elasticsearch is optional.
 *
 * If ELASTICSEARCH_URL is empty/not configured,
 * we consider the check healthy because Elasticsearch
 * is intentionally disabled.
 */
async function checkElasticsearch(): Promise<boolean> {
  // IMPORTANT:
  // Never call fetch('') because Node will throw:
  // ERR_INVALID_URL
  if (!env.elasticsearchUrl) {
    logger.debug(
      'Elasticsearch is not configured; skipping health check',
    );

    return true;
  }

  try {
    const url = `${env.elasticsearchUrl}/_cluster/health`;

    const res = await fetch(url);

    if (!res.ok) {
      logger.warn(
        {
          statusCode: res.status,
        },
        'Elasticsearch health check returned non-OK status',
      );

      return false;
    }

    return true;
  } catch (err) {
    logger.warn(
      {
        err: (err as Error).message,
      },
      'Elasticsearch health check failed',
    );

    return false;
  }
}

/**
 * Check email worker / queue
 */
async function checkWorker(): Promise<boolean> {
  try {
    /*
     * We use the queue itself as the worker infrastructure check.
     * If the queue connection is available, this confirms that
     * the backend can communicate with Redis/BullMQ.
     */
    await emailQueue.getJobCounts();

    return true;
  } catch (err) {
    logger.error(
      {
        err,
      },
      'Worker health check failed',
    );

    return false;
  }
}

/**
 * Main health check
 */
export async function getHealthReport(): Promise<HealthReport> {
  const [
    database,
    redisStatus,
    elasticsearch,
    worker,
  ] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkElasticsearch(),
    checkWorker(),
  ]);

  const status =
    database &&
    redisStatus &&
    elasticsearch &&
    worker
      ? 'ok'
      : 'degraded';

  return {
    status,

    checks: {
      database,
      redis: redisStatus,
      elasticsearch,
      worker,
    },
  };
}
