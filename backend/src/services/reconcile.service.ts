import { emailRepository } from '../repositories/email.repository';
import { addEmailJob, emailJobExists } from '../queues/email.queue';
import { logger } from '../config/logger';

const PAGE_SIZE = 500;


export async function reconcileMissingJobs(): Promise<number> {
  let cursor = '';
  let restored = 0;

  for (;;) {
    const rows = await emailRepository.findPendingAfter(cursor, PAGE_SIZE);
    if (rows.length === 0) break;

    const existence = await Promise.all(rows.map((r) => emailJobExists(r.id)));
    for (let i = 0; i < rows.length; i++) {
      if (existence[i]) continue;
      const delayMs = Math.max(rows[i].scheduledAt.getTime() - Date.now(), 0);
      await addEmailJob(rows[i].id, delayMs);
      restored += 1;
    }

    cursor = rows[rows.length - 1].id;
  }

  if (restored > 0) {
    logger.warn({ restored }, 'RECONCILE restored missing BullMQ jobs');
  } else {
    logger.info('RECONCILE no missing jobs');
  }
  return restored;
}
