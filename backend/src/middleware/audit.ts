import { Request, Response, NextFunction } from 'express';
import { AuditLog } from '../models';

type EntityIdGetter = (
  req: Request,
  res: Response,
  responseBody?: any
) => string | undefined;

export const auditLog = (
  action: string,
  entityType?: string,
  getEntityId?: EntityIdGetter
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    let alreadyLogged = false;

    res.json = function (body?: any): Response {
      if (!alreadyLogged) {
        alreadyLogged = true;
        void logAudit(action, entityType, getEntityId, req, res, body);
      }
      return originalJson(body);
    };

    next();
  };
};

const logAudit = async (
  action: string,
  entityType: string | undefined,
  getEntityId: EntityIdGetter | undefined,
  req: Request,
  res: Response,
  responseBody?: any
) => {
  try {
    if (req.path.includes('/audit')) return;

    const details: any = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
    };

    if (req.body && !action.includes('login') && !action.includes('register')) {
      const safeBody = { ...req.body };
      if (safeBody.password) safeBody.password = '[REDACTED]';
      if (safeBody.password_hash) safeBody.password_hash = '[REDACTED]';
      details.requestBody = safeBody;
    }

    if (responseBody && (action.includes('create') || action.includes('add') || action.includes('update'))) {
      details.responseBody = responseBody;
    }

    const entityId = getEntityId ? getEntityId(req, res, responseBody) : undefined;

    await AuditLog.create({
      user_id: req.user?.id,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
      ip_address: req.ip || req.socket.remoteAddress,
      user_agent: req.get('User-Agent'),
    });
  } catch (error) {
    console.error('Audit log error:', error);
  }
};