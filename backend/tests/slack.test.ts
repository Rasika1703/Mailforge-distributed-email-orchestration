import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import http from 'http';
import type { AddressInfo } from 'net';
import type { Server } from 'http';

const store = vi.hoisted(() => ({ connections: new Map<string, any>() }));

vi.mock('../src/config/prisma', () => ({ prisma: {} }));
vi.mock('../src/repositories/user.repository', () => ({
  userRepository: {
    upsertFromGoogle: async (p: { name: string; email: string }) => ({ id: 'user-1', name: p.name, email: p.email, avatar: null }),
    findById: async () => ({ id: 'user-1', name: 'Ada', email: 'ada@example.com', avatar: null }),
  },
}));
vi.mock('../src/repositories/slack.repository', () => ({
  slackRepository: {
    findByUserId: async (userId: string) => store.connections.get(userId) ?? null,
    upsert: async (d: any) => { store.connections.set(d.userId, { ...d }); },
    delete: async (userId: string) => { store.connections.delete(userId); },
  },
}));
vi.mock('../src/repositories/email.repository', () => ({
  emailRepository: { countPendingForSender: async () => 37 },
}));
vi.mock('../src/integrations/google.integration', async (importActual) => ({
  ...(await importActual<typeof import('../src/integrations/google.integration')>()),
  exchangeCodeForProfile: async () => ({ googleId: 'g1', email: 'ada@example.com', name: 'Ada' }),
}));

import { createApp } from '../src/app';
import * as slackService from '../src/services/slack.service';
import { redis } from '../src/config/redis';

const TOKEN = 'xoxb-secret-token';
interface SlackCall { method: string; auth?: string; body: any }
const calls: SlackCall[] = [];
let postMode: 'ok' | 'not_in_channel' | 'token_revoked' | 'server_error' = 'ok';
let slack: Server;
let appServer: Server;
let base: string;

beforeAll(async () => {
  slack = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const method = req.url!.slice(1);
      const isJson = (req.headers['content-type'] ?? '').includes('json');
      const body = isJson ? JSON.parse(raw || '{}') : Object.fromEntries(new URLSearchParams(raw));
      calls.push({ method, auth: req.headers.authorization, body });
      res.setHeader('content-type', 'application/json');
      if (method === 'oauth.v2.access') {
        return res.end(JSON.stringify({ ok: true, access_token: TOKEN, team: { id: 'T1' }, incoming_webhook: { channel_id: 'C123' } }));
      }
      if (method === 'chat.postMessage') {
        if (postMode === 'server_error') { res.statusCode = 500; return res.end('{"ok":false,"error":"internal_error"}'); }
        if (postMode === 'token_revoked') return res.end('{"ok":false,"error":"token_revoked"}');
        if (postMode === 'not_in_channel') { postMode = 'ok'; return res.end('{"ok":false,"error":"not_in_channel"}'); }
      }
      res.end('{"ok":true}');
    });
  });
  await new Promise<void>((r) => slack.listen(4599, '127.0.0.1', r));
  appServer = createApp().listen(0);
  await new Promise((r) => appServer.once('listening', r));
  base = `http://127.0.0.1:${(appServer.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise((r) => appServer.close(r));
  await new Promise((r) => slack.close(r));
});

beforeEach(async () => {
  calls.length = 0;
  postMode = 'ok';
  store.connections.clear();
  const keys = await redis.keys('slack-alert:*');
  if (keys.length) await redis.del(...keys);
});

const cookieOf = (res: Response) => res.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');

async function login(): Promise<string> {
  const start = await fetch(`${base}/api/auth/google`, { redirect: 'manual' });
  const state = new URL(start.headers.get('location')!).searchParams.get('state');
  const cb = await fetch(`${base}/api/auth/google/callback?code=x&state=${state}`, { redirect: 'manual', headers: { cookie: cookieOf(start) } });
  return cookieOf(cb);
}

async function connectSlack(cookie: string): Promise<{ cookie: string; state: string }> {
  const res = await fetch(`${base}/api/slack/connect`, { redirect: 'manual', headers: { cookie } });
  const state = new URL(res.headers.get('location')!).searchParams.get('state')!;
  return { cookie: cookieOf(res) || cookie, state };
}

describe('Slack OAuth', () => {
  it('redirects to Slack with client id, scopes, redirect uri and state', async () => {
    const cookie = await login();
    const res = await fetch(`${base}/api/slack/connect`, { redirect: 'manual', headers: { cookie } });
    const url = new URL(res.headers.get('location')!);
    expect(url.origin + url.pathname).toBe('https://slack.com/oauth/v2/authorize');
    expect(url.searchParams.get('client_id')).toBe('slack-client-id');
    expect(url.searchParams.get('scope')).toContain('chat:write');
    expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:4000/api/slack/callback');
    expect(url.searchParams.get('state')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('sends visitors without a session to the login page', async () => {
    const res = await fetch(`${base}/api/slack/connect`, { redirect: 'manual' });
    expect(res.headers.get('location')).toBe('http://localhost:5173/login?error=session_expired');
  });

  it('rejects a callback with the wrong state and stores nothing', async () => {
    const cookie = await login();
    const { cookie: c2 } = await connectSlack(cookie);
    const res = await fetch(`${base}/api/slack/callback?code=abc&state=${'0'.repeat(64)}`, { redirect: 'manual', headers: { cookie: c2 } });
    expect(res.headers.get('location')).toBe('http://localhost:5173/slack?status=error&reason=invalid_state');
    expect(store.connections.size).toBe(0);
    expect(calls.some((c) => c.method === 'oauth.v2.access')).toBe(false);
  });

  it('connects: stores the token encrypted, and status never exposes it', async () => {
    const cookie = await login();
    const { cookie: c2, state } = await connectSlack(cookie);
    const res = await fetch(`${base}/api/slack/callback?code=good&state=${state}`, { redirect: 'manual', headers: { cookie: c2 } });
    expect(res.headers.get('location')).toBe('http://localhost:5173/slack?status=connected');

    const saved = store.connections.get('user-1');
    expect(saved.accessToken).not.toContain(TOKEN);
    expect(saved.accessToken.startsWith('v1:')).toBe(true);
    expect(saved).toMatchObject({ teamId: 'T1', channelId: 'C123' });

    const raw = await (await fetch(`${base}/api/slack/status`, { headers: { cookie: c2 } })).text();
    expect(JSON.parse(raw).data).toEqual({ connected: true, teamId: 'T1', channelId: 'C123' });
    expect(raw).not.toContain('xoxb');
    expect(raw).not.toContain('v1:');
  });

  it('reconnect replaces the existing connection', async () => {
    const cookie = await login();
    for (let i = 0; i < 2; i++) {
      const { cookie: c2, state } = await connectSlack(cookie);
      await fetch(`${base}/api/slack/callback?code=good&state=${state}`, { redirect: 'manual', headers: { cookie: c2 } });
    }
    expect(store.connections.size).toBe(1);
  });

  it('disconnect revokes the token at Slack and removes the connection', async () => {
    const cookie = await login();
    const { cookie: c2, state } = await connectSlack(cookie);
    await fetch(`${base}/api/slack/callback?code=good&state=${state}`, { redirect: 'manual', headers: { cookie: c2 } });
    calls.length = 0;

    const res = await fetch(`${base}/api/slack/disconnect`, { method: 'POST', headers: { cookie: c2 } });
    expect(res.status).toBe(200);
    expect(calls.find((c) => c.method === 'auth.revoke')?.auth).toBe(`Bearer ${TOKEN}`);
    expect(store.connections.size).toBe(0);
    const status = await (await fetch(`${base}/api/slack/status`, { headers: { cookie: c2 } })).json();
    expect(status.data).toEqual({ connected: false });
  });

  it('protects status and disconnect', async () => {
    expect((await fetch(`${base}/api/slack/status`)).status).toBe(401);
    expect((await fetch(`${base}/api/slack/disconnect`, { method: 'POST' })).status).toBe(401);
  });
});

describe('rate-limit notification', () => {
  const alert = { userId: 'user-1', senderId: 'sender-1', senderEmail: 'sender@example.com', limit: 100, nextWindowStartMs: Date.UTC(2026, 8, 28, 14, 0, 0) };
  const connectDirectly = () => slackService.completeInstall('user-1', 'code');
  const posts = () => calls.filter((c) => c.method === 'chat.postMessage');

  it('does nothing, and does not throw, when Slack is not connected', async () => {
    expect(await slackService.notifyRateLimitReached(alert)).toBe('skipped_no_connection');
    expect(calls).toHaveLength(0);
    expect(await redis.keys('slack-alert:*')).toHaveLength(0); // dedupe key not consumed
  });

  it('starts notifying immediately after connecting, without a restart', async () => {
    await slackService.notifyRateLimitReached(alert);
    await connectDirectly();
    expect(await slackService.notifyRateLimitReached(alert)).toBe('sent');
    expect(posts()).toHaveLength(1);
  });

  it('posts the real message with sender, limit, queue depth and next window', async () => {
    await connectDirectly();
    await slackService.notifyRateLimitReached(alert);
    const [post] = posts();
    expect(post.auth).toBe(`Bearer ${TOKEN}`);
    expect(post.body.channel).toBe('C123');
    expect(post.body.text).toContain('Hourly email limit reached');
    expect(post.body.text).toContain('Sender: sender@example.com');
    expect(post.body.text).toContain('Limit: 100 emails/hour');
    expect(post.body.text).toContain('Queued emails: 37');
    expect(post.body.text).toContain(`<!date^${alert.nextWindowStartMs / 1000}^`);
  });

  it('sends one alert per sender per window, even when many workers report at once', async () => {
    await connectDirectly();
    const outcomes = await Promise.all(Array.from({ length: 20 }, () => slackService.notifyRateLimitReached(alert)));
    expect(outcomes.filter((o) => o === 'sent')).toHaveLength(1);
    expect(outcomes.filter((o) => o === 'deduplicated')).toHaveLength(19);
    expect(posts()).toHaveLength(1);
    
    expect(await slackService.notifyRateLimitReached({ ...alert, senderId: 'sender-2' })).toBe('sent');
  });

  it('returns failed without throwing when Slack errors, and retries on the next event', async () => {
    await connectDirectly();
    postMode = 'server_error';
    expect(await slackService.notifyRateLimitReached(alert)).toBe('failed');
    postMode = 'ok';
    expect(await slackService.notifyRateLimitReached(alert)).toBe('sent'); // key was released
  });

  it('joins the channel and retries when the bot is not a member', async () => {
    await connectDirectly();
    postMode = 'not_in_channel';
    expect(await slackService.notifyRateLimitReached(alert)).toBe('sent');
    expect(calls.map((c) => c.method).filter((m) => m !== 'oauth.v2.access')).toEqual(['chat.postMessage', 'conversations.join', 'chat.postMessage']);
  });

  it('removes the connection when Slack reports the token revoked', async () => {
    await connectDirectly();
    postMode = 'token_revoked';
    expect(await slackService.notifyRateLimitReached(alert)).toBe('failed');
    expect(store.connections.size).toBe(0);
  });
});
