import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/config/prisma', async () => ({ prisma: (await import('./helpers/fakeRepos')).prismaFake }));
vi.mock('../src/repositories/email.repository', async () => ({ emailRepository: (await import('./helpers/fakeRepos')).emailRepositoryFake }));
vi.mock('../src/repositories/sender.repository', async () => ({ senderRepository: (await import('./helpers/fakeRepos')).senderRepositoryFake }));
vi.mock('../src/services/search.service', () => ({ indexScheduledBatch: async () => undefined }));

import { db } from './helpers/fakeRepos';
import { scheduleEmails } from '../src/services/email.service';
import { scheduleEmailSchema } from '../src/validators/email.validator';
import { validateAndNormalizeRecipients } from '../src/utils/recipientValidation';
import { emailQueue } from '../src/queues/email.queue';

const base = { subject: 'Hello', body: '<p>Hi</p>' };
const senderId = '11111111-1111-4111-8111-111111111111';

beforeEach(async () => {
  db.reset();
  db.senders.set(senderId, { id: senderId, userId: 'u1', email: 'sender@example.com' });
  await emailQueue.obliterate({ force: true });
});

afterAll(async () => {
  await emailQueue.obliterate({ force: true });
});

const input = (recipients: string[], extra: object = {}) =>
  ({ ...base, senderId, recipients, startTime: new Date(Date.now() + 600_000), ...extra }) as Parameters<typeof scheduleEmails>[1];

describe('scheduleEmails', () => {
  it('creates a row and a delayed BullMQ job per recipient, staggered by the delay', async () => {
    const start = new Date(Date.now() + 10 * 60_000);
    const result = await scheduleEmails('u1', input(['a@x.com', 'b@x.com', 'c@x.com'], { startTime: start, minDelayMs: 2000, hourlyLimit: 30 }));
    expect(result).toMatchObject({ totalDetected: 3, scheduled: 3, invalid: 0, duplicatesInBatch: 0 });

    const rows = [...db.emails.values()].sort((a, b) => a.recipient.localeCompare(b.recipient));
    expect(rows.map((r) => r.scheduledAt.getTime() - start.getTime())).toEqual([0, 2000, 4000]);
    for (const row of rows) {
      const job = await emailQueue.getJob(row.jobId);
      expect(row.jobId).toBe(`email-${row.id}`);
      expect(await job!.getState()).toBe('delayed'); // future scheduling: not run now
      expect(job!.data).toMatchObject({ emailId: row.id, minDelayMs: 2000, hourlyLimit: 30 });
      expect(job!.opts.delay).toBeGreaterThan(9 * 60_000);
    }
  });

  it('normalises, drops invalid addresses and in-batch duplicates', async () => {
    const result = await scheduleEmails('u1', input(['John@X.com', ' john@x.com ', 'nope', 'bad@', 'ok@x.com']));
    expect(result).toMatchObject({ totalDetected: 5, scheduled: 2, invalid: 2, duplicatesInBatch: 1 });
    expect([...db.emails.values()].map((e) => e.recipient).sort()).toEqual(['john@x.com', 'ok@x.com']);
  });

  it('does not schedule the same recipient twice across requests', async () => {
    await scheduleEmails('u1', input(['a@x.com', 'b@x.com']));
    const second = await scheduleEmails('u1', input(['a@x.com', 'c@x.com']));
    expect(second).toMatchObject({ scheduled: 1, alreadyScheduledOrSent: 1 });
    expect(db.emails.size).toBe(3);
    expect(await emailQueue.getJobCounts('delayed')).toEqual({ delayed: 3 });
  });

  it('rejects a sender that belongs to another user', async () => {
    await expect(scheduleEmails('someone-else', input(['a@x.com']))).rejects.toMatchObject({ statusCode: 404, code: 'SENDER_NOT_FOUND' });
    expect(db.emails.size).toBe(0);
  });

  it('bulk schedules 1,200 recipients in bounded transactions with one job each', async () => {
    const recipients = Array.from({ length: 1200 }, (_, i) => `lead${i}@x.com`);
    const result = await scheduleEmails('u1', input(recipients, { minDelayMs: 0 }));
    expect(result.scheduled).toBe(1200);
    expect(db.transactions).toBe(3); // 500 + 500 + 200
    expect((await emailQueue.getJobCounts('delayed')).delayed).toBe(1200);
    const jobs = await emailQueue.getJobs(['delayed'], 0, -1);
    expect(new Set(jobs.map((j) => j.id)).size).toBe(1200);
  });
});

describe('request validation', () => {
  const valid = { ...base, senderId, recipients: ['a@x.com'], startTime: new Date(Date.now() + 60_000).toISOString() };

  it('accepts a valid payload and coerces the date', () => {
    expect(scheduleEmailSchema.parse(valid).startTime).toBeInstanceOf(Date);
  });

  it.each([
    ['missing subject', { subject: '' }],
    ['missing body', { body: '  ' }],
    ['non-uuid sender', { senderId: 'abc' }],
    ['no recipients', { recipients: [] }],
    ['start time in the past', { startTime: new Date(Date.now() - 3_600_000).toISOString() }],
    ['negative delay', { minDelayMs: -1 }],
    ['zero hourly limit', { hourlyLimit: 0 }],
  ])('rejects %s', (_name, patch) => {
    expect(scheduleEmailSchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  });

  it('recipient validation reports counts the UI needs', () => {
    expect(validateAndNormalizeRecipients(['a@x.com', 'A@x.com', 'bad', ''])).toMatchObject({
      valid: ['a@x.com'], invalid: ['bad'], duplicatesRemoved: 1,
    });
  });
});
