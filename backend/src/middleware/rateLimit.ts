import type { Request, Response, NextFunction } from 'express';
import { SlidingWindowRateLimiter } from '../core/autodubCore.ts';

export function createRateLimitMiddleware(maxRequests = 60, windowMs = 60_000) {
  const limiter = new SlidingWindowRateLimiter(maxRequests, windowMs);

  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIp =
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ||
      req.ip ||
      'unknown';

    const check = limiter.check(clientIp);
    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(check.remaining));

    if (!check.allowed) {
      res.setHeader('Retry-After', String(check.retryAfterSec));
      res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: `Too many requests. Retry in ${check.retryAfterSec} seconds.`,
          retryable: true,
        },
      });
      return;
    }

    next();
  };
}
