import type { ReactNode } from 'react';

export const card =
  'rounded-xl border border-slate-200 bg-white shadow-sm';

export const input =
  'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50';

export const textarea =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50';

export const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50';

export const btnSecondary =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';

export function PageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
        {title}
      </h1>

      {description && (
        <p className="mt-1 text-sm leading-6 text-slate-500">
          {description}
        </p>
      )}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </span>

      {children}

      {hint && (
        <span className="mt-1.5 block text-xs leading-4 text-slate-400">
          {hint}
        </span>
      )}
    </label>
  );
}

export function Spinner() {
  return (
    <span
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900"
      aria-label="Loading"
      role="status"
    />
  );
}

export function ErrorBox({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      role="alert"
    >
      <div>{message}</div>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 font-semibold underline underline-offset-2 hover:text-red-800"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function SuccessBox({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
      role="status"
    >
      {children}
    </div>
  );
}

export function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="p-6 text-center">
      <p className="text-sm font-medium text-slate-600">
        {title}
      </p>

      {description && (
        <p className="mt-1 text-xs text-slate-400">
          {description}
        </p>
      )}

      {action && (
        <div className="mt-4">
          {action}
        </div>
      )}
    </div>
  );
}

export function StatusBadge({
  status,
}: {
  status: string;
}) {
  const normalized = status
    .trim()
    .toUpperCase()
    .replace(/[-\s]+/g, '_');

  const config: Record<
    string,
    {
      label: string;
      className: string;
    }
  > = {
    SENT: {
      label: 'Sent',
      className:
        'border-emerald-200 bg-emerald-50 text-emerald-700',
    },

    SCHEDULED: {
      label: 'Scheduled',
      className:
        'border-blue-200 bg-blue-50 text-blue-700',
    },

    RATE_LIMITED: {
      label: 'Rate limited',
      className:
        'border-amber-200 bg-amber-50 text-amber-700',
    },

    RATE_LIMIT: {
      label: 'Rate limited',
      className:
        'border-amber-200 bg-amber-50 text-amber-700',
    },

    PROCESSING: {
      label: 'Processing',
      className:
        'border-violet-200 bg-violet-50 text-violet-700',
    },

    FAILED: {
      label: 'Failed',
      className:
        'border-red-200 bg-red-50 text-red-700',
    },
  };

  const current = config[normalized] ?? {
    label: status,
    className:
      'border-slate-200 bg-slate-50 text-slate-600',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${current.className}`}
    >
      {current.label}
    </span>
  );
}

export function fmt(
  value: string | null | undefined,
): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString();
}

