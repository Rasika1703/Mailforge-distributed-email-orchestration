import { env } from '../config/env';

export class SlackApiError extends Error {
  constructor(public readonly code: string) {
    super(`Slack API error: ${code}`);
  }
}


const SCOPES = ['chat:write', 'channels:join', 'incoming-webhook'];

export interface SlackInstall {
  accessToken: string;
  teamId: string;
  channelId: string;
}

export function isSlackConfigured(): boolean {
  return Boolean(env.slackClientId && env.slackClientSecret);
}

export function buildSlackAuthUrl(state: string): string {
  const url = new URL('https://slack.com/oauth/v2/authorize');
  url.searchParams.set('client_id', env.slackClientId);
  url.searchParams.set('scope', SCOPES.join(','));
  url.searchParams.set('redirect_uri', env.slackRedirectUri);
  url.searchParams.set('state', state);
  return url.toString();
}

async function call<T>(method: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${env.slackApiUrl}/${method}`, { ...init, signal: AbortSignal.timeout(8000) });
  const body = (await res.json()) as { ok: boolean; error?: string } & T;
  if (!body.ok) throw new SlackApiError(body.error ?? 'unknown_error');
  return body;
}

export async function exchangeCodeForInstall(code: string): Promise<SlackInstall> {
  const form = new URLSearchParams({
    client_id: env.slackClientId,
    client_secret: env.slackClientSecret,
    code,
    redirect_uri: env.slackRedirectUri,
  });
  const body = await call<{
    access_token?: string;
    team?: { id: string };
    incoming_webhook?: { channel_id: string };
  }>('oauth.v2.access', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: form,
  });

  if (!body.access_token || !body.team?.id || !body.incoming_webhook?.channel_id) {
    throw new SlackApiError('incomplete_install_response');
  }
  return { accessToken: body.access_token, teamId: body.team.id, channelId: body.incoming_webhook.channel_id };
}

function post(token: string, method: string, payload: object): Promise<unknown> {
  return call(method, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8', authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export async function postMessage(token: string, channel: string, text: string): Promise<void> {
  try {
    await post(token, 'chat.postMessage', { channel, text });
  } catch (err) {
    if (err instanceof SlackApiError && err.code === 'not_in_channel') {
      await post(token, 'conversations.join', { channel });
      await post(token, 'chat.postMessage', { channel, text });
      return;
    }
    throw err;
  }
}

export async function revokeToken(token: string): Promise<void> {
  await post(token, 'auth.revoke', {});
}
