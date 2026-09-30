import axios from 'axios';

import type {
  HealthReport,
  Paginated,
  QueueStats,
  ScheduleInput,
  ScheduleResult,
  Sender,
  SlackStatus,
  User,
  EmailRow,
} from '../types';

const API_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:4000';

export const http = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
  timeout: 15000,
});

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  message?: string;
  error?: unknown;
};

function unwrap<T>(
  response: { data: ApiEnvelope<T> | T },
): T {
  const body = response.data;

  if (
    body &&
    typeof body === 'object' &&
    'data' in body &&
    (body as ApiEnvelope<T>).data !== undefined
  ) {
    return (body as ApiEnvelope<T>).data as T;
  }

  return body as T;
}

export const api = {
  
  me: () =>
    http
      .get<ApiEnvelope<User> | User>('/auth/me')
      .then(unwrap<User>),

  logout: () =>
    http.post('/auth/logout'),

  googleUrl: `${API_URL}/api/auth/google`,


  emails: (
    kind: 'scheduled' | 'sent',
    page = 1,
    q = '',
    pageSize = 20,
  ) =>
    (
      q.trim()
        ? http.get<
            ApiEnvelope<Paginated<EmailRow>> |
            Paginated<EmailRow>
          >('/emails/search', {
            params: {
              q: q.trim(),
              status:
                kind === 'scheduled'
                  ? 'SCHEDULED'
                  : 'SENT',
              page,
              pageSize,
            },
          })
        : http.get<
            ApiEnvelope<Paginated<EmailRow>> |
            Paginated<EmailRow>
          >(`/emails/${kind}`, {
            params: {
              page,
              pageSize,
            },
          })
    ).then(unwrap<Paginated<EmailRow>>),

  

  senders: () =>
    http
      .get<ApiEnvelope<Sender[]> | Sender[]>('/senders')
      .then(unwrap<Sender[]>),

  createEtherealSender: () =>
    http
      .post<ApiEnvelope<Sender> | Sender>(
        '/senders/ethereal',
      )
      .then(unwrap<Sender>),

  addSender: (body: {
    email: string;
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPass: string;
  }) =>
    http
      .post<ApiEnvelope<Sender> | Sender>(
        '/senders',
        body,
      )
      .then(unwrap<Sender>),

  

  schedule: (body: ScheduleInput) =>
    http
      .post<
        ApiEnvelope<ScheduleResult> |
        ScheduleResult
      >('/emails/schedule', body)
      .then(unwrap<ScheduleResult>),

 

  health: () =>
    http
      .get<
        ApiEnvelope<HealthReport> |
        HealthReport
      >('/health')
      .then(unwrap<HealthReport>),

  

  queueStats: () =>
    http
      .get<ApiEnvelope<QueueStats> | QueueStats>(
        '/queue/stats',
      )
      .then(unwrap<QueueStats>),



  slackStatus: () =>
    http
      .get<
        ApiEnvelope<SlackStatus> |
        SlackStatus
      >('/slack/status')
      .then(unwrap<SlackStatus>),

  disconnectSlack: () =>
    http
      .post('/slack/disconnect')
      .then(() => undefined),

  slackConnectUrl:
    `${API_URL}/api/slack/connect`,
};


export function errMsg(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const response = error.response;

    if (!response) {
      return 'The API could not be reached. Make sure the backend is running.';
    }

    const data = response.data as
      | {
          error?:
            | {
                message?: string;
                code?: string;
              }
            | string;
          message?: string;
        }
      | undefined;

    if (typeof data?.error === 'string') {
      return data.error;
    }

    if (
      data?.error &&
      typeof data.error === 'object' &&
      'message' in data.error
    ) {
      return (
        data.error.message ??
        `Request failed (${response.status}).`
      );
    }

    return (
      data?.message ??
      `Request failed (${response.status}).`
    );
  }

  return error instanceof Error
    ? error.message
    : 'Unexpected error.';
}