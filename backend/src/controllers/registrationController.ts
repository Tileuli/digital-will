import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { EmailVerification, User } from '../models';
import { sendRegistrationCodeEmail } from '../services/emailService';
import { hashToken } from '../services/tokenService';

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 30 * 1000;
const MAX_ATTEMPTS = 5;
const TICKET_TTL = '10m';

const generateCode = () => {
  // 6-digit code, padded; uniform random byte → modulo bias is negligible at 6 digits
  const n = crypto.randomInt(0, 1_000_000);
  return n.toString().padStart(6, '0');
};

const issueRegistrationTicket = (email: string) => {
  return jwt.sign(
    { email, scope: 'registration' },
    process.env.JWT_SECRET as string,
    { expiresIn: TICKET_TTL }
  );
};

const verifyRegistrationTicket = (token: string): { email: string } | null => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    if (decoded?.scope !== 'registration' || !decoded?.email) return null;
    return { email: decoded.email as string };
  } catch {
    return null;
  }
};

const issueAuthToken = (user: User) => {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET as string,
    {
      expiresIn: (process.env.JWT_EXPIRES_IN ||
        '7d') as jwt.SignOptions['expiresIn'],
    }
  );
};

const safeUser = (user: User) => {
  const u = user.get({ plain: true }) as any;
  delete u.password_hash;
  delete u.totp_secret;
  return u;
};

export class RegistrationController {
  /**
   * Step 1: user submits an email. We generate a 6-digit code, store its
   * SHA-256 hash and email it. Existing pending row for the email is
   * overwritten (with a short cooldown so we don't spam on rapid clicks).
   */
  static async init(req: Request, res: Response) {
    try {
      const rawEmail = (req.body?.email as string) || '';
      const email = rawEmail.trim().toLowerCase();
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        // Don't leak existence by returning a hard error — but we also can't
        // pretend to send a code, because the new code wouldn't sign you in.
        // We tell the client to sign in instead.
        return res.status(409).json({
          message: 'An account with this email already exists. Please sign in.',
          account_exists: true,
        });
      }

      const existing = await EmailVerification.findOne({ where: { email } });

      if (
        existing &&
        Date.now() - new Date(existing.created_at).getTime() < RESEND_COOLDOWN_MS
      ) {
        return res
          .status(429)
          .json({ message: 'Please wait a few seconds before requesting another code.' });
      }

      const code = generateCode();
      const code_hash = hashToken(code);
      const expires_at = new Date(Date.now() + CODE_TTL_MS);

      if (existing) {
        existing.code_hash = code_hash;
        existing.attempts = 0;
        existing.expires_at = expires_at;
        existing.changed('updated_at', true);
        await existing.save();
        // Touch created_at so cooldown resets correctly for next call.
        await EmailVerification.update(
          { created_at: new Date() } as any,
          { where: { id: existing.id }, silent: true }
        );
      } else {
        await EmailVerification.create({
          email,
          code_hash,
          expires_at,
        });
      }

      sendRegistrationCodeEmail(email, code).catch((err) =>
        console.error('Failed to send registration code:', err)
      );

      return res.json({
        message: 'Verification code sent. Please check your email.',
        expires_in_seconds: CODE_TTL_MS / 1000,
      });
    } catch (error) {
      console.error('Register init error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Step 2: user submits the code. On success, we return a short-lived
   * registration ticket (JWT) that authorizes the final create-account call.
   */
  static async verify(req: Request, res: Response) {
    try {
      const rawEmail = (req.body?.email as string) || '';
      const code = ((req.body?.code as string) || '').trim();
      const email = rawEmail.trim().toLowerCase();

      if (!email || !code) {
        return res.status(400).json({ message: 'Email and code are required' });
      }

      const record = await EmailVerification.findOne({ where: { email } });
      if (!record) {
        return res
          .status(400)
          .json({ message: 'No pending verification for this email. Request a new code.' });
      }

      if (new Date(record.expires_at).getTime() < Date.now()) {
        await record.destroy();
        return res
          .status(400)
          .json({ message: 'Code expired. Request a new one.' });
      }

      if (record.attempts >= MAX_ATTEMPTS) {
        await record.destroy();
        return res.status(429).json({
          message: 'Too many incorrect attempts. Please request a new code.',
        });
      }

      const codeHash = hashToken(code);
      if (codeHash !== record.code_hash) {
        record.attempts += 1;
        await record.save();
        return res.status(401).json({
          message: 'Incorrect code',
          attempts_remaining: MAX_ATTEMPTS - record.attempts,
        });
      }

      // Success — issue ticket. Keep the row around so the next step can
      // double-check that the email was verified, then delete on complete.
      const ticket = issueRegistrationTicket(email);
      return res.json({
        message: 'Email verified',
        registration_ticket: ticket,
        expires_in_seconds: 10 * 60,
      });
    } catch (error) {
      console.error('Register verify error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Step 3: user picks a password and submits crypto material. We require
   * the registration ticket from step 2 and enforce that the verification
   * row still exists (i.e. the ticket is bound to a real verified email).
   */
  static async complete(req: Request, res: Response) {
    try {
      const {
        registration_ticket,
        password,
        full_name,
        phone,
        checkin_interval_days,
        kdf_salt,
        public_key,
        encrypted_private_key,
        kdf_algorithm,
      } = req.body as {
        registration_ticket?: string;
        password?: string;
        full_name?: string;
        phone?: string;
        checkin_interval_days?: number;
        kdf_salt?: string;
        public_key?: string;
        encrypted_private_key?: string;
        kdf_algorithm?: 'pbkdf2' | 'argon2id';
      };

      if (!registration_ticket) {
        return res
          .status(400)
          .json({ message: 'registration_ticket is required' });
      }
      if (!password || password.length < 8) {
        return res
          .status(400)
          .json({ message: 'Password must be at least 8 characters' });
      }
      if (!kdf_salt || !public_key || !encrypted_private_key) {
        return res.status(400).json({
          message:
            'Missing encryption material (kdf_salt, public_key, encrypted_private_key)',
        });
      }

      const decoded = verifyRegistrationTicket(registration_ticket);
      if (!decoded) {
        return res.status(401).json({
          message: 'Registration ticket invalid or expired. Start over.',
        });
      }

      const email = decoded.email;

      // Check user existence first: covers the case where a previous /complete
      // call succeeded server-side but the client timed out and is retrying.
      // The verification row was already destroyed by the successful call, so
      // looking it up first would mislead the user into "Start over" when in
      // fact their account is created and they should just sign in.
      const existing = await User.findOne({ where: { email } });
      if (existing) {
        await EmailVerification.destroy({ where: { email } });
        return res.status(409).json({
          message:
            'An account with this email already exists. Please sign in with your password.',
          account_exists: true,
        });
      }

      const verification = await EmailVerification.findOne({ where: { email } });
      if (!verification) {
        return res.status(401).json({
          message: 'Verification record not found. Start over.',
        });
      }

      const interval =
        Number.isInteger(checkin_interval_days) &&
        (checkin_interval_days as number) > 0
          ? (checkin_interval_days as number)
          : 7;

      const now = new Date();
      const nextCheckin = new Date(now);
      nextCheckin.setDate(nextCheckin.getDate() + interval);

      const password_hash = await bcrypt.hash(password, 10);

      const algorithm: 'pbkdf2' | 'argon2id' =
        kdf_algorithm === 'argon2id' ? 'argon2id' : 'pbkdf2';

      const user = await User.create({
        email,
        password_hash,
        full_name,
        phone,
        kdf_salt,
        public_key,
        encrypted_private_key,
        kdf_algorithm: algorithm,
        is_active: true,
        checkin_interval_days: interval,
        last_checkin: now,
        next_checkin_due: nextCheckin,
        reminder_sent_at: null,
      });

      await verification.destroy();

      const token = issueAuthToken(user);

      return res.status(201).json({
        message: 'Account created',
        token,
        user: safeUser(user),
      });
    } catch (error) {
      console.error('Register complete error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }
}
