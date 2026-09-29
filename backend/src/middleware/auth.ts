import { NextFunction, Request, Response } from 'express';
import { ApiError } from './errorHandler';


declare global {
 
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}


export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const userId = req.session?.userId;
  if (!userId) {
    throw new ApiError('Not authenticated', 401, 'UNAUTHENTICATED');
  }
  req.userId = userId;
  next();
}
