import { Router } from 'express';
import { body } from 'express-validator';
import { RegistrationController } from '../controllers/registrationController';
import { validate } from '../middleware/validation';
import { auditLog } from '../middleware/audit';
import { publicLimiter, registerLimiter } from '../middleware/rateLimit';

const router = Router();

router.post(
  '/init',
  registerLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    validate,
    auditLog('user_register_init', 'user'),
  ],
  RegistrationController.init
);

router.post(
  '/verify',
  publicLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('code').isString().isLength({ min: 6, max: 6 }),
    validate,
    auditLog('user_register_verify', 'user'),
  ],
  RegistrationController.verify
);

router.post(
  '/complete',
  publicLimiter,
  [
    body('registration_ticket').isString().notEmpty(),
    body('password').isLength({ min: 8 }),
    body('full_name').optional().trim(),
    body('phone').optional().trim(),
    body('kdf_salt').isString().notEmpty(),
    body('public_key').isString().notEmpty(),
    body('encrypted_private_key').isString().notEmpty(),
    validate,
    auditLog('user_register_complete', 'user'),
  ],
  RegistrationController.complete
);

export default router;
