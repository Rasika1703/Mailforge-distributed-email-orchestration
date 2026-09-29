import rateLimit from 'express-rate-limit';

function limiter(windowMs: number, limit: number, message: string) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({ success: false, message, error: { code: 'RATE_LIMITED' } });
    },
  });
}


export const authLimiter = limiter(15 * 60 * 1000, 40, 'Too many login attempts, try again later');
export const scheduleLimiter = limiter(60 * 1000, 20, 'Too many scheduling requests, slow down');
