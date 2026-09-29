import { Request, Response } from 'express';
import { createSenderSchema } from '../validators/sender.validator';
import * as senderService from '../services/sender.service';
import { sendSuccess } from '../utils/apiResponse';

export async function list(req: Request, res: Response): Promise<void> {
  const senders = await senderService.listSenders(req.userId!);
  sendSuccess(res, senders);
}

export async function create(req: Request, res: Response): Promise<void> {
  const input = createSenderSchema.parse(req.body);
  const sender = await senderService.createSender(req.userId!, input);
  const { smtpPassword: _omit, ...safe } = sender;
  sendSuccess(res, safe, 'Sender created', 201);
}

export async function createEthereal(req: Request, res: Response): Promise<void> {
  const sender = await senderService.createEtherealSender(req.userId!);
  const { smtpPassword: _omit, ...safe } = sender;
  sendSuccess(res, safe, 'Ethereal sender created', 201);
}
