
import { Request, Response } from 'express';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { SESSION_COOKIE_NAME } from '../config/session';
import { buildGoogleAuthUrl } from '../integrations/google.integration';
import * as authService from '../services/auth.service';
import { sendSuccess } from '../utils/apiResponse';

function loginErrorRedirect(res: Response, code: string): void {
  res.redirect(
    `${env.frontendUrl}/login?error=${encodeURIComponent(code)}`,
  );
}

function saveSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.save((err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function regenerateSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

export async function startGoogleLogin(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    // 1. Generate OAuth state
    const state = authService.createOAuthState();

    // 2. IMPORTANT:
    // Store the state in the session BEFORE redirecting to Google.
    req.session.oauthState = state;

    // 3. Explicitly save the session so the cookie/session
    // is available when Google redirects back.
    await saveSession(req);

    // 4. Build Google authorization URL
    const url = buildGoogleAuthUrl(state);

    // 5. Redirect user to Google
    res.redirect(url);
  } catch (err) {
    logger.error(
      { err: (err as Error).message },
      'Failed to start Google login',
    );

    loginErrorRedirect(res, 'google_start_failed');
  }
}

export async function googleCallback(
  req: Request,
  res: Response,
): Promise<void> {
  // User cancelled Google login
  if (typeof req.query.error === 'string') {
    loginErrorRedirect(res, 'access_denied');
    return;
  }

  // Get the state that was stored before redirecting to Google
  const expectedState = req.session.oauthState;

  // State is single-use
  req.session.oauthState = undefined;

  // Validate OAuth state
  if (
    !authService.isValidOAuthState(
      expectedState,
      req.query.state,
    )
  ) {
    logger.warn(
      'Google callback rejected: invalid OAuth state',
    );

    loginErrorRedirect(res, 'invalid_state');
    return;
  }

  // Get authorization code
  const code = req.query.code;

  if (typeof code !== 'string' || code.length === 0) {
    loginErrorRedirect(res, 'missing_code');
    return;
  }

  try {
    // Exchange Google authorization code for user
    const user = await authService.loginWithGoogleCode(code);

    // Regenerate session after successful authentication
    // to prevent session fixation.
    await regenerateSession(req);

    // Store authenticated user
    req.session.userId = user.id;

    // Save authenticated session
    await saveSession(req);

    // Send user back to frontend
    res.redirect(`${env.frontendUrl}/`);
  } catch (err) {
    logger.error(
      { err: (err as Error).message },
      'Google login failed',
    );

    loginErrorRedirect(res, 'google_failed');
  }
}

export async function me(
  req: Request,
  res: Response,
): Promise<void> {
  sendSuccess(
    res,
    await authService.getCurrentUser(req.userId!),
  );
}

export async function logout(
  req: Request,
  res: Response,
): Promise<void> {
  await new Promise<void>((resolve) => {
    req.session.destroy(() => resolve());
  });

  res.clearCookie(SESSION_COOKIE_NAME);

  sendSuccess(res, null, 'Logged out');
}

