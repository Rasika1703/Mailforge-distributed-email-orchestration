
export type EmailStatus =
  | 'SENT'
  | 'SCHEDULED'
  | 'RATE_LIMITED'
  | 'PROCESSING'
  | 'FAILED';

export interface User {
  id: string;
  email: string;
  name?: string | null;
  picture?: string | null;
}

export interface Sender {
  id: string;
  email: string;
  smtpHost: string;
  smtpPort: number;
  createdAt: string;
}

export interface EmailRow {
  id: string;
  recipient: string;
  subject: string;
  bodySnippet?: string | null;
  sender: string;
  status: EmailStatus;
  scheduledAt: string | null;
  sentAt: string | null;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ScheduleInput {
  senderId: string;
  subject: string;
  body: string;
  recipients: string[];
  startTime: string;
  minDelayMs: number;
  hourlyLimit: number;
}

export interface ScheduleResult {
  scheduled: number;
  totalDetected: number;
  invalid: number;
  duplicatesInBatch: number;
  alreadyScheduledOrSent: number;
  [key: string]: unknown;
}

export interface SlackStatus {
  connected: boolean;
  teamId?: string | null;
  teamName?: string | null;
}

export interface HealthReport {
  status: 'ok' | 'degraded';
  checks: {
    database: boolean;
    redis: boolean;
    elasticsearch: boolean;
    worker: boolean;
  };
}

export interface QueueStats {
  counts:{
    waiting: number;
    delayed: number;
    active: number;
    completed: number;
    failed: number;
  };

  health: {
    status: 'ok' | 'degraded';
    checks: {
      database: boolean;
      redis: boolean;
      elasticsearch: boolean;
      worker: boolean;
    };
  };
}

