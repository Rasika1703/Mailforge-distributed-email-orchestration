export interface FakeEmail {
  id: string;
  userId: string;
  senderId: string;
  recipient: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: Date;
  sentAt: Date | null;
  messageId: string | null;
  attempts: number;
  jobId: string;
}

export const db = {
  emails: new Map<string, FakeEmail>(),
  senders: new Map<string, { id: string; userId: string; email: string }>(),
  transactions: 0,
  inFlight: 0,
  maxInFlight: 0,
  reset() {
    this.emails.clear();
    this.senders.clear();
    this.transactions = 0;
    this.inFlight = 0;
    this.maxInFlight = 0;
  },
};

const claimable = new Set(['SCHEDULED', 'RATE_LIMITED']);

function released(id: string) {
  if (db.emails.get(id)?.status === 'PROCESSING') db.inFlight -= 1;
}

export const prismaFake = {
  email: {
    create: (args: { data: Partial<FakeEmail> }) => {
      const row = {
        status: 'SCHEDULED', attempts: 0, sentAt: null, messageId: null, ...args.data,
      } as FakeEmail;
      db.emails.set(row.id, row);
      return Promise.resolve(row);
    },
  },
  $transaction: async (ops: Promise<unknown>[]) => {
    db.transactions += 1;
    return Promise.all(ops);
  },
};

export const emailRepositoryFake = {
  findById: async (id: string) => db.emails.get(id) ?? null,
  findWithSenderEmail: async (id: string) => {
    const e = db.emails.get(id);
    return e ? { ...e, sender: { email: db.senders.get(e.senderId)?.email ?? 'unknown@example.com' } } : null;
  },
  claimForProcessing: async (id: string) => {
    const e = db.emails.get(id);
    if (!e || !claimable.has(e.status)) return false;
    e.status = 'PROCESSING';
    db.inFlight += 1;
    db.maxInFlight = Math.max(db.maxInFlight, db.inFlight);
    return true;
  },
  revertToScheduled: async (id: string) => {
    const e = db.emails.get(id);
    if (e?.status === 'PROCESSING') { released(id); e.status = 'SCHEDULED'; }
  },
  markRateLimited: async (id: string, at: Date) => {
    const e = db.emails.get(id);
    if (e?.status === 'PROCESSING') { released(id); e.status = 'RATE_LIMITED'; e.scheduledAt = at; }
  },
  updateStatus: async (id: string, status: string, extra: Partial<FakeEmail> = {}) => {
    released(id);
    Object.assign(db.emails.get(id)!, { status, ...extra });
  },
  incrementAttempts: async (id: string) => { db.emails.get(id)!.attempts += 1; },
  countPendingForSender: async (senderId: string) =>
    [...db.emails.values()].filter((e) => e.senderId === senderId && ['SCHEDULED', 'PROCESSING', 'RATE_LIMITED'].includes(e.status)).length,
  findExistingRecipients: async (userId: string, recipients: string[]) => {
    const wanted = new Set(recipients);
    return new Set(
      [...db.emails.values()]
        .filter((e) => e.userId === userId && wanted.has(e.recipient) && ['SCHEDULED', 'PROCESSING', 'SENT', 'RATE_LIMITED'].includes(e.status))
        .map((e) => e.recipient),
    );
  },
  findPendingAfter: async (afterId: string, take: number) =>
    [...db.emails.values()]
      .filter((e) => e.id > afterId && claimable.has(e.status))
      .sort((a, b) => (a.id < b.id ? -1 : 1))
      .slice(0, take)
      .map((e) => ({ id: e.id, scheduledAt: e.scheduledAt })),
};

export const senderRepositoryFake = {
  findById: async (id: string, userId: string) => {
    const s = db.senders.get(id);
    return s && s.userId === userId ? s : null;
  },
  findByIdWithCredentials: async (id: string) => {
    const s = db.senders.get(id);
    return s ? { ...s, smtpHost: 'h', smtpPort: 1, smtpUser: 'u', smtpPassword: 'p' } : null;
  },
};
