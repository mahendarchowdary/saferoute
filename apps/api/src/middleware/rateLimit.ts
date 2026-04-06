import { RateLimiterMemory } from 'rate-limiter-flexible';
import { Response } from 'express';
import { AuthRequest } from './auth';

const limiter = new RateLimiterMemory({
  keyPrefix: 'api_limit',
  points: 100,
  duration: 60,
});

export const rateLimiter = async (req: AuthRequest, res: Response, next: any) => {
  try {
    const key = req.user?.id || (req as any).ip || 'anonymous';
    await limiter.consume(key);
    next();
  } catch {
    res.status(429).json({ error: 'Too many requests' });
  }
};
