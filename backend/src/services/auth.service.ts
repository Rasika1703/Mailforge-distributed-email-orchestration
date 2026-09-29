import { randomBytes, timingSafeEqual } from 'crypto';
import { exchangeCodeForProfile } from '../integrations/google.integration';
import { userRepository } from '../repositories/user.repository';
import { ApiError } from '../middleware/errorHandler';

export function createOAuthState(): string {
  return randomBytes(32).toString('hex');
}

export function isValidOAuthState(expected: string | undefined, received: unknown): boolean {
  if (!expected || typeof received !== 'string' || received.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

export async function loginWithGoogleCode(code: string) {
  const profile = await exchangeCodeForProfile(code);
  return userRepository.upsertFromGoogle(profile);
}

export async function getCurrentUser(userId: string) {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new ApiError('Not authenticated', 401, 'UNAUTHENTICATED');
  }
  return { id: user.id, name: user.name, email: user.email, avatar: user.avatar };
}
