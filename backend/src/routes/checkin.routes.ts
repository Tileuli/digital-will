import { Router } from 'express';
import { CheckinController } from '../controllers/checkinController';
import { authenticate } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router = Router();

router.use(authenticate);

// Отметка "Я в порядке"
router.post(
  '/',
  auditLog('checkin_perform', 'checkin'),
  CheckinController.checkIn
);

// История проверок
router.get(
  '/history',
  auditLog('checkin_history_view', 'checkin'),
  CheckinController.getCheckinHistory
);

// Статус проверки
router.get(
  '/status',
  auditLog('checkin_status_view', 'checkin'),
  CheckinController.getCheckinStatus
);

export default router;