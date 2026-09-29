import { senderRepository } from '../repositories/sender.repository';
import { createEtherealAccount } from '../integrations/ethereal.integration';
import { ApiError } from '../middleware/errorHandler';
import { CreateSenderInput } from '../validators/sender.validator';

export function listSenders(userId: string) {
  return senderRepository.findAllForUser(userId);
}

export function createSender(userId: string, input: CreateSenderInput) {
  return senderRepository.create({ userId, ...input });
}

export async function createEtherealSender(userId: string) {
  let account;
  try {
    account = await createEtherealAccount();
  } catch {
    throw new ApiError('Could not reach Ethereal to create a test inbox', 502, 'ETHEREAL_UNAVAILABLE');
  }
  return senderRepository.create({ userId, ...account });
}
