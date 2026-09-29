import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/config/prisma', () => ({ prisma: {} }));
vi.mock('../src/repositories/email.repository', async () => ({ emailRepository: (await import('./helpers/fakeRepos')).emailRepositoryFake }));

import { db, FakeEmail } from './helpers/fakeRepos';
import { FakeEs, startFakeEs } from './helpers/fakeElasticsearch';
import { indexScheduledBatch, search, syncEmailToSearch } from '../src/services/search.service';
import { indexEmailSafe } from '../src/integrations/elasticsearch.integration';

let es: FakeEs | undefined;

function email(id: string, userId: string, recipient: string, subject: string, status = 'SCHEDULED', body = 'body'): FakeEmail {
  const e: FakeEmail = {
    id, userId, senderId: 's1', recipient, subject, body, status,
    scheduledAt: new Date('2026-10-01T10:00:00Z'), sentAt: null, messageId: null, attempts: 0, jobId: `email-${id}`,
  };
  db.emails.set(id, e);
  return e;
}

beforeEach(async () => {
  if (es) await es.stop();
  es = await startFakeEs();
  db.reset();
  db.senders.set('s1', { id: 's1', userId: 'u1', email: 'sender@example.com' });
});
afterAll(async () => { if (es) await es.stop(); });

describe('indexing', () => {
  it('creates the index once, then upserts documents by email id', async () => {
    email('e1', 'u1', 'john@example.com', 'Welcome');
    await syncEmailToSearch('e1');
    await syncEmailToSearch('e1');
    expect(es!.requests.filter((r) => r.method === 'PUT' && r.url === '/emails')).toHaveLength(1);
    expect(es!.docs.size).toBe(1);
    expect(es!.docs.get('e1')).toMatchObject({ recipient: 'john@example.com', sender: 'sender@example.com', status: 'SCHEDULED', sentAt: null });
  });

  it('updates the indexed document when the email status changes', async () => {
    const e = email('e1', 'u1', 'john@example.com', 'Welcome');
    await syncEmailToSearch('e1');
    e.status = 'SENT';
    e.sentAt = new Date('2026-10-01T10:05:00Z');
    await syncEmailToSearch('e1');
    expect(es!.docs.size).toBe(1);
    expect(es!.docs.get('e1')).toMatchObject({ status: 'SENT', sentAt: '2026-10-01T10:05:00.000Z' });
  });

  it('bulk indexes a scheduled batch', async () => {
    const rows = ['a', 'b', 'c'].map((n) => email(n, 'u1', `${n}@x.com`, 'Hi'));
    await indexScheduledBatch(rows, 'sender@example.com');
    expect(es!.docs.size).toBe(3);
  });
});

describe('search', () => {
  beforeEach(async () => {
    const rows = [
      email('e1', 'u1', 'john@example.com', 'Welcome aboard', 'SENT', 'Thanks for joining'),
      email('e2', 'u1', 'sarah@example.com', 'Invoice ready', 'SCHEDULED', 'Your invoice'),
      email('e3', 'u1', 'alex@example.com', 'Welcome back', 'FAILED'),
      email('other', 'u2', 'john@example.com', 'Welcome aboard', 'SENT'),
    ];
    await indexScheduledBatch(rows, 'sender@example.com');
  });

  const ids = (r: { items: { id: string }[] }) => r.items.map((i) => i.id).sort();

  it('finds by recipient, subject, body and sender', async () => {
    expect(ids(await search({ userId: 'u1', q: 'john', page: 1, pageSize: 10 }))).toEqual(['e1']);
    expect(ids(await search({ userId: 'u1', q: 'invoice', page: 1, pageSize: 10 }))).toEqual(['e2']);
    expect(ids(await search({ userId: 'u1', q: 'joining', page: 1, pageSize: 10 }))).toEqual(['e1']);
    expect(ids(await search({ userId: 'u1', q: 'sender@example.com', page: 1, pageSize: 10 })).length).toBe(3);
  });

  it('filters by status, alone or with a query', async () => {
    expect(ids(await search({ userId: 'u1', status: 'FAILED', page: 1, pageSize: 10 }))).toEqual(['e3']);
    expect(ids(await search({ userId: 'u1', q: 'welcome', status: 'SENT', page: 1, pageSize: 10 }))).toEqual(['e1']);
  });

  it("never returns another user's emails", async () => {
    const mine = await search({ userId: 'u1', q: 'welcome', page: 1, pageSize: 10 });
    expect(ids(mine)).toEqual(['e1', 'e3']);
    const theirs = await search({ userId: 'u2', q: 'welcome', page: 1, pageSize: 10 });
    expect(ids(theirs)).toEqual(['other']);
    const everything = await search({ userId: 'u1', page: 1, pageSize: 50 });
    expect(everything.items.every((i) => (i as any).userId === 'u1')).toBe(true);
  });

  it('paginates with a correct total', async () => {
    const many = Array.from({ length: 25 }, (_, i) => email(`m${i}`, 'u3', `m${i}@x.com`, 'Bulk'));
    await indexScheduledBatch(many, 'sender@example.com');
    const p1 = await search({ userId: 'u3', page: 1, pageSize: 10 });
    const p3 = await search({ userId: 'u3', page: 3, pageSize: 10 });
    expect(p1).toMatchObject({ total: 25, page: 1, pageSize: 10 });
    expect(p1.items).toHaveLength(10);
    expect(p3.items).toHaveLength(5);
    expect(new Set([...p1.items, ...p3.items].map((i) => i.id)).size).toBe(15);
  });
});

describe('when Elasticsearch is unavailable', () => {
  it('indexing never throws, so email sending is unaffected', async () => {
    await es!.stop();
    email('e1', 'u1', 'john@example.com', 'Welcome');
    await expect(syncEmailToSearch('e1')).resolves.toBeUndefined();
    await expect(indexScheduledBatch([db.emails.get('e1')!], 'sender@example.com')).resolves.toBeUndefined();
  });

  it('search fails with a clear 503 instead of fake results', async () => {
    await es!.stop();
    await expect(search({ userId: 'u1', q: 'x', page: 1, pageSize: 10 })).rejects.toMatchObject({
      statusCode: 503, code: 'SEARCH_UNAVAILABLE',
    });
  });

  it('recovers on its own, recreating a wiped index', async () => {
    email('e1', 'u1', 'john@example.com', 'Welcome');
    await syncEmailToSearch('e1');
    await es!.stop();
    await indexEmailSafe({ id: 'x', userId: 'u1', sender: 's', recipient: 'r', subject: 's', body: 'b', status: 'SENT', scheduledAt: '2026-01-01T00:00:00Z', sentAt: null });
    es = await startFakeEs(); // fresh, empty Elasticsearch
    await syncEmailToSearch('e1');
    expect(es.requests.some((r) => r.method === 'PUT' && r.url === '/emails')).toBe(true);
    expect(es.docs.get('e1')).toBeDefined();
  });
});
