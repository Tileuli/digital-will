import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models';

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

interface JwtPayload {
  id: string;
  email: string;
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Please authenticate' });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      console.error('JWT_SECRET is not set');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    const decoded = jwt.verify(token, secret) as JwtPayload;
    const user = await User.findByPk(decoded.id);

    if (!user || !user.is_active) {
      return res.status(401).json({ message: 'Please authenticate' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Please authenticate' });
  }
};

export const checkAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};