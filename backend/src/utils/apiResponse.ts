import { Response } from 'express';

export function sendSuccess<T>(res: Response, data: T, message = 'Success', statusCode = 200): void {
  res.status(statusCode).json({ success: true, data, message });
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 400,
  code = 'BAD_REQUEST',
): void {
  res.status(statusCode).json({ success: false, message, error: { code } });
}
