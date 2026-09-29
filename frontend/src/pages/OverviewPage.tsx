import type { ReactNode, ElementType } from 'react';

import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Layers3,
  Radio,
  Send,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

import { Link } from 'react-router-dom';

import { api } from '../lib/api';

import {
  btnPrimary,
  card,
  ErrorBox,
  PageHeader,
  Spinner,
} from '../components/ui';

import type { QueueStats } from '../types';

type QueueKey =
  | 'waiting'
  | 'active'
  | 'delayed'
  | 'failed';

type MetricProps = {
  label: string;
  value: ReactNode;
  sub: string;
  icon: ElementType;
  to: string;
};

function Metric({
  label,
  value,
  sub,
  icon: Icon,
  to,
}: MetricProps) {
  return (
    <Link
      to={to}
      className={`${card} group relative overflow-hidden p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5`}
    >
      <div className="flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 transition-colors group-hover:border-indigo-100 group-hover:bg-indigo-50 group-hover:text-indigo-600">
          <Icon
            className="h-4 w-4"
            strokeWidth={1.8}
          />
        </div>

        <ArrowUpRight
          className="h-4 w-4 text-slate-300 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-indigo-500"
          strokeWidth={1.8}
        />
      </div>

      <div className="mt-5">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </p>

        <div className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
          {value}
        </div>

        <p className="mt-1 text-xs text-slate-500">
          {sub}
        </p>
      </div>
    </Link>
  );
}

function ServiceRow({
  label,
  ok,
}: {
  label: string;
  ok: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-3 last:border-b-0">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-md ${
            ok
              ? 'bg-emerald-50 text-emerald-600'
              : 'bg-red-50 text-red-600'
          }`}
        >
          {ok ? (
            <CheckCircle2
              className="h-4 w-4"
              strokeWidth={1.8}
            />
          ) : (
            <XCircle
              className="h-4 w-4"
              strokeWidth={1.8}
            />
          )}
        </span>

        <span className="text-sm font-medium text-slate-700">
          {label}
        </span>
      </div>

      <span
        className={`text-xs font-medium ${
          ok
            ? 'text-emerald-700'
            : 'text-red-700'
        }`}
      >
        {ok ? 'Operational' : 'Unavailable'}
      </span>
    </div>
  );
}

function QueueItem({
  label,
  value,
  description,
}: {
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="bg-white px-4 py-4">
      <p className="text-xs font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
        {value.toLocaleString()}
      </p>

      <p className="mt-1 text-[11px] text-slate-400">
        {description}
      </p>
    </div>
  );
}

export function OverviewPage() {
  const scheduled = useQuery({
    queryKey: ['count', 'scheduled'],
    queryFn: () =>
      api.emails('scheduled', 1, '', 1),
  });

  const sent = useQuery({
    queryKey: ['count', 'sent'],
    queryFn: () =>
      api.emails('sent', 1, '', 1),
  });

  const health = useQuery({
    queryKey: ['health'],
    queryFn: api.health,
    refetchInterval: 15000,
  });

  const queue = useQuery<QueueStats>({
    queryKey: ['queue'],
    queryFn: api.queueStats,
    refetchInterval: 5000,
  });
const queueValue = (key: QueueKey): number => {
  const value = queue.data?.counts?.[key];

  return typeof value === 'number'
    ? value
    : Number(value ?? 0);
 };
  const workerHealthy =
    Boolean(health.data?.checks?.worker);

  return (
    <>
      <PageHeader
        title="Overview"
        description="Current state of the outbound email system."
      />

      {/* Compose button */}
      <div className="mb-5">
        <Link
          to="/compose"
          className={`${btnPrimary} inline-flex items-center gap-2`}
        >
          <Send
            className="h-4 w-4"
            strokeWidth={1.8}
          />
          Compose email
        </Link>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Scheduled"
          value={
            scheduled.isLoading ? (
              <Spinner />
            ) : scheduled.isError ? (
              '—'
            ) : (
              scheduled.data?.total?.toLocaleString() ?? '0'
            )
          }
          sub="Emails waiting to be sent"
          icon={CalendarClock}
          to="/scheduled"
        />

        <Metric
          label="Sent"
          value={
            sent.isLoading ? (
              <Spinner />
            ) : sent.isError ? (
              '—'
            ) : (
              sent.data?.total?.toLocaleString() ?? '0'
            )
          }
          sub="Emails in delivery history"
          icon={Send}
          to="/sent"
        />

        <Metric
          label="Queue"
          value={
            queue.isLoading ? (
              <Spinner />
            ) : queue.isError ? (
              '—'
            ) : (
              queueValue('waiting').toLocaleString()
            )
          }
          sub={`${queueValue('active').toLocaleString()} active · ${queueValue(
            'delayed',
          ).toLocaleString()} delayed`}
          icon={Layers3}
          to="/settings"
        />

        <Metric
          label="Worker"
          value={
            health.isLoading ? (
              <Spinner />
            ) : workerHealthy ? (
              'Healthy'
            ) : (
              'Offline'
            )
          }
          sub="Background email worker"
          icon={Radio}
          to="/settings"
        />
      </div>

      {/* Queue + Health */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        {/* Queue */}
        <section className={`${card} overflow-hidden`}>
          <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Queue
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Current BullMQ job state.
              </p>
            </div>

            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-50 text-slate-500">
              <Clock3
                className="h-4 w-4"
                strokeWidth={1.8}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-px bg-slate-200 sm:grid-cols-4">
            <QueueItem
              label="Waiting"
              value={queueValue('waiting')}
              description="Waiting to run"
            />

            <QueueItem
              label="Active"
              value={queueValue('active')}
              description="Currently running"
            />

            <QueueItem
              label="Delayed"
              value={queueValue('delayed')}
              description="Scheduled for later"
            />

            <QueueItem
              label="Failed"
              value={queueValue('failed')}
              description="Jobs requiring attention"
            />
          </div>

          {queue.isError && (
            <div className="p-4">
              <ErrorBox message="Queue statistics are currently unavailable." />
            </div>
          )}

          {!queue.isError && (
            <div className="flex items-center gap-2 border-t border-slate-100 px-5 py-3">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>

              <span className="text-[11px] text-slate-400">
                Live queue data · refreshes every 5 seconds
              </span>
            </div>
          )}
        </section>

        {/* System health */}
        <section className={`${card} overflow-hidden`}>
          <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                System health
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Backend dependency checks.
              </p>
            </div>

            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-50 text-slate-500">
              <Activity
                className="h-4 w-4"
                strokeWidth={1.8}
              />
            </div>
          </div>

          <div className="px-5">
            {health.isLoading ? (
              <div className="flex justify-center py-10">
                <Spinner />
              </div>
            ) : health.isError ? (
              <div className="py-4">
                <ErrorBox message="Health check is currently unavailable." />
              </div>
            ) : (
              Object.entries(
                health.data?.checks ?? {},
              ).map(([key, value]) => (
                <ServiceRow
                  key={key}
                  label={
                    key.charAt(0).toUpperCase() +
                    key.slice(1)
                  }
                  ok={Boolean(value)}
                />
              ))
            )}
          </div>
        </section>
      </div>

      {/* Footer status */}
      <div className="mt-5 flex items-center gap-2 text-xs text-slate-400">
        <ShieldCheck
          className="h-3.5 w-3.5"
          strokeWidth={1.8}
        />

        <span>
          Live data from the running MailForge API.
          Queue statistics refresh automatically.
        </span>
      </div>
    </>
  );
}

