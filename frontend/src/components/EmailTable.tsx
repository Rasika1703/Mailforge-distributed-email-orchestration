import type { EmailRow } from '../types';
import { formatDateTime } from '../lib/format';
import { StatusBadge } from './StatusBadge';

interface Props {
  rows: EmailRow[];
  /** Which timestamp to show: scheduled time, or sent time (falls back to scheduled for failures). */
  timeColumn: 'scheduled' | 'sent';
  /** Search results mix statuses and may carry a highlighted body snippet. */
  searching?: boolean;
}

const th = 'px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-500';

export function EmailTable({ rows, timeColumn, searching }: Props): JSX.Element {
  const timeLabel = searching ? 'Time' : timeColumn === 'scheduled' ? 'Scheduled for' : 'Sent at';
  const timeOf = (r: EmailRow) => {
    if (searching) return r.sentAt ?? r.scheduledAt;
    return timeColumn === 'scheduled' ? r.scheduledAt : r.sentAt ?? r.scheduledAt;
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className={th}>Recipient</th>
            <th className={th}>Subject</th>
            <th className={`${th} hidden md:table-cell`}>Sender</th>
            <th className={th}>{timeLabel}</th>
            <th className={th}>Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-slate-50/70">
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-900">{r.recipient}</td>
              <td className="max-w-xs px-4 py-3 text-sm text-slate-700">
                <div className="truncate" title={r.subject}>
                  {r.subject}
                </div>
                {r.bodySnippet && (
                  <div
                    className="mt-0.5 truncate text-xs text-slate-500 [&_mark]:rounded-sm [&_mark]:bg-amber-100 [&_mark]:text-slate-900"
                    // The server highlights with encoder "html": everything except our own <mark> tags is escaped.
                    dangerouslySetInnerHTML={{ __html: r.bodySnippet }}
                  />
                )}
              </td>
              <td className="hidden whitespace-nowrap px-4 py-3 text-sm text-slate-500 md:table-cell">{r.sender}</td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500">{formatDateTime(timeOf(r))}</td>
              <td className="whitespace-nowrap px-4 py-3">
                <StatusBadge status={r.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }): JSX.Element {
  return (
    <div className="divide-y divide-slate-100" aria-busy="true" aria-label="Loading emails">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5">
          <div className="h-3.5 w-40 animate-pulse rounded bg-slate-100" />
          <div className="h-3.5 flex-1 animate-pulse rounded bg-slate-100" />
          <div className="hidden h-3.5 w-28 animate-pulse rounded bg-slate-100 md:block" />
          <div className="h-3.5 w-16 animate-pulse rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}
