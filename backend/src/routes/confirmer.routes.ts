import { Router } from 'express';
import { body } from 'express-validator';
import { ConfirmerController } from '../controllers/confirmerController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { auditLog } from '../middleware/audit';
import { publicLimiter } from '../middleware/rateLimit';

const owner = Router();

owner.get('/', authenticate, ConfirmerController.list);

owner.post(
  '/',
  authenticate,
  [
    body('email').isEmail().normalizeEmail(),
    body('name').isString().notEmpty().trim(),
    body('relationship').optional().isString().trim(),
    validate,
    auditLog('confirmer_add', 'user', (req) => req.user?.id),
  ],
  ConfirmerController.add
);

owner.delete(
  '/:id',
  authenticate,
  auditLog('confirmer_remove', 'user', (req) => req.user?.id),
  ConfirmerController.remove
);

owner.post(
  '/threshold',
  authenticate,
  [
    body('required_confirmations').isInt({ min: 0, max: 20 }),
    validate,
    auditLog('confirmer_threshold', 'user', (req) => req.user?.id),
  ],
  ConfirmerController.setThreshold
);

const publicRouter = Router();

publicRouter.post(
  '/invite/lookup',
  publicLimiter,
  [body('token').isString().notEmpty(), validate],
  ConfirmerController.lookupInvite
);

publicRouter.post(
  '/invite/accept',
  publicLimiter,
  [
    body('token').isString().notEmpty(),
    validate,
    auditLog('confirmer_accept', 'user'),
  ],
  ConfirmerController.acceptInvite
);

publicRouter.post(
  '/vote/lookup',
  publicLimiter,
  [body('token').isString().notEmpty(), validate],
  ConfirmerController.lookupVote
);

publicRouter.post(
  '/vote',
  publicLimiter,
  [
    body('token').isString().notEmpty(),
    body('vote').isIn(['yes', 'no']),
    validate,
    auditLog('confirmer_vote', 'user'),
  ],
  ConfirmerController.submitVote
);

export { owner as confirmerOwnerRouter, publicRouter as confirmerPublicRouter };
