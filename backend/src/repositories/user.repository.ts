import { prisma } from '../config/prisma';

export interface UpsertGoogleUserInput {
  googleId: string;
  name: string;
  email: string;
  avatar?: string;
}

export const userRepository = {
  findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  findByGoogleId(googleId: string) {
    return prisma.user.findUnique({ where: { googleId } });
  },


  upsertFromGoogle(data: UpsertGoogleUserInput) {
    return prisma.user.upsert({
      where: { googleId: data.googleId },
      create: data,
      update: { name: data.name, email: data.email, avatar: data.avatar },
    });
  },
};
