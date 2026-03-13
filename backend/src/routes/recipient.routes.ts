import { Router } from 'express';
import { body } from 'express-validator';
import { RecipientController } from '../controllers/recipientController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { auditLog } from '../middleware/audit';

const router = Router();

router.use(authenticate);

// Добавление получателя
router.post(
  '/',
  [
    body('email').isEmail().normalizeEmail(),
    body('name').notEmpty().trim(),
    body('public_key').optional(),
    body('relationship').optional().trim(),
    validate,
    auditLog('recipient_add', 'recipient', (req) => req.body.email)
  ],
  RecipientController.addRecipient
);

// Получение всех получателей
router.get(
  '/',
  auditLog('recipients_list', 'recipient'),
  RecipientController.getRecipients
);

// Удаление получателя
router.delete(
  '/:id',
  auditLog('recipient_delete', 'recipient', (req) => req.params.id),
  RecipientController.deleteRecipient
);

export default router;