import { Router } from 'express';
import { body, param } from 'express-validator';
import { VaultController } from '../controllers/vaultController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { auditLog } from '../middleware/audit';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  [
    body('encrypted_data').isString().notEmpty(),
    body('metadata').optional(),
    validate,
    auditLog('vault_create', 'vault', (_req, _res, body) => body?.vault?.id),
  ],
  VaultController.createVault
);

router.get(
  '/',
  auditLog('vault_list', 'vault'),
  VaultController.getVaults
);

router.get(
  '/:id',
  [
    param('id').isUUID(),
    validate,
    auditLog('vault_get', 'vault', (req) => req.params.id),
  ],
  VaultController.getVaultById
);

router.put(
  '/:id',
  [
    param('id').isUUID(),
    body('encrypted_data').optional().isString(),
    body('metadata').optional(),
    body('is_active').optional().isBoolean(),
    validate,
    auditLog('vault_update', 'vault', (req) => req.params.id),
  ],
  VaultController.updateVault
);

router.delete(
  '/:id',
  [
    param('id').isUUID(),
    validate,
    auditLog('vault_delete', 'vault', (req) => req.params.id),
  ],
  VaultController.deleteVault
);

export default router;