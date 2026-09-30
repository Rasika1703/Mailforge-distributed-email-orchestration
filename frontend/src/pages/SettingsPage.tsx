
import { useState } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  ExternalLink,
  Plus,
  Slack as SlackIcon,
} from 'lucide-react';

import { api, errMsg } from '../lib/api';

import {
  btnPrimary,
  btnSecondary,
  card,
  Empty,
  ErrorBox,
  Field,
  fmt,
  input,
  PageHeader,
  Spinner,
} from '../components/ui';

function Senders() {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ['senders'],
    queryFn: api.senders,
  });

  const [open, setOpen] = useState(false);

  const [f, setF] = useState({
    email: '',
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
  });

  const set = (
    key: keyof typeof f,
    value: string | number,
  ) => {
    setF((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const add = useMutation({
    mutationFn: () =>
      api.addSender({
        email: f.email,
        smtpHost: f.smtpHost,
        smtpPort: Number(f.smtpPort),
        smtpUser: f.smtpUser,
        smtpPassword: f.smtpPassword,
      }),

    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ['senders'],
      });

      setOpen(false);

      setF({
        email: '',
        smtpHost: '',
        smtpPort: 587,
        smtpUser: '',
        smtpPassword: '',
      });
    },
  });

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Sender accounts
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            SMTP credentials used for outbound delivery.
          </p>
        </div>

        {!open && (
          <button
            type="button"
            className={`${btnPrimary} inline-flex items-center gap-2`}
            onClick={() => setOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add sender
          </button>
        )}
      </div>

      {open && (
        <form
          className={`${card} mb-5 grid gap-4 p-5 sm:grid-cols-2`}
          onSubmit={(event) => {
            event.preventDefault();
            add.mutate();
          }}
        >
          <Field label="From email">
            <input
              required
              type="email"
              className={input}
              value={f.email}
              onChange={(event) =>
                set('email', event.target.value)
              }
              placeholder="you@example.com"
            />
          </Field>

          <Field label="SMTP host">
            <input
              required
              className={input}
              value={f.smtpHost}
              onChange={(event) =>
                set('smtpHost', event.target.value)
              }
              placeholder="smtp.example.com"
            />
          </Field>

          <Field label="SMTP port">
            <input
              required
              type="number"
              min={1}
              max={65535}
              className={input}
              value={f.smtpPort}
              onChange={(event) =>
                set('smtpPort', Number(event.target.value))
              }
            />
          </Field>

          <Field label="SMTP user">
            <input
              required
              className={input}
              value={f.smtpUser}
              onChange={(event) =>
                set('smtpUser', event.target.value)
              }
              placeholder="SMTP username"
            />
          </Field>

          <Field label="SMTP password">
            <input
              required
              type="password"
              autoComplete="new-password"
              className={input}
              value={f.smtpPassword}
              onChange={(event) =>
                set('smtpPassword', event.target.value)
              }
              placeholder="SMTP password"
            />
          </Field>

          <div className="flex items-center gap-2 sm:col-span-2">
            {add.isError && (
              <div className="mr-auto">
                <ErrorBox message={errMsg(add.error)} />
              </div>
            )}

            <button
              type="button"
              className={btnSecondary}
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>

            <button
              type="submit"
              className={`${btnPrimary} inline-flex items-center gap-2`}
              disabled={add.isPending}
            >
              {add.isPending && <Spinner />}
              Save sender
            </button>
          </div>
        </form>
      )}

      {list.isError ? (
        <ErrorBox
          message={errMsg(list.error)}
          onRetry={() => list.refetch()}
        />
      ) : (
        <div className={`${card} overflow-hidden`}>
          {list.isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : !list.data?.length ? (
            <Empty
              title="No sender accounts configured."
              action={
                !open ? (
                  <button
                    type="button"
                    className={btnSecondary}
                    onClick={() => setOpen(true)}
                  >
                    Add first sender
                  </button>
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">
                      Email
                    </th>

                    <th className="px-4 py-3">
                      SMTP
                    </th>

                    <th className="px-4 py-3">
                      Added
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {list.data.map((sender) => (
                    <tr key={sender.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {sender.email}
                      </td>

                      <td className="px-4 py-3 text-slate-500">
                        {sender.smtpHost}:{sender.smtpPort}
                      </td>

                      <td className="px-4 py-3 text-xs text-slate-500">
                        {fmt(sender.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Integrations() {
  const slack = useQuery({
    queryKey: ['slack'],
    queryFn: api.slackStatus,
  });

  return (
    <section className="mt-8">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-slate-900">
          Integrations
        </h2>

        <p className="mt-1 text-xs text-slate-500">
          Connected services used by the platform.
        </p>
      </div>

      <div className={`${card} divide-y divide-slate-100`}>
        <div className="flex items-center gap-4 p-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#4a154b] text-white">
            <SlackIcon className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-slate-900">
              Slack
            </div>

            <div className="mt-0.5 text-xs text-slate-500">
              {slack.isLoading
                ? 'Checking connection…'
                : slack.isError
                  ? errMsg(slack.error)
                  : slack.data?.connected
                    ? `Connected${
                        slack.data.teamName
                          ? ` to ${slack.data.teamName}`
                          : ''
                      }.`
                    : 'Not connected.'}
            </div>
          </div>

          {!slack.isLoading && !slack.isError && (
            <a
              href={api.slackConnectUrl}
              className={`${btnSecondary} inline-flex items-center gap-2`}
            >
              {slack.data?.connected
                ? 'Reconnect'
                : 'Connect'}

              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

export function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage sender accounts and integrations."
      />

      <Senders />

      <Integrations />
    </>
  );
}
