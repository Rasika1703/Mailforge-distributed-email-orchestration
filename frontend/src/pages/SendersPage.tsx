import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Loader2,
  Mail,
  Plus,
  Server,
  Trash2,
  XCircle,
} from 'lucide-react';

import { api, errMsg } from '../lib/api';

type SenderForm = {
  email: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
};

const initialForm: SenderForm = {
  email: '',
  smtpHost: 'smtp.gmail.com',
  smtpPort: 587,
  smtpUser: '',
  smtpPass: '',
};

export function SendersPage() {
  const queryClient = useQueryClient();

  const [form, setForm] = useState<SenderForm>(initialForm);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sendersQuery = useQuery({
    queryKey: ['senders'],
    queryFn: api.senders,
  });

  const addSenderMutation = useMutation({
    mutationFn: api.addSender,

    onSuccess: () => {
      setMessage('Sender added successfully.');
      setError(null);
      setForm(initialForm);

      queryClient.invalidateQueries({
        queryKey: ['senders'],
      });
    },

    onError: (err) => {
      setError(errMsg(err));
      setMessage(null);
    },
  });

  const etherealMutation = useMutation({
    mutationFn: api.createEtherealSender,

    onSuccess: () => {
      setMessage('Ethereal test sender created successfully.');
      setError(null);

      queryClient.invalidateQueries({
        queryKey: ['senders'],
      });
    },

    onError: (err) => {
      setError(errMsg(err));
      setMessage(null);
    },
  });

  const updateField = <K extends keyof SenderForm>(
    field: K,
    value: SenderForm[K],
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setMessage(null);
    setError(null);

    if (!form.email.trim()) {
      setError('Email is required.');
      return;
    }

    if (!form.smtpHost.trim()) {
      setError('SMTP host is required.');
      return;
    }

    if (!form.smtpUser.trim()) {
      setError('SMTP username is required.');
      return;
    }

    if (!form.smtpPass.trim()) {
      setError('SMTP password is required.');
      return;
    }

    addSenderMutation.mutate({
      email: form.email.trim(),
      smtpHost: form.smtpHost.trim(),
      smtpPort: Number(form.smtpPort),
      smtpUser: form.smtpUser.trim(),
      smtpPass: form.smtpPass,
    });
  };

  const senders = sendersQuery.data ?? [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
            <Mail className="h-5 w-5" />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">
              Senders
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage the SMTP accounts used to send your emails.
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          {message}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <XCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Add sender */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <div className="flex items-center gap-3">
              <Plus className="h-5 w-5 text-slate-700" />

              <div>
                <h2 className="font-semibold text-slate-950">
                  Add SMTP sender
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Connect an email account using its SMTP credentials.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-5 p-6">
            {/* Email */}
            <Field
              label="Email address"
              value={form.email}
              placeholder="you@gmail.com"
              type="email"
              onChange={(value) =>
                updateField('email', value)
              }
            />

            <div className="grid gap-5 sm:grid-cols-[1fr_140px]">
              <Field
                label="SMTP host"
                value={form.smtpHost}
                placeholder="smtp.gmail.com"
                onChange={(value) =>
                  updateField('smtpHost', value)
                }
              />

              <Field
                label="SMTP port"
                value={String(form.smtpPort)}
                type="number"
                placeholder="587"
                onChange={(value) =>
                  updateField('smtpPort', Number(value))
                }
              />
            </div>

            <Field
              label="SMTP username"
              value={form.smtpUser}
              placeholder="you@gmail.com"
              onChange={(value) =>
                updateField('smtpUser', value)
              }
            />

            <Field
              label="SMTP password"
              value={form.smtpPass}
              placeholder="App password"
              type="password"
              onChange={(value) =>
                updateField('smtpPass', value)
              }
            />

            <button
              type="submit"
              disabled={addSenderMutation.isPending}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {addSenderMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Adding sender...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add sender
                </>
              )}
            </button>
          </form>
        </section>

        {/* Test sender */}
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Server className="h-5 w-5" />
          </div>

          <h2 className="mt-4 font-semibold text-slate-950">
            Test with Ethereal
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Create a temporary test SMTP account without using your real
            email credentials.
          </p>

          <button
            type="button"
            onClick={() => {
              setMessage(null);
              setError(null);
              etherealMutation.mutate();
            }}
            disabled={etherealMutation.isPending}
            className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {etherealMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Create test sender
              </>
            )}
          </button>
        </section>
      </div>

      {/* Existing senders */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="font-semibold text-slate-950">
            Connected senders
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Email accounts currently connected to your workspace.
          </p>
        </div>

        {sendersQuery.isLoading ? (
          <div className="flex items-center justify-center gap-2 px-6 py-12 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading senders...
          </div>
        ) : senders.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Mail className="mx-auto h-8 w-8 text-slate-300" />

            <p className="mt-3 text-sm font-medium text-slate-600">
              No senders connected
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Add an SMTP sender above to start scheduling emails.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {senders.map((sender) => (
              <div
                key={sender.id}
                className="flex items-center gap-4 px-6 py-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                  <Mail className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-800">
                    {sender.email}
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    {sender.smtpHost}:{sender.smtpPort}
                  </div>
                </div>

                <div className="hidden items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 sm:flex">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Connected
                </div>

                <button
                  type="button"
                  disabled
                  title="Delete sender"
                  className="rounded-lg p-2 text-slate-300"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  placeholder,
  type = 'text',
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  type?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold text-slate-700">
        {label}
      </span>

      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5"
      />
    </label>
  );
}