import { Router } from 'express';
import { body } from 'express-validator';
import { KdfMigrationController } from '../controllers/kdfMigrationController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { auditLog } from '../middleware/audit';

const router = Router();

router.post(
  '/migrate',
  authenticate,
  [
    body('password').isString().notEmpty(),
    body('new_kdf_algorithm').isIn(['pbkdf2', 'argon2id']),
    body('new_kdf_salt').isString().notEmpty(),
    body('new_encrypted_private_key').isString().notEmpty(),
    validate,
    auditLog('kdf_migrate', 'user', (req) => req.user?.id),
  ],
  KdfMigrationController.migrate
);

export default router;
