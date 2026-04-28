import { Router } from 'express';
import { body, query } from 'express-validator';
import { InvitationController } from '../controllers/invitationController';
import { validate } from '../middleware/validation';
import { auditLog } from '../middleware/audit';
import { publicLimiter } from '../middleware/rateLimit';

const router = Router();

router.get(
  '/',
  publicLimiter,
  [
    query('token').isString().notEmpty(),
    validate,
    auditLog('invitation_view', 'recipient'),
  ],
  InvitationController.getInvitation
);

router.post(
  '/accept',
  publicLimiter,
  [
    body('token').isString().notEmpty(),
    body('kdf_salt').isString().notEmpty(),
    body('public_key').isString().notEmpty(),
    body('encrypted_private_key').isString().notEmpty(),
    validate,
    auditLog('invitation_accept', 'recipient'),
  ],
  InvitationController.acceptInvitation
);

export default router;
