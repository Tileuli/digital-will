import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models';

const buildSafeUser = (user: User) => {
  const userData = user.get({ plain: true }) as any;
  delete userData.password_hash;
  return userData;
};

const generateToken = (user: User) => {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET as string,
    { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'] }
  );
};

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const { email, password, full_name, phone, checkin_interval_days } = req.body;

      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const interval =
        Number.isInteger(checkin_interval_days) && checkin_interval_days > 0
          ? checkin_interval_days
          : 7;

      const now = new Date();
      const nextCheckin = new Date(now);
      nextCheckin.setDate(nextCheckin.getDate() + interval);

      const user = await User.create({
        email,
        password_hash: hashedPassword,
        full_name,
        phone,
        is_active: true,
        checkin_interval_days: interval,
        last_checkin: now,
        next_checkin_due: nextCheckin,
        reminder_sent_at: null,
      });

      const token = generateToken(user);

      return res.status(201).json({
        message: 'User registered successfully',
        token,
        user: buildSafeUser(user),
      });
    } catch (error) {
      console.error('Registration error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }

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