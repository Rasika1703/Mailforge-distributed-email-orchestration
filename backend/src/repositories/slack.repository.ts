import { prisma } from '../config/prisma';

export interface UpsertSlackConnectionInput {
  userId: string;
  accessToken: string;
  teamId: string;
  channelId: string;
}

export const slackRepository = {
  findByUserId(userId: string) {
    return prisma.slackConnection.findUnique({ where: { userId } });
  },

  upsert(data: UpsertSlackConnectionInput) {
    return prisma.slackConnection.upsert({
      where: { userId: data.userId },
      create: data,
      update: {
        accessToken: data.accessToken,
        teamId: data.teamId,
        channelId: data.channelId,
      },
    });
  },

  delete(userId: string) {
    return prisma.slackConnection.deleteMany({ where: { userId } });
  },
};
