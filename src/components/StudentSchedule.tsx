"use client";

import { ArrowLeft, CalendarDays, Search, Youtube } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const BATCHES = [
  { value: "", label: "All batches" },
  { value: "SELECTION_PRO", label: "Selection Pro Batch" },
  { value: "SELECTION_1_0", label: "Selection 1.0 Batch" },
  { value: "ARAMBH", label: "Arambh Batch" },
  { value: "MANZIL", label: "Manzil Batch" },
  { value: "UDAAN", label: "Udaan Batch (Class 10th)" },
];

interface ScheduleEntry {
  id: string;
  batch: string;
  classDate: string;
  startTime: string;
  endTime: string | null;
  subject: string;
  teacherName: string | null;
  topic: string;
  youtubeLink: string | null;
  notes: string | null;
}

export function StudentSchedule() {
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [filterBatch, setFilterBatch] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (batch: string, searchTerm: string) => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (batch) query.set("batch", batch);
      if (searchTerm) query.set("search", searchTerm);

      const response = await fetch("/api/schedule?" + query.toString(), {
        cache: "no-store",
      });
      const data = (await response.json()) as { schedules?: ScheduleEntry[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not load schedule.");
      setSchedules(data.schedules ?? []);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not load schedule.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load(filterBatch, search);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [filterBatch, search, load]);

  return (
    <main className="min-h-dvh bg-white dark:bg-atomic-navy">
      <div className="mx-auto max-w-4xl px-4 py-7 sm:px-6">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-atomic-orange" />
            <div>
              <p className="text-sm font-medium text-atomic-orange">Atomic Pathshala</p>
              <h1 className="text-2xl font-bold">Class Schedule</h1>
            </div>
          </div>
          <Link
            href="/"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="mr-1 inline h-4 w-4" />
            Return to chat
          </Link>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by subject or teacher name..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-atomic-orange dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
          <select
            value={filterBatch}
            onChange={(event) => setFilterBatch(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            {BATCHES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p className="mt-4 rounded-lg border-l-4 border-red-500 bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        )}

        <div className="mt-6 space-y-3">
          {loading ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : schedules.length === 0 ? (
            <p className="text-sm text-slate-500">No upcoming classes found.</p>
          ) : (
            schedules.map((entry) => {
              const batchLabel = BATCHES.find((b) => b.value === entry.batch)?.label ?? entry.batch;
              const dateLabel = new Date(entry.classDate).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "2-digit",
                year: "2-digit",
              });

              return (
                <div
                  key={entry.id}
                  className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"
                >
                  <p className="text-xs font-semibold text-atomic-orange">{batchLabel}</p>
                  <p className="mt-1 font-semibold">
                    {entry.subject} - {entry.topic}
                  </p>
                  {entry.teacherName && (
                    <p className="mt-0.5 text-xs text-slate-500">Teacher: {entry.teacherName}</p>
                  )}
                  <p className="mt-1 text-sm text-slate-500">
                    {dateLabel} - {entry.startTime}
                    {entry.endTime ? " to " + entry.endTime : ""}
                  </p>
                  {entry.notes && <p className="mt-1 text-xs text-slate-400">{entry.notes}</p>}
                  {entry.youtubeLink && (
                    <a
                      href={entry.youtubeLink}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:underline"
                    >
                      <Youtube className="h-3.5 w-3.5" />
                      Watch link
                    </a>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}