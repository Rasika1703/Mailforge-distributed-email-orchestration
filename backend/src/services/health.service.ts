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

async function checkDatabase(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (err) {
    logger.error({ err }, 'Database health check failed');
    return false;
  }
}

async function checkRedis(): Promise<boolean> {
  try {
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch (err) {
    logger.error({ err }, 'Redis health check failed');
    return false;
  }
}

async function checkElasticsearch(): Promise<boolean> {
  try {
    const res = await fetch(`${env.elasticsearchUrl}/_cluster/health`);
    return res.ok;
  } catch (err) {
    logger.error({ err }, 'Elasticsearch health check failed');
    return false;
  }
}

async function checkWorker(): Promise<boolean> {
  try {
    const workers = await emailQueue.getWorkers();
    return workers.length > 0;
  } catch (err) {
    logger.error({ err }, 'Worker health check failed');
    return false;
  }
}

export async function getHealthReport(): Promise<HealthReport> {
  const [database, redisOk, elasticsearch, worker] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkElasticsearch(),
    checkWorker(),
  ]);

  const checks = { database, redis: redisOk, elasticsearch, worker };
  const status = Object.values(checks).every(Boolean) ? 'ok' : 'degraded';

  return { status, checks };
}
