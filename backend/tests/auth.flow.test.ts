import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'net';
import type { Server } from 'http';

vi.mock('../src/config/prisma', () => ({ prisma: {} }));
vi.mock('../src/repositories/user.repository', () => ({
  userRepository: {
    upsertFromGoogle: vi.fn(async (p: { googleId: string; name: string; email: string; avatar?: string }) => ({
      id: 'user-1', googleId: p.googleId, name: p.name, email: p.email, avatar: p.avatar ?? null,
    })),
    findById: vi.fn(async (id: string) =>
      id === 'user-1' ? { id: 'user-1', name: 'Ada Lovelace', email: 'ada@example.com', avatar: 'http://a/pic.png' } : null,
    ),
  },
}));
vi.mock('../src/integrations/google.integration', async (importActual) => {
  const actual = await importActual<typeof import('../src/integrations/google.integration')>();
  return {
    ...actual, 
    exchangeCodeForProfile: vi.fn(async (code: string) => {
      if (code === 'bad-code') throw new Error('invalid_grant');
      return { googleId: 'g-123', email: 'ada@example.com', name: 'Ada Lovelace', avatar: 'http://a/pic.png' };
    }),
  };
});

import { createApp } from '../src/app';

let server: Server;
let base: string;

const cookieOf = (res: Response): string =>
  res.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');

async function startLogin(): Promise<{ state: string; cookie: string; location: URL }> {
  const res = await fetch(`${base}/api/auth/google`, { redirect: 'manual' });
  const location = new URL(res.headers.get('location')!);
  return { state: location.searchParams.get('state')!, cookie: cookieOf(res), location };
}

beforeAll(async () => {
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise((r) => server.close(r));
});

describe('Google OAuth login flow', () => {
  it('redirects to Google with client id, redirect uri, scopes and a random state', async () => {
    const { state, location } = await startLogin();
    expect(location.origin + location.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(location.searchParams.get('client_id')).toBe('test-client-id');
    expect(location.searchParams.get('redirect_uri')).toBe('http://localhost:4000/api/auth/google/callback');
    expect(location.searchParams.get('scope')).toContain('email');
    expect(state).toMatch(/^[0-9a-f]{64}$/);
    expect((await startLogin()).state).not.toBe(state);
  });

  it('rejects a callback whose state does not match the session', async () => {
    const { cookie } = await startLogin();
    const res = await fetch(`${base}/api/auth/google/callback?code=abc&state=${'0'.repeat(64)}`, {
      redirect: 'manual', headers: { cookie },
    });
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('http://localhost:5173/login?error=invalid_state');
  });

  it('rejects a callback with no session at all (forged link)', async () => {
    const res = await fetch(`${base}/api/auth/google/callback?code=abc&state=${'a'.repeat(64)}`, { redirect: 'manual' });
    expect(res.headers.get('location')).toBe('http://localhost:5173/login?error=invalid_state');
  });

  it('logs in on a valid callback, issues a fresh session, and /me returns the user', async () => {
    const { state, cookie: preLoginCookie } = await startLogin();
    const cb = await fetch(`${base}/api/auth/google/callback?code=good&state=${state}`, {
      redirect: 'manual', headers: { cookie: preLoginCookie },
    });
    expect(cb.status).toBe(302);
    expect(cb.headers.get('location')).toBe('http://localhost:5173/');
    const cookie = cookieOf(cb);
    expect(cookie).not.toBe(preLoginCookie); 

    const setCookie = cb.headers.getSetCookie()[0];
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Lax');

    const me = await (await fetch(`${base}/api/auth/me`, { headers: { cookie } })).json();
    expect(me).toEqual({
      success: true, message: 'Success',
      data: { id: 'user-1', name: 'Ada Lovelace', email: 'ada@example.com', avatar: 'http://a/pic.png' },
    });

    
    const old = await fetch(`${base}/api/auth/me`, { headers: { cookie: preLoginCookie } });
    expect(old.status).toBe(401);
  });

  it('state is single use: replaying a used callback fails', async () => {
    const { state, cookie } = await startLogin();
    await fetch(`${base}/api/auth/google/callback?code=good&state=${state}`, { redirect: 'manual', headers: { cookie } });
    const replay = await fetch(`${base}/api/auth/google/callback?code=good&state=${state}`, { redirect: 'manual', headers: { cookie } });
    expect(replay.headers.get('location')).toBe('http://localhost:5173/login?error=invalid_state');
  });

  it('redirects with an error when Google rejects the code, and stays logged out', async () => {
    const { state, cookie } = await startLogin();
    const res = await fetch(`${base}/api/auth/google/callback?code=bad-code&state=${state}`, { redirect: 'manual', headers: { cookie } });
    expect(res.headers.get('location')).toBe('http://localhost:5173/login?error=google_failed');
    expect((await fetch(`${base}/api/auth/me`, { headers: { cookie } })).status).toBe(401);
  });

  it('handles the user denying access on Google', async () => {
    const res = await fetch(`${base}/api/auth/google/callback?error=access_denied`, { redirect: 'manual' });
    expect(res.headers.get('location')).toBe('http://localhost:5173/login?error=access_denied');
  });

  it('protects authenticated APIs and returns the standard error envelope', async () => {
    for (const path of ['/api/auth/me', '/api/emails/scheduled', '/api/senders', '/api/queue/stats']) {
      const res = await fetch(`${base}${path}`);
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ success: false, message: 'Not authenticated', error: { code: 'UNAUTHENTICATED' } });
    }
  });

  it('logout destroys the session', async () => {
    const { state, cookie: c0 } = await startLogin();
    const cb = await fetch(`${base}/api/auth/google/callback?code=good&state=${state}`, { redirect: 'manual', headers: { cookie: c0 } });
    const cookie = cookieOf(cb);
    expect((await fetch(`${base}/api/auth/me`, { headers: { cookie } })).status).toBe(200);
    const out = await fetch(`${base}/api/auth/logout`, { method: 'POST', headers: { cookie } });
    expect(out.status).toBe(200);
    expect((await fetch(`${base}/api/auth/me`, { headers: { cookie } })).status).toBe(401);
  });

  it('Bull Board is mounted on the app behind admin auth', async () => {
    expect((await fetch(`${base}/admin/queues`)).status).toBe(401);
    const ok = await fetch(`${base}/admin/queues`, { headers: { authorization: 'Basic ' + Buffer.from('admin:change-me').toString('base64') } });
    expect(ok.status).toBe(200);
  });
});
