import { Request, Response } from 'express';
import { Recipient } from '../models';

export class RecipientController {
  // Добавление получателя
  static async addRecipient(req: Request, res: Response) {
    try {
      const { email, name, public_key, relationship } = req.body;

      const recipient = await Recipient.create({
        user_id: req.user.id,
        email,
        name,
        public_key,
        relationship,
        notification_sent: false,
        access_granted: false,
      });

      res.status(201).json({
        message: 'Recipient added successfully',
        recipient,
      });
    } catch (error: any) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({ message: 'Recipient already exists' });
      }
      console.error('Add recipient error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // Получение всех получателей
  static async getRecipients(req: Request, res: Response) {
    try {
      const recipients = await Recipient.findAll({
        where: { user_id: req.user.id },
        order: [['created_at', 'DESC']],
      });

      res.json({ recipients });
    } catch (error) {
      console.error('Get recipients error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // Удаление получателя
  static async deleteRecipient(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const recipient = await Recipient.findOne({
        where: { id, user_id: req.user.id },
      });

      if (!recipient) {
        return res.status(404).json({ message: 'Recipient not found' });
      }

      await recipient.destroy();

      res.json({ message: 'Recipient deleted successfully' });
    } catch (error) {
      console.error('Delete recipient error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
}