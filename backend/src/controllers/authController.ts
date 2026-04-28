import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import { User } from '../models';

const TOTP_CHALLENGE_TTL = '5m';

const buildSafeUser = (user: User) => {
  const userData = user.get({ plain: true }) as any;
  delete userData.password_hash;
  delete userData.totp_secret;
  return userData;
};

const generateToken = (user: User) => {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET as string,
    { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'] }
  );
};

const generateTotpChallenge = (user: User) => {
  return jwt.sign(
    { id: user.id, totp_pending: true },
    process.env.JWT_SECRET as string,
    { expiresIn: TOTP_CHALLENGE_TTL }
  );
};

const verifyTotpChallenge = (token: string): { id: string } | null => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    if (!decoded?.totp_pending || !decoded?.id) return null;
    return { id: decoded.id };
  } catch {
    return null;
  }
};

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ where: { email } });
      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      if (!user.is_active) {
        return res.status(403).json({ message: 'Account is deactivated' });
      }

      if (user.totp_enabled && user.totp_secret) {
        const totp_challenge = generateTotpChallenge(user);
        return res.json({
          message: 'TOTP verification required',
          totp_required: true,
          totp_challenge,
        });
      }

      if (!user.last_checkin || !user.next_checkin_due) {
        const now = new Date();
        const nextCheckin = new Date(now);
        nextCheckin.setDate(nextCheckin.getDate() + user.checkin_interval_days);

        user.last_checkin = now;
        user.next_checkin_due = nextCheckin;
        user.reminder_sent_at = null;
        await user.save();
      }

      const token = generateToken(user);

      return res.json({
        message: 'Login successful',
        token,
        user: buildSafeUser(user),
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }

  static async loginVerifyTotp(req: Request, res: Response) {
    try {
      const { totp_challenge, code } = req.body as {
        totp_challenge?: string;
        code?: string;
      };
      if (!totp_challenge || !code) {
        return res
          .status(400)
          .json({ message: 'totp_challenge and code are required' });
      }

      const decoded = verifyTotpChallenge(totp_challenge);
      if (!decoded) {
        return res.status(401).json({ message: 'Challenge expired or invalid' });
      }

      const user = await User.findByPk(decoded.id);
      if (!user || !user.totp_enabled || !user.totp_secret) {
        return res.status(401).json({ message: 'Invalid challenge' });
      }

      const valid = authenticator.check(code.trim(), user.totp_secret);
      if (!valid) {
        return res.status(401).json({ message: 'Invalid verification code' });
      }

      if (!user.last_checkin || !user.next_checkin_due) {
        const now = new Date();
        const nextCheckin = new Date(now);
        nextCheckin.setDate(nextCheckin.getDate() + user.checkin_interval_days);
        user.last_checkin = now;
        user.next_checkin_due = nextCheckin;
        user.reminder_sent_at = null;
        await user.save();
      }

      const token = generateToken(user);
      return res.json({
        message: 'Login successful',
        token,
        user: buildSafeUser(user),
      });
    } catch (error) {
      console.error('TOTP verify error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }

  static async getCurrentUser(req: Request, res: Response) {
    try {
      const user = await User.findByPk(req.user.id);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      return res.json({ user: buildSafeUser(user) });
    } catch (error) {
      console.error('Get current user error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }

  static async logout(req: Request, res: Response) {
    return res.json({ message: 'Logout successful' });
  }
}
