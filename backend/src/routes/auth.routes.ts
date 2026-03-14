import { Router } from 'express';
import { body } from 'express-validator';
import { AuthController } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { auditLog } from '../middleware/audit';

const router = Router();

router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('full_name').optional().trim(),
    body('phone').optional().trim(),
    validate,
    auditLog('user_register', 'user')
  ],
  AuthController.register
);

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
    validate,
    auditLog('user_login', 'user')
  ],
  AuthController.login
);

router.get(
  '/me',
  authenticate,
  auditLog('user_get_profile', 'user', (req) => req.user?.id),
  AuthController.getCurrentUser
);

router.post(
  '/logout',
  authenticate,
  auditLog('user_logout', 'user', (req) => req.user?.id),
  AuthController.logout
);

export default router;