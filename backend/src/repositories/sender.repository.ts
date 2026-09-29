import { prisma } from '../config/prisma';
import { decryptSecret, encryptSecret } from '../utils/crypto';

export interface CreateSenderInput {
  userId: string;
  email: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
}

export const senderRepository = {
  create(data: CreateSenderInput) {
    return prisma.sender.create({ data: { ...data, smtpPassword: encryptSecret(data.smtpPassword) } });
  },

  findAllForUser(userId: string) {
    return prisma.sender.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        email: true,
        smtpHost: true,
        smtpPort: true,
        smtpUser: true,
        createdAt: true,
      },
    });
  },

  findById(id: string, userId: string) {
    return prisma.sender.findFirst({ where: { id, userId } });
  },

 
  async findByIdWithCredentials(id: string) {
    const sender = await prisma.sender.findUnique({ where: { id } });
    if (!sender) return null;
    return { ...sender, smtpPassword: decryptSecret(sender.smtpPassword) };
  },
};
