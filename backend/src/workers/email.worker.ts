import { DelayedError, Job, Worker } from 'bullmq';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { createWorkerConnection } from './connection';
import { EMAIL_QUEUE_NAME, EmailJobPayload } from '../queues/email.queue';
import { emailRepository } from '../repositories/email.repository';
import { senderRepository } from '../repositories/sender.repository';
import { sendEmail } from '../integrations/ethereal.integration';
import {
  acquireSendSlot,
  hourWindow,
  rescheduleTimeForRateLimited,
  reserveHourlySlot,
} from '../services/rateLimiter.service';
import { syncEmailToSearch } from '../services/search.service';
import { reconcileMissingJobs } from '../services/reconcile.service';
import { notifyRateLimitReached } from '../services/slack.service';


class NonRetryableSkip extends Error {}

async function processEmailJob(job: Job<EmailJobPayload>, token?: string): Promise<void> {
  const { emailId } = job.data;

  const email = await emailRepository.findById(emailId);
  if (!email) {
    throw new NonRetryableSkip(`No email row for id ${emailId}`);
  }

  if (email.status === 'SENT') {
    logger.info({ emailId }, 'EMAIL_SEND_SKIPPED already sent (idempotency guard)');
    return;
  }

  const claimed = await emailRepository.claimForProcessing(emailId);
  if (!claimed) {
    logger.info({ emailId, jobId: job.id }, 'EMAIL_SEND_SKIPPED not claimed (in-flight or already handled elsewhere)');
    return;
  }

  const sender = await senderRepository.findByIdWithCredentials(email.senderId);
  if (!sender) {
    throw new NonRetryableSkip(`No sender row for id ${email.senderId}`);
  }

  const minDelayMs = job.data.minDelayMs ?? env.minEmailDelayMs;
  const maxPerHour = job.data.hourlyLimit ?? env.maxEmailsPerHour;
  const now = Date.now();
  const window = hourWindow(now);

 
  const holdsPermit = job.data.hourWindow === window && job.data.slotAt !== undefined;
  let waitMs: number;

  if (holdsPermit) {
    const early = job.data.slotAt! - now;
    waitMs = early > 0 ? early : await acquireSendSlot(sender.id, minDelayMs, true);
  } else {
    
    const reservation = await reserveHourlySlot(sender.id, maxPerHour, now);
    if (!reservation.allowed) {
      const nextAt = rescheduleTimeForRateLimited(now);
      await emailRepository.markRateLimited(emailId, new Date(nextAt));
      if (job.data.slotAt !== undefined || job.data.hourWindow !== undefined) {
        await job.updateData({ ...job.data, slotAt: undefined, hourWindow: undefined });
      }
      await job.moveToDelayed(nextAt, token);
      logger.warn(
        { emailId, senderId: sender.id, limit: maxPerHour, nextAttemptAt: new Date(nextAt).toISOString() },
        'RATE_LIMIT_REACHED email pushed to next window',
      );
      void syncEmailToSearch(emailId);
      void notifyRateLimitReached({
        userId: email.userId,
        senderId: sender.id,
        senderEmail: sender.email,
        limit: maxPerHour,
        nextWindowStartMs: nextAt,
      });
      throw new DelayedError();
    }
    waitMs = await acquireSendSlot(sender.id, minDelayMs, false);
  }

  
  if (waitMs > 0) {
  
    const slotAt = now + waitMs + 2;
    await job.updateData({ ...job.data, hourWindow: window, slotAt });
    await emailRepository.revertToScheduled(emailId);
    await job.moveToDelayed(slotAt, token);
    logger.info({ emailId, senderId: sender.id, waitMs }, 'EMAIL_RESCHEDULED waiting for sender delay slot');
    throw new DelayedError();
  }

  if (job.data.slotAt !== undefined || job.data.hourWindow !== undefined) {
    await job.updateData({ ...job.data, slotAt: undefined, hourWindow: undefined });
  }

  logger.info({ emailId, jobId: job.id }, 'EMAIL_PROCESSING');

  try {
    const result = await sendEmail(
      {
        smtpHost: sender.smtpHost,
        smtpPort: sender.smtpPort,
        smtpUser: sender.smtpUser,
        smtpPassword: sender.smtpPassword,
      },
      {
        fromEmail: sender.email,
        to: email.recipient,
        subject: email.subject,
        body: email.body,
      },
    );

    await emailRepository.updateStatus(email.id, 'SENT', {
      sentAt: new Date(),
      messageId: result.messageId,
    });
    logger.info({ emailId, messageId: result.messageId }, 'EMAIL_SENT');
    void syncEmailToSearch(emailId);
  } catch (err) {
    await emailRepository.incrementAttempts(email.id);
    await emailRepository.revertToScheduled(email.id);
    logger.error({ err, emailId, attempt: job.attemptsMade + 1 }, 'EMAIL_SEND_FAILED attempt');
    throw err;
  }
}

export function startEmailWorker(): Worker<EmailJobPayload> {
  const worker = new Worker<EmailJobPayload>(EMAIL_QUEUE_NAME, processEmailJob, {
    connection: createWorkerConnection(),
    concurrency: env.workerConcurrency,
  });

  worker.on('completed', (job) => {
    logger.debug({ jobId: job.id }, 'Job completed');
  });

  worker.on('failed', async (job, err) => {
    if (!job) return;

    if (err instanceof NonRetryableSkip) {
      logger.warn({ jobId: job.id, reason: err.message }, 'Job skipped (non-retryable)');
      return;
    }

    const isFinalAttempt = job.attemptsMade >= (job.opts.attempts ?? 1);
    if (isFinalAttempt) {
      const { emailId } = job.data;
      await emailRepository.updateStatus(emailId, 'FAILED').catch((updateErr) => {
        logger.error({ updateErr, emailId }, 'Failed to persist terminal FAILED status');
      });
      void syncEmailToSearch(emailId);
      logger.error({ jobId: job.id, emailId }, 'EMAIL_FAILED terminally, all retries exhausted');
    }
  });

  worker.on('error', (err) => {
    logger.error({ err }, 'Worker-level error (process continues)');
  });

  return worker;
}

function runStandalone(): void {
  const worker = startEmailWorker();
  logger.info({ concurrency: env.workerConcurrency }, 'Email worker started');

  reconcileMissingJobs().catch((err) => {
    logger.error({ err }, 'Startup reconciliation failed (worker keeps running)');
  });

  const shutdown = (signal: string): void => {
    logger.info({ signal }, 'Worker shutting down gracefully');
    worker.close().then(() => process.exit(0));
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}


if (require.main === module) {
  runStandalone();
}
