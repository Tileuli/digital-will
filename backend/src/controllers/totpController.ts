import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { User } from '../models';

const ISSUER = 'Digital Will';

export class TotpController {
  /**
   * Generate a fresh TOTP secret for the authed user (does NOT enable yet).
   * Returns the base32 secret + an otpauth:// URI + a data-URL PNG QR for
   * convenience. Verification with a real code in /verify activates 2FA.
   */
  static async setup(req: Request, res: Response) {
    try {
      const user = await User.findByPk(req.user.id);
      if (!user) return res.status(404).json({ message: 'User not found' });

      if (user.totp_enabled) {
        return res.status(400).json({
          message:
            'Two-factor authentication is already enabled. Disable it first to re-enroll.',
        });
      }

      const secret = authenticator.generateSecret();
      const otpauth = authenticator.keyuri(user.email, ISSUER, secret);
      const qrDataUrl = await QRCode.toDataURL(otpauth);

      // Store the *pending* secret. It only becomes "active" once the user
      // proves possession by submitting a valid code.
      user.totp_secret = secret;
      user.totp_enabled = false;
      await user.save();

      return res.json({
        secret,
        otpauth,
        qr: qrDataUrl,
      });
    } catch (error) {
      console.error('TOTP setup error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Verify a code against the pending secret and flip totp_enabled = true.
   * Body: { code }
   */
  static async verify(req: Request, res: Response) {
    try {
      const { code } = req.body as { code?: string };
      if (!code) {
        return res.status(400).json({ message: 'Code is required' });
      }

      const user = await User.findByPk(req.user.id);
      if (!user) return res.status(404).json({ message: 'User not found' });

      if (!user.totp_secret) {
        return res
          .status(400)
          .json({ message: 'No pending TOTP setup. Call /setup first.' });
      }

      const valid = authenticator.check(code.trim(), user.totp_secret);
      if (!valid) {
        return res.status(401).json({ message: 'Invalid verification code' });
      }

      user.totp_enabled = true;
      await user.save();

      return res.json({
        message: 'Two-factor authentication enabled',
        totp_enabled: true,
      });
    } catch (error) {
      console.error('TOTP verify error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }

  /**
   * Disable 2FA. Requires the user's password to prevent accidental disabling
   * by someone with a hijacked session.
   * Body: { password }
   */
  static async disable(req: Request, res: Response) {
    try {
      const { password } = req.body as { password?: string };
      if (!password) {
        return res
          .status(400)
          .json({ message: 'Password confirmation is required' });
      }

      const user = await User.findByPk(req.user.id);
      if (!user) return res.status(404).json({ message: 'User not found' });

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ message: 'Incorrect password' });
      }

      user.totp_enabled = false;
      user.totp_secret = null;
      await user.save();

      return res.json({
        message: 'Two-factor authentication disabled',
        totp_enabled: false,
      });
    } catch (error) {
      console.error('TOTP disable error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }

  /** Whether 2FA is currently enabled for the authed user. */
  static async status(req: Request, res: Response) {
    try {
      const user = await User.findByPk(req.user.id);
      if (!user) return res.status(404).json({ message: 'User not found' });
      return res.json({
        totp_enabled: user.totp_enabled,
        pending_setup: !!user.totp_secret && !user.totp_enabled,
      });
    } catch (error) {
      console.error('TOTP status error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }
}
