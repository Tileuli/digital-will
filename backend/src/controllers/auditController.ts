import { Request, Response } from 'express';
import { AuditLog } from '../models';

export class AuditController {
  static async getMyLogs(req: Request, res: Response) {
    try {
      const limit = Math.min(Number(req.query.limit) || 50, 200);
      const offset = Math.max(Number(req.query.offset) || 0, 0);

      const { rows, count } = await AuditLog.findAndCountAll({
        where: { user_id: req.user.id },
        order: [['created_at', 'DESC']],
        limit,
        offset,
        attributes: [
          'id',
          'action',
          'entity_type',
          'entity_id',
          'ip_address',
          'created_at',
        ],
      });

      return res.json({
        total: count,
        limit,
        offset,
        logs: rows,
      });
    } catch (error) {
      console.error('Audit log fetch error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }
}
