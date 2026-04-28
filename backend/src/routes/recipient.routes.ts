import { Router } from 'express';
import { body, param } from 'express-validator';
import { RecipientController } from '../controllers/recipientController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { auditLog } from '../middleware/audit';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  [
    body('email').isEmail().normalizeEmail(),
    body('name').notEmpty().trim(),
    body('relationship').optional().trim(),
    validate,
    auditLog('recipient_add', 'recipient', (_req, _res, body) => body?.recipient?.id),
  ],
  RecipientController.addRecipient
);

router.get(
  '/',
  auditLog('recipients_list', 'recipient'),
  RecipientController.getRecipients
);

router.post(
  '/:id/resend-invitation',
  [
    param('id').isUUID(),
    validate,
    auditLog('recipient_resend_invite', 'recipient', (req) => req.params.id),
  ],
  RecipientController.resendInvitation
);

router.delete(
  '/:id',
  [
    param('id').isUUID(),
    validate,
    auditLog('recipient_delete', 'recipient', (req) => req.params.id),
  ],
  RecipientController.deleteRecipient
);

export default router;
