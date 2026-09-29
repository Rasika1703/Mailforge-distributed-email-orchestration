import { z } from 'zod';

export const createSenderSchema = z.object({
  email: z.string().email(),
  smtpHost: z.string().trim().min(1),
  smtpPort: z.number().int().min(1).max(65535),
  smtpUser: z.string().trim().min(1),
  smtpPassword: z.string().trim().min(1),
});

export type CreateSenderInput = z.infer<typeof createSenderSchema>;
