import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Mail,
  CalendarClock,
  Inbox,
  AlertTriangle,
} from 'lucide-react';

import { api, errMsg } from '../lib/api';
import type { EmailRow, Paginated } from '../types';

type Props = {
  kind: 'scheduled' | 'sent';
};

function formatDate(value: string | null) {
  if (!value) return '—';

  return new Date(value).toLocaleString();
}

function getSenderEmail(sender: unknown): string {
  if (typeof sender === 'string') {
    return sender;
  }

  if (
    sender !== null &&
    typeof sender === 'object' &&
    'email' in sender
  ) {
    const value = (sender as { email?: unknown }).email;

    if (typeof value === 'string') {
      return value;
    }
  }

  return '—';
}

function StatusBadge({
  status,
}: {
  status: EmailRow['status'];
}) {
  const styles: Record<EmailRow['status'], string> = {
    SCHEDULED:
      'bg-blue-50 text-blue-700 border-blue-200',
    RATE_LIMITED:
      'bg-amber-50 text-amber-700 border-amber-200',
    PROCESSING:
      'bg-indigo-50 text-indigo-700 border-indigo-200',
    SENT:
      'bg-emerald-50 text-emerald-700 border-emerald-200',
    FAILED:
      'bg-red-50 text-red-700 border-red-200',
  };

  const labels: Record<EmailRow['status'], string> = {
    SCHEDULED: 'Scheduled',
    RATE_LIMITED: 'Rate limited',
    PROCESSING: 'Processing',
    SENT: 'Sent',
    FAILED: 'Failed',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${styles[status]}`}
    >
      {status === 'RATE_LIMITED' && (
        <AlertTriangle className="h-3.5 w-3.5" />
      )}

      {labels[status]}
    </span>
  );
}

function Spinner() {
  return (
    <span
      className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900"
      aria-label="Loading"
    />
  );
}

export function EmailListPage({ kind }: Props) {
  const [page, setPage] = useState(1);
  const [text, setText] = useState('');
  const [q, setQ] = useState('');

  const query = useQuery({
    queryKey: ['emails', kind, page, q],
    queryFn: () => api.emails(kind, page, q),
    placeholderData: keepPreviousData,
  });

  const isScheduled = kind === 'scheduled';

  const title = isScheduled
    ? 'Scheduled emails'
    : 'Sent emails';

  const description = isScheduled
    ? 'Emails currently waiting for delivery.'
    : 'Email delivery history from MailForge.';

  const data = query.data as Paginated<EmailRow> | undefined;

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? 20;

  const pages = Math.max(
    1,
    Math.ceil(total / pageSize),
  );

  function submitSearch(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setPage(1);
    setQ(text.trim());
  }

  function clearSearch() {
    setText('');
    setQ('');
    setPage(1);
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">
          {title}
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          {description}
        </p>
      </div>

      {/* Main card */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Toolbar */}
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <form
              className="flex w-full max-w-2xl gap-2"
              onSubmit={submitSearch}
              role="search"
            >
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  aria-label="Search emails"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  placeholder="Search recipient, subject or message"
                  value={text}
                  onChange={(event) =>
                    setText(event.target.value)
                  }
                />
              </div>

              <button
                type="submit"
                className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Search
              </button>

              {q && (
                <button
                  type="button"
                  className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={clearSearch}
                >
                  Clear
                </button>
              )}
            </form>

            <button
              type="button"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
              onClick={() => query.refetch()}
              disabled={query.isFetching}
              title="Refresh emails"
              aria-label="Refresh emails"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  query.isFetching
                    ? 'animate-spin'
                    : ''
                }`}
              />
            </button>
          </div>
        </div>

        {/* Information bar */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500">
              {isScheduled ? (
                <CalendarClock className="h-3.5 w-3.5" />
              ) : (
                <Inbox className="h-3.5 w-3.5" />
              )}
            </div>

            <span className="text-xs text-slate-500">
              {total.toLocaleString()} email
              {total === 1 ? '' : 's'}

              {q && (
                <>
                  {' '}
                  matching{' '}
                  <span className="font-medium text-slate-700">
                    "{q}"
                  </span>
                </>
              )}
            </span>
          </div>

          <span className="hidden text-xs text-slate-400 sm:block">
            {pageSize} per page
          </span>
        </div>

        {/* Loading */}
        {query.isLoading && (
          <div className="flex min-h-[360px] items-center justify-center">
            <Spinner />
          </div>
        )}

        {/* Error */}
        {query.isError && (
          <div className="p-6">
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-800">
                Unable to load emails
              </p>

              <p className="mt-1 text-xs text-red-600">
                {errMsg(query.error)}
              </p>

              <button
                type="button"
                onClick={() => query.refetch()}
                className="mt-3 rounded-md bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Empty */}
        {!query.isLoading &&
          !query.isError &&
          items.length === 0 && (
            <div className="flex min-h-[360px] flex-col items-center justify-center p-8 text-center">
              <Mail className="h-10 w-10 text-slate-300" />

              <p className="mt-3 text-sm font-semibold text-slate-700">
                {q
                  ? `No emails match "${q}".`
                  : `No ${kind} emails yet.`}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                {q
                  ? 'Try a different search.'
                  : 'Emails will appear here when available.'}
              </p>
            </div>
          )}

        {/* Table */}
        {!query.isLoading &&
          !query.isError &&
          items.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Recipient
                    </th>

                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Subject
                    </th>

                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Sender
                    </th>

                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>

                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      {isScheduled
                        ? 'Scheduled'
                        : 'Sent'}
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {items.map((email) => (
                    <tr
                      key={email.id}
                      className="hover:bg-slate-50/70"
                    >
                      {/* Recipient */}
                      <td className="px-5 py-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500">
                            <Mail className="h-3.5 w-3.5" />
                          </div>

                          <span
                            className="max-w-[220px] truncate font-medium text-slate-800"
                            title={email.recipient}
                          >
                            {email.recipient}
                          </span>
                        </div>
                      </td>

                      {/* Subject */}
                      <td className="max-w-[400px] px-5 py-4">
                        <div
                          className="truncate font-medium text-slate-800"
                          title={
                            email.subject ||
                            '(No subject)'
                          }
                        >
                          {email.subject ||
                            '(No subject)'}
                        </div>

                        {email.bodySnippet && (
                          <div
                            className="mt-1 max-w-[360px] truncate text-xs text-slate-400"
                            title={email.bodySnippet}
                          >
                            {email.bodySnippet
                              .replace(
                                /<[^>]+>/g,
                                '',
                              )
                              .trim()}
                          </div>
                        )}
                      </td>

                      {/* Sender */}
                      <td className="px-5 py-4">
                        <span
                          className="block max-w-[220px] truncate text-slate-500"
                          title={getSenderEmail(
                            email.sender,
                          )}
                        >
                          {getSenderEmail(
                            email.sender,
                          )}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <StatusBadge
                          status={email.status}
                        />
                      </td>

                      {/* Time */}
                      <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">
                        {formatDate(
                          isScheduled
                            ? email.scheduledAt
                            : email.sentAt ??
                              email.scheduledAt,
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        {/* Pagination */}
        {data && total > pageSize && (
          <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
            <span className="text-xs text-slate-500">
              Showing{' '}
              <span className="font-medium text-slate-700">
                {(page - 1) * pageSize + 1}
              </span>
              {'–'}
              <span className="font-medium text-slate-700">
                {Math.min(
                  page * pageSize,
                  total,
                )}
              </span>{' '}
              of{' '}
              <span className="font-medium text-slate-700">
                {total.toLocaleString()}
              </span>
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={page <= 1}
                onClick={() =>
                  setPage(
                    (current) => current - 1,
                  )
                }
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="px-2 text-xs text-slate-500">
                {page} / {pages}
              </span>

              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={page >= pages}
                onClick={() =>
                  setPage(
                    (current) => current + 1,
                  )
                }
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

