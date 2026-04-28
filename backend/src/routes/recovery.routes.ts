import { Router } from 'express';
import { body } from 'express-validator';
import { RecoveryController } from '../controllers/recoveryController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { auditLog } from '../middleware/audit';
import { publicLimiter } from '../middleware/rateLimit';

const router = Router();

// Authenticated — manage your own codes.
router.post(
  '/codes',
  authenticate,
  auditLog('recovery_codes_set', 'user', (req) => req.user?.id),
  RecoveryController.setCodes
);

router.get(
  '/status',
  authenticate,
  RecoveryController.status
);

// Public — recovery flow for users who lost their password.
router.post(
  '/begin',
  publicLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('code').isString().notEmpty(),
    validate,
    auditLog('recovery_begin', 'user'),
  ],
  RecoveryController.beginRecovery
);

router.post(
  '/complete',
  publicLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('code').isString().notEmpty(),
    body('new_password').isLength({ min: 8 }),
    body('new_kdf_salt').isString().notEmpty(),
    body('new_encrypted_private_key').isString().notEmpty(),
    validate,
    auditLog('recovery_complete', 'user'),
  ],
  RecoveryController.completeRecovery
);

export default router;
