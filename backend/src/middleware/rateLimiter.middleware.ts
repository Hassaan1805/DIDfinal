import rateLimit from 'express-rate-limit';
import { Request } from 'express';

const isDev = process.env.NODE_ENV === 'development';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Too many authentication attempts. Please try again later.', retryAfter: '15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDev,
});

export const challengeRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: { success: false, error: 'Too many challenge requests. Please try again later.', retryAfter: '5 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDev,
});

export const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, error: 'Too many admin requests. Please try again later.', retryAfter: '15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDev,
});

export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, error: 'Too many requests. Please try again later.', retryAfter: '15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => isDev || req.path === '/api/health',
});
