import { randomBytes, timingSafeEqual } from 'crypto';
import { redis } from '../config/redis';
import { logger } from '../config/logger';
import { slackRepository } from '../repositories/slack.repository';
import { emailRepository } from '../repositories/email.repository';
import {
  SlackApiError,
  exchangeCodeForInstall,
  postMessage,
  revokeToken,
} from '../integrations/slack.integration';
import { hourWindow } from './rateLimiter.service';
import { decryptSecret, encryptSecret } from '../utils/crypto';

export type NotifyOutcome = 'sent' | 'deduplicated' | 'skipped_no_connection' | 'failed';


const DEAD_TOKEN_ERRORS = new Set(['token_revoked', 'invalid_auth', 'account_inactive', 'token_expired']);

export function createSlackState(): string {
  return randomBytes(32).toString('hex');
}

export function isValidSlackState(expected: string | undefined, received: unknown): boolean {
  if (!expected || typeof received !== 'string' || received.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

export async function getStatus(userId: string): Promise<{ connected: boolean; teamId?: string; channelId?: string }> {
  const connection = await slackRepository.findByUserId(userId);
  if (!connection) return { connected: false };
  return { connected: true, teamId: connection.teamId, channelId: connection.channelId };
}

export async function completeInstall(userId: string, code: string): Promise<void> {
  const install = await exchangeCodeForInstall(code);
  await slackRepository.upsert({
    userId,
    accessToken: encryptSecret(install.accessToken),
    teamId: install.teamId,
    channelId: install.channelId,
  });
}

export async function disconnect(userId: string): Promise<void> {
  const connection = await slackRepository.findByUserId(userId);
  if (!connection) return;
  try {
    await revokeToken(decryptSecret(connection.accessToken));
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'Slack token revoke failed (disconnecting locally anyway)');
  }
  await slackRepository.delete(userId);
}

export interface RateLimitAlert {
  userId: string;
  senderId: string;
  senderEmail: string;
  limit: number;
  nextWindowStartMs: number;
}


export async function notifyRateLimitReached(alert: RateLimitAlert): Promise<NotifyOutcome> {
  try {
    const connection = await slackRepository.findByUserId(alert.userId);
    if (!connection) {
      logger.info({ senderId: alert.senderId }, 'Slack alert skipped: no Slack connection');
      return 'skipped_no_connection';
    }

    const dedupeKey = `slack-alert:${alert.senderId}:${hourWindow()}`;
    const first = await redis.set(dedupeKey, '1', 'EX', 2 * 3600, 'NX');
    if (first !== 'OK') return 'deduplicated';

    try {
      const queued = await emailRepository.countPendingForSender(alert.senderId);
      const unix = Math.floor(alert.nextWindowStartMs / 1000);
      const text = [
        '*ReachInbox Email Scheduler*',
        '',
        'Hourly email limit reached.',
        '',
        `Sender: ${alert.senderEmail}`,
        `Limit: ${alert.limit} emails/hour`,
        `Queued emails: ${queued}`,
        `Next available window: <!date^${unix}^{date_short_pretty} {time}|${new Date(alert.nextWindowStartMs).toISOString()}>`,
      ].join('\n');

      await postMessage(decryptSecret(connection.accessToken), connection.channelId, text);
      logger.info({ senderId: alert.senderId, queued }, 'SLACK_NOTIFICATION_SENT');
      return 'sent';
    } catch (err) {
      await redis.del(dedupeKey);
      if (err instanceof SlackApiError && DEAD_TOKEN_ERRORS.has(err.code)) {
        await slackRepository.delete(alert.userId);
        logger.warn({ code: err.code }, 'Slack token no longer valid, connection removed');
      } else {
        logger.error({ err: (err as Error).message }, 'Slack notification failed');
      }
      return 'failed';
    }
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Slack notification errored');
    return 'failed';
  }
}
