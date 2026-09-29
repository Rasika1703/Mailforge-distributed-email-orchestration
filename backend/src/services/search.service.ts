import { emailRepository } from '../repositories/email.repository';
import {
  EmailSearchDoc,
  EmailSearchResult,
  SearchParams,
  bulkIndex,
  indexEmailSafe,
  searchEmails,
} from '../integrations/elasticsearch.integration';
import { logger } from '../config/logger';
import { ApiError } from '../middleware/errorHandler';

interface IndexableEmail {
  id: string;
  userId: string;
  recipient: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: Date;
  sentAt: Date | null;
}

export function toSearchDoc(email: IndexableEmail, senderEmail: string): EmailSearchDoc {
  return {
    id: email.id,
    userId: email.userId,
    sender: senderEmail,
    recipient: email.recipient,
    subject: email.subject,
    body: email.body,
    status: email.status,
    scheduledAt: email.scheduledAt.toISOString(),
    sentAt: email.sentAt ? email.sentAt.toISOString() : null,
  };
}


export async function syncEmailToSearch(emailId: string): Promise<void> {
  try {
    const email = await emailRepository.findWithSenderEmail(emailId);
    if (!email) return;
    await indexEmailSafe(toSearchDoc(email, email.sender.email));
  } catch (err) {
    logger.warn({ err: (err as Error).message, emailId }, 'Search sync failed (non-fatal)');
  }
}

export async function indexScheduledBatch(emails: IndexableEmail[], senderEmail: string): Promise<void> {
  try {
    await bulkIndex(emails.map((e) => toSearchDoc(e, senderEmail)));
  } catch (err) {
    logger.warn({ err: (err as Error).message, count: emails.length }, 'Bulk search indexing failed (non-fatal)');
  }
}

export async function search(params: SearchParams): Promise<EmailSearchResult> {
  try {
    return await searchEmails(params);
  } catch (err) {
    
    logger.error({ err: (err as Error).message }, 'Elasticsearch search failed');
    throw new ApiError('Search is temporarily unavailable', 503, 'SEARCH_UNAVAILABLE');
  }
}
