import { Router } from 'express';
import { body } from 'express-validator';
import { TotpController } from '../controllers/totpController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { auditLog } from '../middleware/audit';

const router = Router();

router.post(
  '/setup',
  authenticate,
  auditLog('totp_setup_init', 'user', (req) => req.user?.id),
  TotpController.setup
);

router.post(
  '/verify',
  authenticate,
  [
    body('code').isString().notEmpty(),
    validate,
    auditLog('totp_enable', 'user', (req) => req.user?.id),
  ],
  TotpController.verify
);

router.post(
  '/disable',
  authenticate,
  [
    body('password').isString().notEmpty(),
    validate,
    auditLog('totp_disable', 'user', (req) => req.user?.id),
  ],
  TotpController.disable
);

router.get('/status', authenticate, TotpController.status);

export default router;
