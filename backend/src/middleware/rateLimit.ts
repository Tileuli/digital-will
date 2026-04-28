import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';

const isDev = process.env.NODE_ENV === 'development';

const message = (msg: string) => ({
  message: msg,
});

/**
 * Strict limiter for password-based authentication.
 * Counts both successful and failed attempts per IP+email.
 * Loosened in dev to avoid lockout during local testing.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 100 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const email = (req.body?.email || '').toString().toLowerCase().trim();
    // ipKeyGenerator normalises IPv6 so /64 prefixes count as one key.
    return `${ipKeyGenerator(req.ip || '')}:${email}`;
  },
  message: message(
    'Too many login attempts. Please wait 15 minutes and try again.'
  ),
});

/**
 * Slightly looser limiter for account creation per IP.
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isDev ? 100 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: message(
    'Too many accounts created from this IP. Please try again later.'
  ),
});

/**
 * General-purpose limiter for any unauthenticated public endpoint
 * (invitation lookup, claim lookup, etc.)
 */
export const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 200 : 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: message('Too many requests. Please slow down.'),
});
