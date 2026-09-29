import { Request, Response } from 'express';
import { getQueueStats } from '../services/queue.service';
import { sendSuccess } from '../utils/apiResponse';

export async function stats(_req: Request, res: Response): Promise<void> {
  sendSuccess(res, await getQueueStats());
}
