import { Request, Response } from 'express';
import { CheckinLog, User } from '../models';

export class CheckinController {
  static async checkIn(req: Request, res: Response) {
    try {
      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const checkinLog = await CheckinLog.create({
        user_id: user.id,
        method: req.body.method || 'manual',
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
      });

      const interval =
        user.checkin_interval_days ||
        parseInt(process.env.CHECKIN_INTERVAL_DAYS || '7', 10);

      const now = new Date();
      const nextCheckin = new Date(now);
      nextCheckin.setDate(nextCheckin.getDate() + interval);

      user.last_checkin = now;
      user.next_checkin_due = nextCheckin;
      await user.save();

      const userData = user.get({ plain: true }) as any;
      delete userData.password_hash;

      res.json({
        message: 'Check-in successful',
        checkin: {
          id: checkinLog.id,
          checkin_date: checkinLog.checkin_date,
          method: checkinLog.method,
        },
        user: userData,
        next_checkin_due: user.next_checkin_due,
      });
    } catch (error) {
      console.error('Check-in error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async getCheckinHistory(req: Request, res: Response) {
    try {
      const checkins = await CheckinLog.findAll({
        where: { user_id: req.user.id },
        order: [['checkin_date', 'DESC']],
        limit: 50,
      });

      res.json({ checkins });
    } catch (error) {
      console.error('Get checkin history error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  static async getCheckinStatus(req: Request, res: Response) {
    try {
      const user = await User.findByPk(req.user.id, {
        attributes: ['id', 'last_checkin', 'next_checkin_due', 'checkin_interval_days'],
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const lastCheckin = await CheckinLog.findOne({
        where: { user_id: req.user.id },
        order: [['checkin_date', 'DESC']],
      });

      const isOverdue = user.next_checkin_due ? new Date() > user.next_checkin_due : false;

      res.json({
        last_checkin: user.last_checkin,
        last_checkin_log: lastCheckin,
        next_checkin_due: user.next_checkin_due,
        checkin_interval_days: user.checkin_interval_days,
        is_overdue: isOverdue,
      });
    } catch (error) {
      console.error('Get checkin status error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
}