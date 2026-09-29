import { emailQueue } from '../queues/email.queue';
import { getHealthReport, HealthReport } from './health.service';

export interface QueueStats {
  counts: {
    waiting: number;
    delayed: number;
    active: number;
    completed: number;
    failed: number;
  };
  health: HealthReport;
}

export async function getQueueStats(): Promise<QueueStats> {
  const [counts, health] = await Promise.all([
    emailQueue.getJobCounts('waiting', 'delayed', 'active', 'completed', 'failed'),
    getHealthReport(),
  ]);

  return {
    counts: {
      waiting: counts.waiting ?? 0,
      delayed: counts.delayed ?? 0,
      active: counts.active ?? 0,
      completed: counts.completed ?? 0,
      failed: counts.failed ?? 0,
    },
    health,
  };
}
