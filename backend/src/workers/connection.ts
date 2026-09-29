import { createRedisConnection } from '../config/redis';

export function createWorkerConnection() {
  return createRedisConnection();
}
