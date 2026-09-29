import { Request, Response } from 'express';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { ApiError } from '../middleware/errorHandler';
import { buildSlackAuthUrl, isSlackConfigured } from '../integrations/slack.integration';
import * as slackService from '../services/slack.service';
import { sendSuccess } from '../utils/apiResponse';

const slackPage = (query: string): string => `${env.frontendUrl}/slack?${query}`;

function saveSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => req.session.save((err) => (err ? reject(err) : resolve())));
}


export async function connect(req: Request, res: Response): Promise<void> {
  if (!req.session.userId) {
    res.redirect(`${env.frontendUrl}/login?error=session_expired`);
    return;
  }
  if (!isSlackConfigured()) {
    throw new ApiError('Slack is not configured on this server', 503, 'SLACK_NOT_CONFIGURED');
  }
  const state = slackService.createSlackState();
  req.session.slackOAuthState = state;
  await saveSession(req);
  res.redirect(buildSlackAuthUrl(state));
}

export async function callback(req: Request, res: Response): Promise<void> {
  const userId = req.session.userId;
  if (!userId) {
    res.redirect(`${env.frontendUrl}/login?error=session_expired`);
    return;
  }

  const expected = req.session.slackOAuthState;
  req.session.slackOAuthState = undefined; // single use

  if (typeof req.query.error === 'string') {
    res.redirect(slackPage('status=error&reason=access_denied'));
    return;
  }
  if (!slackService.isValidSlackState(expected, req.query.state)) {
    logger.warn('Slack callback rejected: invalid OAuth state');
    res.redirect(slackPage('status=error&reason=invalid_state'));
    return;
  }
  const code = req.query.code;
  if (typeof code !== 'string' || code.length === 0) {
    res.redirect(slackPage('status=error&reason=missing_code'));
    return;
  }

  try {
    await slackService.completeInstall(userId, code);
    res.redirect(slackPage('status=connected'));
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Slack install failed');
    res.redirect(slackPage('status=error&reason=slack_failed'));
  }
}

export async function status(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await slackService.getStatus(req.userId!));
}

export async function disconnect(req: Request, res: Response): Promise<void> {
  await slackService.disconnect(req.userId!);
  sendSuccess(res, { connected: false }, 'Slack disconnected');
}
