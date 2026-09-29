import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

process.env.WORKER_CONCURRENCY = '10';

const sends = vi.hoisted(() => [] as { emailId: string; at: number }[]);
const notify = vi.hoisted(() => vi.fn(async () => 'sent'));

vi.mock('../src/config/prisma', async () => ({ prisma: (await import('./helpers/fakeRepos')).prismaFake }));
vi.mock('../src/repositories/email.repository', async () => ({ emailRepository: (await import('./helpers/fakeRepos')).emailRepositoryFake }));
vi.mock('../src/repositories/sender.repository', async () => ({ senderRepository: (await import('./helpers/fakeRepos')).senderRepositoryFake }));
vi.mock('../src/services/search.service', () => ({ indexScheduledBatch: async () => undefined, syncEmailToSearch: async () => undefined }));
vi.mock('../src/services/slack.service', () => ({ notifyRateLimitReached: notify }));
vi.mock('../src/services/reconcile.service', () => ({ reconcileMissingJobs: async () => 0 }));
vi.mock('../src/integrations/ethereal.integration', async () => {
  const { db } = await import('./helpers/fakeRepos');
  return {
    sendEmail: async (_c: unknown, input: { to: string }) => {
      const e = [...db.emails.values()].find((x) => x.recipient === input.to)!;
      sends.push({ emailId: e.id, at: Date.now() });
      return { messageId: `<${e.id}>`, previewUrl: null };
    },
  };
});

import type { Worker } from 'bullmq';
import { db } from './helpers/fakeRepos';
import { redis } from '../src/config/redis';
import { emailQueue } from '../src/queues/email.queue';

const N = 1200;
const HOURLY_LIMIT = 50;
const MIN_DELAY_MS = 30;
const senderId = '22222222-2222-4222-8222-222222222222';
const nextHour = () => (Math.floor(Date.now() / 3_600_000) + 1) * 3_600_000;

let worker: Worker;

async function waitFor(cond: () => boolean | Promise<boolean>, ms = 60_000) {
  const start = Date.now();
  while (!(await cond())) {
    if (Date.now() - start > ms) throw new Error('waitFor timed out');
    await new Promise((r) => setTimeout(r, 100));
  }
}
const countStatus = (s: string) => [...db.emails.values()].filter((e) => e.status === s).length;

beforeAll(async () => {
  db.reset();
  db.senders.set(senderId, { id: senderId, userId: 'u1', email: 'load@example.com' });
  await emailQueue.obliterate({ force: true });
});

afterAll(async () => {
  await worker?.close();
  await emailQueue.obliterate({ force: true });
  const keys = [...(await redis.keys('email-rate:*')), ...(await redis.keys('email-delay:*'))];
  if (keys.length) await redis.del(...keys);
});

describe(`load: ${N} emails, hourly limit ${HOURLY_LIMIT}, concurrency 10`, () => {
  it('queues, persists, rate limits, spaces sends, and drains window by window', async () => {
    const heapBefore = process.memoryUsage().heapUsed;
    const { scheduleEmails } = await import('../src/services/email.service');

    // 1. Schedule through the real service: .
    const recipients = Array.from({ length: N }, (_, i) => `lead${i}@example.com`);
    const t0 = Date.now();
    const result = await scheduleEmails('u1', {
      senderId, subject: 'Load', body: '<p>hi</p>', recipients,
      startTime: new Date(Date.now() + 1500), minDelayMs: MIN_DELAY_MS, hourlyLimit: HOURLY_LIMIT,
    });
    const scheduleMs = Date.now() - t0;
    expect(result.scheduled).toBe(N);

    // 2. Persisted in Redis with no worker alive, one job per email, no duplicates.
    const jobs = await emailQueue.getJobs(['delayed'], 0, -1);
    expect(jobs).toHaveLength(N);
    expect(new Set(jobs.map((j) => j.id)).size).toBe(N);
    expect(sends).toHaveLength(0);

   
    expect((await scheduleEmails('u1', {
      senderId, subject: 'Load', body: 'x', recipients, startTime: new Date(Date.now() + 1500),
    })).scheduled).toBe(0);
    expect((await emailQueue.getJobCounts('delayed')).delayed).toBe(N);

    // 3. Now start the worker 
    const { startEmailWorker } = await import('../src/workers/email.worker');
    worker = startEmailWorker();
    await waitFor(() => countStatus('SENT') === HOURLY_LIMIT && countStatus('RATE_LIMITED') === N - HOURLY_LIMIT);

    expect(sends).toHaveLength(HOURLY_LIMIT);
    expect(new Set(sends.map((s) => s.emailId)).size).toBe(HOURLY_LIMIT); // nobody sent twice

    const times = sends.map((s) => s.at).sort((a, b) => a - b);
    const gaps = times.slice(1).map((t, i) => t - times[i]);
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(MIN_DELAY_MS - 8);

    
    const limited = [...db.emails.values()].filter((e) => e.status === 'RATE_LIMITED');
    expect(limited.every((e) => e.scheduledAt.getTime() === nextHour())).toBe(true);
    expect(countStatus('FAILED')).toBe(0);
    const counts = await emailQueue.getJobCounts('delayed', 'waiting', 'active', 'completed', 'failed');
    expect(counts).toMatchObject({ delayed: N - HOURLY_LIMIT, waiting: 0, active: 0, failed: 0 });
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ senderId, limit: HOURLY_LIMIT }));

   
    expect(db.maxInFlight).toBeGreaterThan(1);
    expect(db.maxInFlight).toBeLessThanOrEqual(10);

    // 4. The next hour opens (fresh counter) and the parked jobs become due.
    await redis.del(`email-rate:${senderId}:${Math.floor(Date.now() / 3_600_000)}`);
    for (const job of await emailQueue.getJobs(['delayed'], 0, -1)) await job.promote();
    await waitFor(() => countStatus('SENT') === 2 * HOURLY_LIMIT && countStatus('RATE_LIMITED') === N - 2 * HOURLY_LIMIT);

    expect(new Set(sends.map((s) => s.emailId)).size).toBe(2 * HOURLY_LIMIT);
    expect(sends).toHaveLength(2 * HOURLY_LIMIT);
    expect((await emailQueue.getJobCounts('delayed')).delayed).toBe(N - 2 * HOURLY_LIMIT);

    const heapMb = Math.round((process.memoryUsage().heapUsed - heapBefore) / 1e6);
    console.log(
      `LOAD RESULT: scheduled ${N} in ${scheduleMs}ms (${db.transactions} DB transactions) | window 1 sent ${HOURLY_LIMIT}, ` +
      `min gap ${Math.min(...gaps)}ms | max in-flight ${db.maxInFlight}/10 | window 2 sent ${HOURLY_LIMIT} more, ` +
      `${N - 2 * HOURLY_LIMIT} still parked | heap growth ${heapMb}MB | duplicate sends 0`,
    );
    expect(heapMb).toBeLessThan(200);
  }, 120_000);
});
