import { randomUUID } from 'crypto';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { logger } from '../config/logger';
import { emailRepository } from '../repositories/email.repository';
import { senderRepository } from '../repositories/sender.repository';
import { addEmailJobsBulk, emailJobId } from '../queues/email.queue';
import { indexScheduledBatch } from './search.service';
import { validateAndNormalizeRecipients } from '../utils/recipientValidation';
import { ApiError } from '../middleware/errorHandler';
import { ScheduleEmailInput } from '../validators/email.validator';

export interface ScheduleEmailsResult {
  totalDetected: number;
  scheduled: number;
  invalid: number;
  duplicatesInBatch: number;
  alreadyScheduledOrSent: number;
}

const DB_BATCH_SIZE = 500;

export async function scheduleEmails(
  userId: string,
  input: ScheduleEmailInput,
): Promise<ScheduleEmailsResult> {
  const sender = await senderRepository.findById(input.senderId, userId);
  if (!sender) {
    throw new ApiError('Sender not found or not owned by this user', 404, 'SENDER_NOT_FOUND');
  }

  const { valid, invalid, duplicatesRemoved, totalDetected } = validateAndNormalizeRecipients(
    input.recipients,
  );

  const existing = await emailRepository.findExistingRecipients(userId, valid);
  const toSchedule = valid.filter((r) => !existing.has(r));

  const minDelayMs = input.minDelayMs ?? env.minEmailDelayMs;
  const startTimeMs = input.startTime.getTime();
  const nowMs = Date.now();
  let scheduledCount = 0;

  for (let batchStart = 0; batchStart < toSchedule.length; batchStart += DB_BATCH_SIZE) {
    const batch = toSchedule.slice(batchStart, batchStart + DB_BATCH_SIZE);

    const rows = await prisma.$transaction(
      batch.map((recipient, i) => {
        const index = batchStart + i;
        const scheduledAt = new Date(startTimeMs + index * minDelayMs);
        const id = randomUUID();
        return prisma.email.create({
          data: {
            id,
            userId,
            senderId: input.senderId,
            recipient,
            subject: input.subject,
            body: input.body,
            scheduledAt,
            jobId: emailJobId(id),
          },
        });
      }),
    );


    try {
      await addEmailJobsBulk(
        rows.map((row) => ({ emailId: row.id, delayMs: row.scheduledAt.getTime() - nowMs })),
        { minDelayMs: input.minDelayMs, hourlyLimit: input.hourlyLimit },
      );
    } catch (err) {
      logger.error({ err, count: rows.length }, 'Failed to enqueue BullMQ jobs after DB commit (reconcile will restore)');
    }

    void indexScheduledBatch(rows, sender.email);
    scheduledCount += rows.length;
  }

  logger.info(
    { userId, senderId: input.senderId, scheduled: scheduledCount },
    'JOB_CREATED batch scheduled',
  );

  return {
    totalDetected,
    scheduled: scheduledCount,
    invalid: invalid.length,
    duplicatesInBatch: duplicatesRemoved,
    alreadyScheduledOrSent: existing.size,
  };
}

export function getScheduledEmails(userId: string, page: number, pageSize: number) {
  return Promise.all([
    emailRepository.findScheduled(userId, page, pageSize),
    emailRepository.countScheduled(userId),
  ]).then(([items, total]) => ({ items, total, page, pageSize }));
}

export function getSentEmails(userId: string, page: number, pageSize: number) {
  return Promise.all([
    emailRepository.findSent(userId, page, pageSize),
    emailRepository.countSent(userId),
  ]).then(([items, total]) => ({ items, total, page, pageSize }));
}

export async function getEmailById(userId: string, id: string) {
  const email = await emailRepository.findById(id);
  if (!email || email.userId !== userId) {
    throw new ApiError('Email not found', 404, 'EMAIL_NOT_FOUND');
  }
  return email;
}
