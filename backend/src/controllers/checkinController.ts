import { Request, Response } from 'express';
import { CheckinLog, User } from '../models';

export class CheckinController {
  // Отметка "Я в порядке"
  static async checkIn(req: Request, res: Response) {
    try {
      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Создаем запись в логе
      const checkinLog = await CheckinLog.create({
        user_id: user.id,
        method: req.body.method || 'manual',
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
      });

      // Обновляем время следующей проверки
      const checkinIntervalDays = parseInt(process.env.CHECKIN_INTERVAL_DAYS || '7');
      const nextCheckin = new Date();
      nextCheckin.setDate(nextCheckin.getDate() + checkinIntervalDays);

      user.last_checkin = new Date();
      user.next_checkin_due = nextCheckin;
      await user.save();

      // Создаем объект пользователя без пароля
      const userData = user.get({ plain: true });
      const userResponse: any = { ...userData };
      delete userResponse.password_hash;

      res.json({
        message: 'Check-in successful',
        checkin: {
          id: checkinLog.id,
          checkin_date: checkinLog.checkin_date,
          method: checkinLog.method,
        },
        user: userResponse,
        next_checkin_due: user.next_checkin_due,
      });
    } catch (error) {
      console.error('Check-in error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // Получение истории проверок
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

  // Получение статуса проверки
  static async getCheckinStatus(req: Request, res: Response) {
    try {
      const user = await User.findByPk(req.user.id, {
        attributes: ['id', 'last_checkin', 'next_checkin_due'],
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Получаем последнюю проверку
      const lastCheckin = await CheckinLog.findOne({
        where: { user_id: req.user.id },
        order: [['checkin_date', 'DESC']],
      });

      res.json({
        last_checkin: user.last_checkin,
        last_checkin_log: lastCheckin,
        next_checkin_due: user.next_checkin_due,
        is_overdue: user.next_checkin_due ? new Date() > user.next_checkin_due : false,
      });
    } catch (error) {
      console.error('Get checkin status error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
}