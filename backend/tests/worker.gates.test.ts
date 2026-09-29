import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

interface FakeEmail {
  id: string;
  userId: string;
  senderId: string;
  recipient: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: Date;
  attempts: number;
}



const db = vi.hoisted(() => ({
  emails: new Map<string, any>(),
  sends: [] as { emailId: string; senderId: string; at: number }[],
  notify: vi.fn(async () => 'sent'),
}));

vi.mock('../src/repositories/email.repository', () => ({
  emailRepository: {
    findById: async (id: string) => db.emails.get(id) ?? null,
    claimForProcessing: async (id: string) => {
      const e = db.emails.get(id);
      if (e && (e.status === 'SCHEDULED' || e.status === 'RATE_LIMITED')) {
        e.status = 'PROCESSING';
        return true;
      }
      return false;
    },
    revertToScheduled: async (id: string) => {
      const e = db.emails.get(id);
      if (e?.status === 'PROCESSING') e.status = 'SCHEDULED';
    },
    markRateLimited: async (id: string, at: Date) => {
      const e = db.emails.get(id);
      if (e?.status === 'PROCESSING') {
        e.status = 'RATE_LIMITED';
        e.scheduledAt = at;
      }
    },
    updateStatus: async (id: string, status: string) => {
      db.emails.get(id).status = status;
    },
    incrementAttempts: async (id: string) => {
      db.emails.get(id).attempts += 1;
    },
  },
}));
vi.mock('../src/repositories/sender.repository', () => ({
  senderRepository: {
    findByIdWithCredentials: async (id: string) => ({
      id,
      email: `${id}@example.com`,
      smtpHost: 'h',
      smtpPort: 1,
      smtpUser: 'u',
      smtpPassword: 'p',
    }),
  },
}));
vi.mock('../src/integrations/ethereal.integration', () => ({
  sendEmail: async (creds: unknown, input: { to: string; fromEmail: string }) => {
    const e = [...db.emails.values()].find((x) => x.recipient === input.to);
    db.sends.push({ emailId: e.id, senderId: e.senderId, at: Date.now() });
    return { messageId: `<${e.id}>`, previewUrl: null };
  },
}));
vi.mock('../src/services/search.service', () => ({ syncEmailToSearch: async () => undefined }));
vi.mock('../src/services/slack.service', () => ({ notifyRateLimitReached: db.notify }));
vi.mock('../src/services/reconcile.service', () => ({ reconcileMissingJobs: async () => 0 }));

import type { Worker } from 'bullmq';
import { startEmailWorker } from '../src/workers/email.worker';
import { addEmailJob, emailQueue } from '../src/queues/email.queue';
import { redis } from '../src/config/redis';

let worker: Worker;
let counter = 0;

function seed(senderId: string, n: number): string[] {
  const ids: string[] = [];
  for (let i = 0; i < n; i++) {
    const id = `t${++counter}`;
    db.emails.set(id, {
      id, userId: 'u1', senderId, recipient: `${id}@target.com`, subject: 's', body: 'b',
      status: 'SCHEDULED', scheduledAt: new Date(), attempts: 0,
    } satisfies FakeEmail);
    ids.push(id);
  }
  return ids;
}

async function waitFor(cond: () => boolean | Promise<boolean>, ms = 15000): Promise<void> {
  const start = Date.now();
  while (!(await cond())) {
    if (Date.now() - start > ms) throw new Error('waitFor timed out');
    await new Promise((r) => setTimeout(r, 50));
  }
}

beforeAll(async () => {
  await emailQueue.obliterate({ force: true });
  worker = startEmailWorker();
  await worker.waitUntilReady();
});

beforeEach(() => {
  db.sends.length = 0;
});

afterAll(async () => {
  await worker.close();
  await emailQueue.obliterate({ force: true });
  const keys = await redis.keys('email-delay:*');
  const rate = await redis.keys('email-rate:*');
  if (keys.length + rate.length) await redis.del(...keys, ...rate);
});

describe('worker health signal', () => {
  it('a running worker is visible in Redis, which is what /api/health reports', async () => {
    expect((await emailQueue.getWorkers()).length).toBeGreaterThan(0);
  });
});

describe('delay gate', () => {
  it('spaces sends for one sender by minDelayMs even with 5 concurrent workers', async () => {
    const ids = seed('senderA', 4);
    for (const id of ids) await addEmailJob(id, 0, { minDelayMs: 400, hourlyLimit: 100 });

    await waitFor(() => db.sends.length === 4);
    const times = db.sends.map((s) => s.at).sort((a, b) => a - b);
    const gaps = times.slice(1).map((t, i) => t - times[i]);
    console.log('sender A send gaps (ms):', gaps);
    expect(gaps.every((g) => g >= 380)).toBe(true);
    expect(ids.every((id) => db.emails.get(id).status === 'SENT')).toBe(true);
  });

  it('does not delay different senders against each other', async () => {
    const b = seed('senderB', 2);
    const c = seed('senderC', 2);
    for (const id of [...b, ...c]) await addEmailJob(id, 0, { minDelayMs: 1500, hourlyLimit: 100 });

    await waitFor(() => db.sends.length === 4);
    const firstB = db.sends.find((s) => s.senderId === 'senderB')!.at;
    const firstC = db.sends.find((s) => s.senderId === 'senderC')!.at;
    console.log('first-send offset between senders (ms):', Math.abs(firstB - firstC));
    expect(Math.abs(firstB - firstC)).toBeLessThan(700);
  });

  it('a job that woke from its delay slot does not reserve a second slot', async () => {
    const [id] = seed('senderS', 1);
    const [id2] = seed('senderS', 1);
    await addEmailJob(id, 0, { minDelayMs: 600, hourlyLimit: 100 });
    await addEmailJob(id2, 0, { minDelayMs: 600, hourlyLimit: 100 });
    await waitFor(() => db.sends.length === 2);
    const gap = db.sends[1].at - db.sends[0].at;
    console.log('gap with one waiting job (ms):', gap);
    
    expect(gap).toBeGreaterThanOrEqual(580);
    expect(gap).toBeLessThan(1000);
  });
});

describe('hourly gate', () => {
  it('sends up to the cap, then pushes the rest to the next window without dropping them', async () => {
    const ids = seed('senderD', 4);
    for (const id of ids) await addEmailJob(id, 0, { minDelayMs: 0, hourlyLimit: 2 });

    await waitFor(() => ids.filter((id) => db.emails.get(id).status === 'RATE_LIMITED').length === 2);
    expect(db.sends.filter((s) => s.senderId === 'senderD')).toHaveLength(2);

    const limited = ids.filter((id) => db.emails.get(id).status === 'RATE_LIMITED');
    const nextHour = (Math.floor(Date.now() / 3600000) + 1) * 3600000;
    for (const id of limited) {
      expect(db.emails.get(id).scheduledAt.getTime()).toBe(nextHour);
      const job = await emailQueue.getJob(`email-${id}`);
      expect(await job!.getState()).toBe('delayed');
      expect(job!.data.slotAt).toBeUndefined();
    }
    expect(db.notify).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', senderId: 'senderD', senderEmail: 'senderD@example.com', limit: 2, nextWindowStartMs: nextHour }),
    );
    const counter = await redis.get(`email-rate:senderD:${Math.floor(Date.now() / 3600000)}`);
    expect(counter).toBe('2');

    for (const id of limited) await (await emailQueue.getJob(`email-${id}`))!.promote();
    await new Promise((r) => setTimeout(r, 800));
    expect(db.sends.filter((s) => s.senderId === 'senderD')).toHaveLength(2);
    for (const id of limited) {
      expect(await (await emailQueue.getJob(`email-${id}`))!.getState()).toBe('delayed');
    }

    await redis.del(`email-rate:senderD:${Math.floor(Date.now() / 3600000)}`);
    for (const id of limited) await (await emailQueue.getJob(`email-${id}`))!.promote();
    await waitFor(() => db.sends.filter((s) => s.senderId === 'senderD').length === 4);
    expect(ids.every((id) => db.emails.get(id).status === 'SENT')).toBe(true);
  });
});
