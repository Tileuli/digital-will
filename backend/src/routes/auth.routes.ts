import { Router } from 'express';
import { body } from 'express-validator';
import { AuthController } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { auditLog } from '../middleware/audit';
import { loginLimiter } from '../middleware/rateLimit';

const router = Router();

router.post(
  '/login',
  loginLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
    validate,
    auditLog('user_login', 'user'),
  ],
  AuthController.login
);

router.post(
  '/login/totp',
  loginLimiter,
  [
    body('totp_challenge').isString().notEmpty(),
    body('code').isString().notEmpty(),
    validate,
    auditLog('user_login_totp', 'user'),
  ],
  AuthController.loginVerifyTotp
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
