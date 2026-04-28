import crypto from 'crypto';

export const generateToken = (bytes: number = 32): string =>
  crypto.randomBytes(bytes).toString('base64url');

export const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');
