import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env';
import { ApiError } from '../middleware/errorHandler';

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  avatar?: string;
}

export function isGoogleConfigured(): boolean {
  return Boolean(env.googleClientId && env.googleClientSecret);
}

function createClient(): OAuth2Client {
  if (!isGoogleConfigured()) {
    throw new ApiError('Google sign-in is not configured on this server', 503, 'GOOGLE_NOT_CONFIGURED');
  }
  return new OAuth2Client(env.googleClientId, env.googleClientSecret, env.googleCallbackUrl);
}

export function buildGoogleAuthUrl(state: string): string {
  return createClient().generateAuthUrl({
    scope: ['openid', 'email', 'profile'],
    state,
    prompt: 'select_account',
  });
}


export async function exchangeCodeForProfile(code: string): Promise<GoogleProfile> {
  const client = createClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.id_token) {
    throw new ApiError('Google did not return an identity token', 502, 'GOOGLE_NO_ID_TOKEN');
  }

  const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: env.googleClientId });
  const payload = ticket.getPayload();

  if (!payload?.sub || !payload.email) {
    throw new ApiError('Google account is missing required profile data', 502, 'GOOGLE_BAD_PROFILE');
  }
  if (!payload.email_verified) {
    throw new ApiError('Google account email is not verified', 403, 'GOOGLE_EMAIL_UNVERIFIED');
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name ?? payload.email,
    avatar: payload.picture,
  };
}
