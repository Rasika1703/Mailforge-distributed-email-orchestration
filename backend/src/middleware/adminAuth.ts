import { createHash, timingSafeEqual } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';

const INSECURE_DEFAULTS = new Set(['admin', 'change-me', '']);

function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}


export function adminAuth(req: Request, res: Response, next: NextFunction): void {
  if (env.isProduction && INSECURE_DEFAULTS.has(env.adminPassword)) {
    res.status(503).send('Admin dashboard disabled: set a real ADMIN_PASSWORD.');
    return;
  }

  const header = req.headers.authorization ?? '';
  const [scheme, encoded] = header.split(' ');
  if (scheme === 'Basic' && encoded) {
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const separator = decoded.indexOf(':');
    const user = decoded.slice(0, separator);
    const password = decoded.slice(separator + 1);
    if (separator >= 0 && safeEqual(user, env.adminUser) && safeEqual(password, env.adminPassword)) {
      next();
      return;
    }
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="ReachInbox Queue Admin"');
  res.status(401).send('Authentication required');
}
