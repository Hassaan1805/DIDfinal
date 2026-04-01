import rateLimit from 'express-rate-limit';
import { Request } from 'express';

/**
 * Rate limiter for authentication endpoints
 * Prevents brute force attacks on login/verify endpoints
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip rate limiting for successful authentications
  skipSuccessfulRequests: false,
});

/**
 * Stricter rate limiter for challenge generation
 * Prevents DoS attacks via excessive challenge creation
 */
export const challengeRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // Limit each IP to 5 challenge requests per 5 minutes
  message: {
    success: false,
    error: 'Too many challenge requests. Please try again later.',
    retryAfter: '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for admin endpoints
 * More restrictive to protect sensitive operations
 */
export const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per 15 minutes
  message: {
    success: false,
    error: 'Too many admin requests. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * General API rate limiter
 * Applied to all routes as a baseline protection
 */
export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per 15 minutes
  message: {
    success: false,
    error: 'Too many requests. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // Skip rate limiting for health check endpoint
    return req.path === '/api/health';
  },
});
