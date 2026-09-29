import clsx from 'clsx';
import type { EmailStatus } from '../types';

const config: Record<EmailStatus, { label: string; dot: string; text: string }> = {
  SCHEDULED: { label: 'Scheduled', dot: 'bg-slate-400', text: 'text-slate-700' },
  PROCESSING: { label: 'Sending', dot: 'bg-blue-500', text: 'text-blue-700' },
  RATE_LIMITED: { label: 'Rate limited', dot: 'bg-amber-500', text: 'text-amber-700' },
  SENT: { label: 'Sent', dot: 'bg-emerald-500', text: 'text-emerald-700' },
  FAILED: { label: 'Failed', dot: 'bg-red-500', text: 'text-red-700' },
};

export function StatusBadge({ status }: { status: EmailStatus }): JSX.Element {
  const c = config[status];
  return (
    <span className={clsx('inline-flex items-center gap-1.5 text-xs font-medium', c.text)}>
      <span className={clsx('h-1.5 w-1.5 rounded-full', c.dot)} aria-hidden />
      {c.label}
    </span>
  );
}
