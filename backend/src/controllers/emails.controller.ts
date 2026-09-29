import { Request, Response } from 'express';
import { scheduleEmailSchema, paginationSchema, searchQuerySchema } from '../validators/email.validator';
import * as emailService from '../services/email.service';
import * as searchService from '../services/search.service';
import { sendSuccess } from '../utils/apiResponse';

export async function schedule(req: Request, res: Response): Promise<void> {
  const input = scheduleEmailSchema.parse(req.body);
  const result = await emailService.scheduleEmails(req.userId!, input);
  sendSuccess(res, result, 'Emails scheduled', 201);
}

export async function listScheduled(req: Request, res: Response): Promise<void> {
  const { page, pageSize } = paginationSchema.parse(req.query);
  const result = await emailService.getScheduledEmails(req.userId!, page, pageSize);
  sendSuccess(res, result);
}

export async function listSent(req: Request, res: Response): Promise<void> {
  const { page, pageSize } = paginationSchema.parse(req.query);
  const result = await emailService.getSentEmails(req.userId!, page, pageSize);
  sendSuccess(res, result);
}

export async function getById(req: Request, res: Response): Promise<void> {
  const email = await emailService.getEmailById(req.userId!, req.params.id);
  sendSuccess(res, email);
}

export async function searchEmails(req: Request, res: Response): Promise<void> {
  const params = searchQuerySchema.parse(req.query);
  const result = await searchService.search({ userId: req.userId!, ...params });
  sendSuccess(res, result);
}
