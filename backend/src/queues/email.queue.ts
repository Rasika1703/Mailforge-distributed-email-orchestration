import { Queue } from 'bullmq';
import { createRedisConnection } from '../config/redis';

export const EMAIL_QUEUE_NAME = 'email-send';


const queueConnection = createRedisConnection();

export const emailQueue = new Queue(EMAIL_QUEUE_NAME, {
  connection: queueConnection,
  defaultJobOptions: {
   
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  },
});

export function emailJobId(emailId: string): string {
  return `email-${emailId}`;
}

export interface EmailJobPayload {
  emailId: string;
 
  minDelayMs?: number;
  hourlyLimit?: number;
 
  hourWindow?: number;
  slotAt?: number;
}

export interface AddEmailJobOptions {
  minDelayMs?: number;
  hourlyLimit?: number;
}

export async function addEmailJob(
  emailId: string,
  delayMs: number,
  options: AddEmailJobOptions = {},
): Promise<string> {
  const jobId = emailJobId(emailId);
  const job = await emailQueue.add(
    'send-email',
    { emailId, minDelayMs: options.minDelayMs, hourlyLimit: options.hourlyLimit } satisfies EmailJobPayload,
    {
      jobId,
      delay: Math.max(delayMs, 0),
    },
  );
  return job.id ?? jobId;
}

export interface BulkJobInput {
  emailId: string;
  delayMs: number;
}


export async function addEmailJobsBulk(jobs: BulkJobInput[], options: AddEmailJobOptions = {}): Promise<void> {
  if (jobs.length === 0) return;
  await emailQueue.addBulk(
    jobs.map((j) => ({
      name: 'send-email',
      data: { emailId: j.emailId, minDelayMs: options.minDelayMs, hourlyLimit: options.hourlyLimit } satisfies EmailJobPayload,
      opts: { jobId: emailJobId(j.emailId), delay: Math.max(j.delayMs, 0) },
    })),
  );
}

export async function emailJobExists(emailId: string): Promise<boolean> {
  return (await emailQueue.getJob(emailJobId(emailId))) !== undefined;
}

export async function removeEmailJob(emailId: string): Promise<void> {
  const job = await emailQueue.getJob(emailJobId(emailId));
  if (job) {
    await job.remove();
  }
}
