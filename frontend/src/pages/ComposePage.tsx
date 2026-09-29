
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Papa from 'papaparse';
import { Upload, Users, Send, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

import { api, errMsg } from '../lib/api';
import type { ScheduleResult } from '../types';
const EMAIL_RE = /[^\s,;"<>]+@[^\s,;"<>]+\.[^\s,;"<>]+/g;

function localNow(): string {
  const date = new Date();

  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);

  return local.toISOString().slice(0, 16);
}

export function ComposePage() {
  const queryClient = useQueryClient();

  const senders = useQuery({
    queryKey: ['senders'],
    queryFn: api.senders,
  });

  const [form, setForm] = useState({
    senderId: '',
    subject: '',
    body: '',
    recipients: '',
    startTime: localNow(),
    delaySec: 5,
    hourlyLimit: 5,
  });

  const [result, setResult] = useState<ScheduleResult | null>(null);

  function updateField<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  const recipients = Array.from(
    new Set(form.recipients.match(EMAIL_RE) ?? []),
  );

  const mutation = useMutation({
    mutationFn: () => {
      const senderId =
        form.senderId || senders.data?.[0]?.id;

      if (!senderId) {
        throw new Error('Please configure a sender account.');
      }

      return api.schedule({
        senderId,
        subject: form.subject,
        body: form.body,
        recipients,
        startTime: new Date(form.startTime).toISOString(),
        minDelayMs: Math.round(form.delaySec * 1000),
        hourlyLimit: form.hourlyLimit,
      });
    },

    onSuccess: (response) => {
      setResult(response);

      queryClient.invalidateQueries({
        queryKey: ['emails'],
      });

      queryClient.invalidateQueries({
        queryKey: ['queue'],
      });

      queryClient.invalidateQueries({
        queryKey: ['count'],
      });
    },
  });

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      /*
       * PDF
       */
      if (
        file.type === 'application/pdf' ||
        file.name.toLowerCase().endsWith('.pdf')
      ) {
        const pdfjsLib = await import(
          'pdfjs-dist/legacy/build/pdf.mjs'
        );

        const worker = await import(
          'pdfjs-dist/legacy/build/pdf.worker.mjs?url'
        );

        pdfjsLib.GlobalWorkerOptions.workerSrc = worker.default;

        const buffer = await file.arrayBuffer();

        const pdf = await pdfjsLib.getDocument({
          data: new Uint8Array(buffer),
        }).promise;

        let extractedText = '';

        for (
          let pageNumber = 1;
          pageNumber <= pdf.numPages;
          pageNumber++
        ) {
          const page = await pdf.getPage(pageNumber);

          const textContent = await page.getTextContent();

          for (const item of textContent.items) {
            if ('str' in item) {
              extractedText += `${item.str} `;
            }
          }

          extractedText += '\n';
        }

        const emails = Array.from(
          new Set(extractedText.match(EMAIL_RE) ?? []),
        );

        updateField('recipients', emails.join('\n'));

        if (emails.length === 0) {
          window.alert(
            'PDF was read, but no email addresses were found.',
          );
        }

        return;
      }

      /*
       * CSV
       */
      Papa.parse<string[]>(file, {
        complete: (parsed) => {
          const text = parsed.data
            .flat()
            .join('\n');

          const emails = Array.from(
            new Set(text.match(EMAIL_RE) ?? []),
          );

          updateField(
            'recipients',
            emails.join('\n'),
          );

          if (emails.length === 0) {
            window.alert(
              'No email addresses were found in this CSV.',
            );
          }
        },

        error: (error) => {
          console.error(
            'CSV parsing error:',
            error,
          );

          window.alert(
            'Failed to read the CSV file.',
          );
        },
      });
    } catch (error) {
      console.error(
        'File import failed:',
        error,
      );

      window.alert(
        error instanceof Error
          ? `Failed to read the file: ${error.message}`
          : 'Failed to read the file.',
      );
    } finally {
      event.target.value = '';
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setResult(null);

    mutation.mutate();
  }

  /*
   * Loading senders
   */
  if (senders.isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="text-sm text-slate-500">
          Loading sender accounts...
        </div>
      </div>
    );
  }

  /*
   * Sender API error
   */
  if (senders.isError) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold text-slate-950">
          Compose
        </h1>

        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          Unable to load sender accounts.
        </div>
      </div>
    );
  }

  /*
   * No sender configured
   */
  if (!senders.data?.length) {
    return (
      <div className="mx-auto max-w-xl">
        <h1 className="text-2xl font-bold text-slate-950">
          Compose
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Create a scheduled outbound email batch.
        </p>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-7 shadow-sm">
          <h2 className="font-semibold text-slate-900">
            No sender account
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Add an SMTP sender before scheduling email.
          </p>

          <Link
            to="/settings"
            className="mt-5 inline-flex h-10 items-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Configure sender
          </Link>
        </div>
      </div>
    );
  }

  const selectedSender =
    form.senderId || senders.data[0].id;

  return (
    <div>
      {/* Header */}
      <div className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">
          Compose
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Create a scheduled outbound batch.
        </p>
      </div>

      <form
        onSubmit={submit}
        className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]"
      >
        {/* Main form */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-5">

            {/* Sender */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Sender
              </label>

              <select
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                value={selectedSender}
                onChange={(event) =>
                  updateField(
                    'senderId',
                    event.target.value,
                  )
                }
              >
                {senders.data.map((sender) => (
                  <option
                    key={sender.id}
                    value={sender.id}
                  >
                    {sender.email}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Subject
              </label>

              <input
                required
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                value={form.subject}
                onChange={(event) =>
                  updateField(
                    'subject',
                    event.target.value,
                  )
                }
                placeholder="Subject line"
              />
            </div>

            {/* Message */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Message
              </label>

              <textarea
                required
                rows={10}
                className="w-full resize-y rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                value={form.body}
                onChange={(event) =>
                  updateField(
                    'body',
                    event.target.value,
                  )
                }
                placeholder="Write the message to be sent."
              />
            </div>

            {/* Recipients */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700">
                  Recipients
                </label>

                <span className="text-xs text-slate-400">
                  {recipients.length} unique address
                  {recipients.length === 1
                    ? ''
                    : 'es'}{' '}
                  detected
                </span>
              </div>

              <textarea
                required
                rows={7}
                className="w-full resize-y rounded-lg border border-slate-300 px-3 py-3 font-mono text-xs outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                value={form.recipients}
                onChange={(event) =>
                  updateField(
                    'recipients',
                    event.target.value,
                  )
                }
                placeholder={`one@example.com
two@example.com`}
              />
            </div>

            {/* Import */}
            <div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50">
                <Upload className="h-4 w-4" />

                Import CSV/PDF

                <input
                  type="file"
                  accept=".csv,text/csv,.pdf,application/pdf"
                  className="hidden"
                  onChange={importFile}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Right controls */}
        <div className="space-y-4">

          {/* Delivery controls */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              Delivery controls
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              These values control scheduling and rate limiting.
            </p>

            <div className="mt-5 space-y-4">

              {/* Start time */}
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-700">
                  Start time
                </label>

                <input
                  type="datetime-local"
                  required
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  value={form.startTime}
                  onChange={(event) =>
                    updateField(
                      'startTime',
                      event.target.value,
                    )
                  }
                />
              </div>

              {/* Delay */}
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-700">
                  Delay between emails
                </label>

                <p className="mb-2 text-[11px] text-slate-400">
                  Seconds between actual sends.
                </p>

                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    required
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 pr-12 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                    value={form.delaySec}
                    onChange={(event) =>
                      updateField(
                        'delaySec',
                        Number(event.target.value),
                      )
                    }
                  />

                  <span className="absolute right-3 top-2.5 text-xs text-slate-400">
                    sec
                  </span>
                </div>
              </div>

              {/* Hourly limit */}
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-700">
                  Hourly limit
                </label>

                <input
                  type="number"
                  min={1}
                  required
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  value={form.hourlyLimit}
                  onChange={(event) =>
                    updateField(
                      'hourlyLimit',
                      Number(event.target.value),
                    )
                  }
                />
              </div>
            </div>
          </div>

          {/* Batch summary */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Users className="h-4 w-4 text-slate-500" />
              Batch summary
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">
                  Recipients
                </span>

                <b className="text-slate-800">
                  {recipients.length}
                </b>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-slate-500">
                  First send
                </span>

                <b className="text-right text-slate-800">
                  {new Date(
                    form.startTime,
                  ).toLocaleString()}
                </b>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">
                  Rate
                </span>

                <b className="text-slate-800">
                  {form.hourlyLimit}/hour
                </b>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">
                  Delay
                </span>

                <b className="text-slate-800">
                  {form.delaySec}s
                </b>
              </div>
            </div>
          </div>

          {/* Error */}
          {mutation.isError && (
            <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />

              <span>
                {errMsg(mutation.error)}
              </span>
            </div>
          )}

          {/* Success */}
          {result && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800">
              <p className="font-semibold">
                {result.scheduled} of{' '}
                {result.totalDetected} recipients
                scheduled.
              </p>

              <p className="mt-1">
                {result.invalid} invalid,{' '}
                {result.duplicatesInBatch} duplicates,{' '}
                {result.alreadyScheduledOrSent}{' '}
                already scheduled or sent.
              </p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={
              mutation.isPending ||
              recipients.length === 0
            }
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-4 w-4" />

            {mutation.isPending
              ? 'Scheduling...'
              : 'Schedule emails'}
          </button>
        </div>
      </form>
    </div>
  );
}

