import { z } from 'zod';

export const scheduleEmailSchema = z.object({
  senderId: z.string().uuid(),
  subject: z.string().trim().min(1, 'Subject is required').max(998),
  body: z.string().trim().min(1, 'Body is required'),
  recipients: z
    .array(z.string())
    .min(1, 'At least one recipient is required')
    .max(50000, 'Too many recipients in a single batch'),
  startTime: z.coerce.date().refine((d) => d.getTime() > Date.now() - 60_000, {
    message: 'startTime must not be in the past',
  }),
 
  minDelayMs: z.number().int().min(0).max(3_600_000).optional(),
  hourlyLimit: z.number().int().min(1).max(100_000).optional(),
});

export type ScheduleEmailInput = z.infer<typeof scheduleEmailSchema>;

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const searchQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  status: z.enum(['SCHEDULED', 'PROCESSING', 'SENT', 'FAILED', 'RATE_LIMITED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
