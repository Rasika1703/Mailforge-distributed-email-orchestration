import { Request, Response } from 'express';
import { getHealthReport } from '../services/health.service';

export async function getHealth(_req: Request, res: Response): Promise<void> {
  const report = await getHealthReport();
  const statusCode = report.status === 'ok' ? 200 : 503;
  res.status(statusCode).json({ success: true, data: report, message: report.status });
}
