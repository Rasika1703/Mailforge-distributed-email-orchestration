import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/config/prisma', () => ({ prisma: {} }));
vi.mock('../src/repositories/email.repository', async () => ({ emailRepository: (await import('./helpers/fakeRepos')).emailRepositoryFake }));

import { db, FakeEmail } from './helpers/fakeRepos';
import { reconcileMissingJobs } from '../src/services/reconcile.service';
import { addEmailJob, emailQueue } from '../src/queues/email.queue';

function row(id: string, status: string, inMs = 3_600_000): FakeEmail {
  const r: FakeEmail = {
    id, userId: 'u1', senderId: 's1', recipient: `${id}@x.com`, subject: 's', body: 'b', status,
    scheduledAt: new Date(Date.now() + inMs), sentAt: null, messageId: null, attempts: 0, jobId: `email-${id}`,
  };
  db.emails.set(id, r);
  return r;
}

beforeEach(async () => {
  db.reset();
  await emailQueue.obliterate({ force: true });
});
afterAll(async () => emailQueue.obliterate({ force: true }));

describe('reconcileMissingJobs', () => {
  it('re-adds only missing jobs and leaves existing delayed jobs untouched', async () => {
    row('a', 'SCHEDULED'); row('b', 'SCHEDULED'); row('c', 'SCHEDULED'); row('d', 'RATE_LIMITED');
    row('done', 'SENT'); row('dead', 'FAILED'); row('busy', 'PROCESSING');
    await addEmailJob('a', 7_200_000); // survived the restart with its own delay

    const restored = await reconcileMissingJobs();

    expect(restored).toBe(3); // b, c, d
    expect((await emailQueue.getJob('email-a'))!.opts.delay).toBe(7_200_000);
    for (const id of ['b', 'c', 'd']) expect(await emailQueue.getJob(`email-${id}`)).toBeDefined();
    for (const id of ['done', 'dead', 'busy']) expect(await emailQueue.getJob(`email-${id}`)).toBeUndefined();
  });

  it('restores a job with a delay that matches the email scheduled time', async () => {
    row('later', 'SCHEDULED', 30 * 60_000);
    await reconcileMissingJobs();
    const delay = (await emailQueue.getJob('email-later'))!.opts.delay!;
    expect(delay).toBeGreaterThan(29 * 60_000);
    expect(delay).toBeLessThanOrEqual(30 * 60_000);
  });

  it('is safe to run repeatedly (worker restarted many times)', async () => {
    row('a', 'SCHEDULED'); row('b', 'SCHEDULED');
    expect(await reconcileMissingJobs()).toBe(2);
    expect(await reconcileMissingJobs()).toBe(0);
    expect(await reconcileMissingJobs()).toBe(0);
    expect(await emailQueue.getJobCounts('delayed')).toEqual({ delayed: 2 });
  });

  it('pages through large tables (1,100 rows, page size 500)', async () => {
    for (let i = 0; i < 1100; i++) row(`id${String(i).padStart(5, '0')}`, 'SCHEDULED');
    expect(await reconcileMissingJobs()).toBe(1100);
    expect((await emailQueue.getJobCounts('delayed')).delayed).toBe(1100);
  });
});
