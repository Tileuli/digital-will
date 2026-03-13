import { Router } from 'express';
import { body } from 'express-validator';
import { VaultController } from '../controllers/vaultController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { auditLog } from '../middleware/audit';

const router = Router();

// Все маршруты требуют аутентификации
router.use(authenticate);

// Создание сейфа
router.post(
  '/',
  [
    body('encrypted_data').notEmpty(),
    body('metadata').optional(),
    validate,
    auditLog('vault_create', 'vault')
  ],
  VaultController.createVault
);

// Получение всех сейфов
router.get(
  '/',
  auditLog('vaults_list', 'vault'),
  VaultController.getVaults
);

// Получение конкретного сейфа
router.get(
  '/:id',
  auditLog('vault_view', 'vault', (req) => req.params.id),
  VaultController.getVault
);

// Обновление сейфа
router.put(
  '/:id',
  [
    body('encrypted_data').optional().notEmpty(),
    body('metadata').optional(),
    body('is_active').optional().isBoolean(),
    validate,
    auditLog('vault_update', 'vault', (req) => req.params.id)
  ],
  VaultController.updateVault
);

// Удаление сейфа
router.delete(
  '/:id',
  auditLog('vault_delete', 'vault', (req) => req.params.id),
  VaultController.deleteVault
);

export default router;