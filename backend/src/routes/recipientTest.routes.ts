import { Router } from 'express';
import { query } from 'express-validator';
import { RecipientTestController } from '../controllers/recipientTestController';
import { validate } from '../middleware/validation';
import { auditLog } from '../middleware/audit';
import { publicLimiter } from '../middleware/rateLimit';

const router = Router();

router.get(
  '/material',
  publicLimiter,
  [
    query('token').isString().notEmpty(),
    validate,
    auditLog('recipient_test_view', 'recipient'),
  ],
  RecipientTestController.getTestMaterial
);

export default router;
