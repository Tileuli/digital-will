import { Router } from 'express';
import { body, query } from 'express-validator';
import { ClaimController } from '../controllers/claimController';
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
    auditLog('claim_view', 'release_token'),
  ],
  ClaimController.getClaim
);

router.post(
  '/accessed',
  publicLimiter,
  [
    body('token').isString().notEmpty(),
    validate,
    auditLog('claim_accessed', 'release_token'),
  ],
  ClaimController.markClaimed
);

export default router;
