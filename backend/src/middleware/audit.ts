import { Request, Response, NextFunction } from 'express';
import { AuditLog } from '../models';

// Тип для функции получения ID сущности
type EntityIdGetter = (req: Request, res: Response) => string | undefined;

export const auditLog = (
  action: string,
  entityType?: string,
  getEntityId?: EntityIdGetter
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Сохраняем оригинальный метод send
    const originalSend = res.send;
    const originalJson = res.json;
    
    // Перехватываем отправку ответа
    res.send = function(body?: any): Response {
      logAudit(action, entityType, getEntityId, req, res, body);
      return originalSend.call(this, body);
    };
    
    res.json = function(body?: any): Response {
      logAudit(action, entityType, getEntityId, req, res, body);
      return originalJson.call(this, body);
    };
    
    next();
  };
};

// Функция логирования
const logAudit = async (
  action: string,
  entityType: string | undefined,
  getEntityId: EntityIdGetter | undefined,
  req: Request,
  res: Response,
  responseBody?: any
) => {
  try {
    // Не логируем аудит для самих логов
    if (req.path.includes('/audit')) return;
    
    // Подготовка данных для лога
    const details: any = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
    };
    
    // Добавляем тело запроса (кроме паролей)
    if (req.body && !action.includes('login') && !action.includes('register')) {
      const safeBody = { ...req.body };
      if (safeBody.password) safeBody.password = '[REDACTED]';
      if (safeBody.password_hash) safeBody.password_hash = '[REDACTED]';
      details.requestBody = safeBody;
    }
    
    // Добавляем тело ответа для некоторых действий
    if (responseBody && (action.includes('create') || action.includes('update'))) {
      details.responseBody = responseBody;
    }
    
    // Создаем запись в логе
    await AuditLog.create({
      user_id: req.user?.id,
      action,
      entity_type: entityType,
      entity_id: getEntityId ? getEntityId(req, res) : undefined,
      details,
      ip_address: req.ip || req.socket.remoteAddress,
      user_agent: req.get('User-Agent'),
    });
    
  } catch (error) {
    console.error('Audit log error:', error);
  }
};