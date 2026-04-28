import { Router } from 'express';
import { AuditController } from '../controllers/auditController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/me', authenticate, AuditController.getMyLogs);

export default router;
