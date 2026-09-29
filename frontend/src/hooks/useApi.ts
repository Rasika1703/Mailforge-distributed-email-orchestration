import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { api } from '../lib/api';

import type {
  EmailRow,
  Paginated,
  ScheduleInput,
  ScheduleResult,
  Sender,
  SlackStatus,
} from '../types';

export type EmailListKind = 'scheduled' | 'sent';

export function useEmailList(
  kind: EmailListKind,
  page: number,
  pageSize: number,
  q: string,
) {
  const searching = q.trim().length > 0;

  return useQuery<Paginated<EmailRow>>({
    queryKey: [
      'emails',
      searching ? 'search' : kind,
      page,
      pageSize,
      q,
    ],

    queryFn: () =>
      api.emails(
        kind,
        page,
        q,
        pageSize,
      ),

    placeholderData: keepPreviousData,

    refetchInterval:
      kind === 'scheduled' && !searching
        ? 15_000
        : false,
  });
}

export function useSenders() {
  return useQuery<Sender[]>({
    queryKey: ['senders'],
    queryFn: () => api.senders(),
  });
}

export function useCreateEtherealSender() {
  const queryClient = useQueryClient();

  return useMutation<Sender, Error>({
    mutationFn: () => api.createEtherealSender(),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['senders'],
      });
    },
  });
}

export interface NewSenderInput {
  email: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
}

export function useCreateSender() {
  const queryClient = useQueryClient();

  return useMutation<Sender, Error, NewSenderInput>({
    mutationFn: (input) =>
      api.addSender({
        email: input.email,
        smtpHost: input.smtpHost,
        smtpPort: input.smtpPort,
        smtpUser: input.smtpUser,
        smtpPass: input.smtpPassword,
      }),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['senders'],
      });
    },
  });
}

export function useScheduleEmails() {
  const queryClient = useQueryClient();

  return useMutation<
    ScheduleResult,
    Error,
    ScheduleInput
  >({
    mutationFn: (input) => api.schedule(input),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['emails'],
      });
    },
  });
}

export function useSlackStatus() {
  return useQuery<SlackStatus>({
    queryKey: ['slack'],
    queryFn: () => api.slackStatus(),
  });
}

export function useDisconnectSlack() {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error>({
    mutationFn: () => api.disconnectSlack(),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['slack'],
      });
    },
  });
}

