import { Email, EmailStatus, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

export interface CreateEmailInput {
  userId: string;
  senderId: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: Date;
  jobId: string;
}


const STALE_PROCESSING_MS = 5 * 60 * 1000;
export const emailRepository = {
  create(data: CreateEmailInput, tx: Prisma.TransactionClient = prisma) {
    return tx.email.create({ data });
  },

  findById(id: string) {
    return prisma.email.findUnique({ where: { id } });
  },

  findWithSenderEmail(id: string) {
    return prisma.email.findUnique({
      where: { id },
      include: { sender: { select: { email: true } } },
    });
  },

 
  findPendingAfter(afterId: string, take: number) {
    return prisma.email.findMany({
      where: { id: { gt: afterId }, status: { in: ['SCHEDULED', 'RATE_LIMITED'] } },
      orderBy: { id: 'asc' },
      take,
      select: { id: true, scheduledAt: true },
    });
  },

  findByJobId(jobId: string) {
    return prisma.email.findUnique({ where: { jobId } });
  },

  async updateStatus(
    id: string,
    status: EmailStatus,
    extra: Partial<Pick<Email, 'sentAt' | 'messageId' | 'attempts'>> = {},
  ) {
    return prisma.email.update({
      where: { id },
      data: { status, ...extra },
    });
  },

  incrementAttempts(id: string) {
    return prisma.email.update({
      where: { id },
      data: { attempts: { increment: 1 } },
    });
  },

  
  async claimForProcessing(id: string): Promise<boolean> {
    const staleBefore = new Date(Date.now() - STALE_PROCESSING_MS);
    const result = await prisma.email.updateMany({
      where: {
        id,
        OR: [
          { status: { in: ['SCHEDULED', 'RATE_LIMITED'] } },
          { status: 'PROCESSING', updatedAt: { lt: staleBefore } },
        ],
      },
      data: { status: 'PROCESSING' },
    });
    return result.count === 1;
  },

  
  async revertToScheduled(id: string): Promise<void> {
    await prisma.email.updateMany({
      where: { id, status: 'PROCESSING' },
      data: { status: 'SCHEDULED' },
    });
  },

 
  async markRateLimited(id: string, nextAttemptAt: Date): Promise<void> {
    await prisma.email.updateMany({
      where: { id, status: 'PROCESSING' },
      data: { status: 'RATE_LIMITED', scheduledAt: nextAttemptAt },
    });
  },

  countPendingForSender(senderId: string) {
    return prisma.email.count({
      where: { senderId, status: { in: ['SCHEDULED', 'PROCESSING', 'RATE_LIMITED'] } },
    });
  },

  async getStatus(id: string): Promise<EmailStatus | null> {
    const row = await prisma.email.findUnique({ where: { id }, select: { status: true } });
    return row?.status ?? null;
  },

  findScheduled(userId: string, page: number, pageSize: number) {
    return prisma.email.findMany({
      where: { userId, status: { in: ['SCHEDULED', 'PROCESSING', 'RATE_LIMITED'] } },
      orderBy: { scheduledAt: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { sender: { select: { email: true } } },
    });
  },

  countScheduled(userId: string) {
    return prisma.email.count({
      where: { userId, status: { in: ['SCHEDULED', 'PROCESSING', 'RATE_LIMITED'] } },
    });
  },

  findSent(userId: string, page: number, pageSize: number) {
    return prisma.email.findMany({
      where: { userId, status: { in: ['SENT', 'FAILED'] } },
      orderBy: { sentAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { sender: { select: { email: true } } },
    });
  },

  countSent(userId: string) {
    return prisma.email.count({ where: { userId, status: { in: ['SENT', 'FAILED'] } } });
  },

  countByStatus(userId: string, status: EmailStatus) {
    return prisma.email.count({ where: { userId, status } });
  },

 
  async findExistingRecipients(userId: string, recipients: string[]): Promise<Set<string>> {
    if (recipients.length === 0) return new Set();
    const rows = await prisma.email.findMany({
      where: {
        userId,
        recipient: { in: recipients },
        status: { in: ['SCHEDULED', 'PROCESSING', 'SENT', 'RATE_LIMITED'] },
      },
      select: { recipient: true },
    });
    return new Set(rows.map((r: { recipient: string }) => r.recipient));
  },
};
