"use client";

import {
  ArrowLeft,
  Award,
  Clock3,
  Flame,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";

interface SubjectPerf {
  subject: string;
  accuracy: number;
  solved: number;
}

interface TopicStat {
  topic: string;
  subject: string;
  correct: number;
  total: number;
  accuracy: number;
}

interface HeatmapDay {
  date: string;
  count: number;
}

interface WeeklyDay {
  day: string;
  count: number;
}

interface DashboardData {
  name: string | null;
  atomicId: string;
  currentStreak: number;
  longestStreak: number;
  totalXp: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  overallAccuracy: number;
  totalSolved: number;
  hoursSpent: number;
  subjectPerformance: SubjectPerf[];
  weakTopics: TopicStat[];
  strongTopics: TopicStat[];
  heatmap: HeatmapDay[];
  weeklyVelocity: WeeklyDay[];
  recentAttemptsCount: number;
}

function subjectColor(subject: string) {
  if (subject === "Biology") return "bg-atomic-orange";
  if (subject === "Physics") return "bg-atomic-blue";
  if (subject === "Chemistry") return "bg-emerald-500";
  return "bg-slate-400";
}

function heatmapColor(count: number) {
  if (count === 0) return "bg-slate-100 dark:bg-slate-800";
  if (count <= 5) return "bg-orange-200 dark:bg-orange-900/40";
  if (count <= 15) return "bg-orange-400 dark:bg-orange-700";
  return "bg-atomic-orange";
}

export function StudentDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    void fetch("/api/dashboard", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load dashboard.");
        return response.json() as Promise<DashboardData>;
      })
      .then(setData)
      .catch((caughtError) =>
        setError(caughtError instanceof Error ? caughtError.message : "Could not load dashboard.")
      )
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-white dark:bg-atomic-navy">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-atomic-orange border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-2xl items-center px-4">
        <div>
          <h1 className="text-2xl font-bold">Your Dashboard</h1>
          <p className="mt-2 text-slate-500">Sign in to see your progress and weak topics.</p>
          <Link href="/" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-atomic-orange">
            <ArrowLeft className="h-4 w-4" /> Return to Atomic Guru
          </Link>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-2xl items-center px-4">
        <div>
          <h1 className="text-2xl font-bold">Your Dashboard</h1>
          <p className="mt-2 text-red-600">{error ?? "Could not load dashboard."}</p>
          <Link href="/" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-atomic-orange">
            <ArrowLeft className="h-4 w-4" /> Return to Atomic Guru
          </Link>
        </div>
      </main>
    );
  }

  const hasAttempts = data.recentAttemptsCount > 0;
  const levelProgressPct =
    data.xpForNextLevel > 0 ? Math.min(100, Math.round((data.xpIntoLevel / data.xpForNextLevel) * 100)) : 0;

  return (
    <main className="min-h-dvh bg-white dark:bg-atomic-navy">
      <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-700">
          <div>
            <p className="text-sm font-medium text-atomic-orange">Atomic Guru</p>
            <h1 className="text-2xl font-bold">Good to see you, {data.name ?? "Student"}</h1>
          </div>
          <Link
            href="/"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Return to chat"
            aria-label="Return to chat"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </div>

        {!hasAttempts ? (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
            <Target className="mx-auto mb-3 h-10 w-10 text-atomic-orange" />
            <h2 className="text-lg font-semibold">No quiz data yet</h2>
            <p className="mt-1 text-sm text-slate-500">
              Attempt a few NEET Quizzes and your weak/strong topics, accuracy, and streak will show up here.
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-atomic-orange px-4 py-2.5 text-sm font-semibold text-white hover:bg-atomic-orange-dark"
            >
              Take a quiz
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-700 lg:col-span-1">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <Flame className="h-4 w-4 text-orange-500" /> Current streak
                </div>
                <p className="mt-2 text-3xl font-bold text-atomic-orange">{data.currentStreak} days</p>
                <p className="mt-1 text-xs text-slate-500">Longest streak: {data.longestStreak} days</p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-700 lg:col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Atomic ID: {data.atomicId}
                    </p>
                    <p className="mt-1 text-lg font-bold">Level {data.level}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Total XP</p>
                    <p className="font-mono text-lg font-bold text-atomic-orange">{data.totalXp}</p>
                  </div>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-atomic-orange transition-all"
                    style={{ width: `${levelProgressPct}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {data.xpIntoLevel} / {data.xpForNextLevel} XP to Level {data.level + 1}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Accuracy</p>
                <p className="mt-1 text-2xl font-bold text-emerald-600">{data.overallAccuracy}%</p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Questions solved</p>
                <p className="mt-1 text-2xl font-bold">{data.totalSolved}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hours spent</p>
                <p className="mt-1 text-2xl font-bold">{data.hoursSpent}h</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-red-200 bg-red-50/50 p-5 dark:border-red-900 dark:bg-red-950/10">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-red-600 dark:text-red-400">
                  <TrendingDown className="h-4 w-4" /> Weak topics
                </div>
                {data.weakTopics.length === 0 ? (
                  <p className="text-sm text-slate-500">Not enough data yet to detect weak topics.</p>
                ) : (
                  <div className="space-y-3">
                    {data.weakTopics.map((topic) => (
                      <div key={`${topic.subject}-${topic.topic}`}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{topic.topic}</span>
                          <span className="font-mono text-red-600">{topic.accuracy}%</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-red-100 dark:bg-red-950/30">
                          <div className="h-full rounded-full bg-red-500" style={{ width: `${topic.accuracy}%` }} />
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">{topic.subject}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 dark:border-emerald-900 dark:bg-emerald-950/10">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  <Award className="h-4 w-4" /> Strong topics
                </div>
                {data.strongTopics.length === 0 ? (
                  <p className="text-sm text-slate-500">Not enough data yet to detect strong topics.</p>
                ) : (
                  <div className="space-y-3">
                    {data.strongTopics.map((topic) => (
                      <div key={`${topic.subject}-${topic.topic}`}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{topic.topic}</span>
                          <span className="font-mono text-emerald-600">{topic.accuracy}%</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-950/30">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${topic.accuracy}%` }}
                          />
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">{topic.subject}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
              <h2 className="mb-4 font-semibold">Subject performance</h2>
              {data.subjectPerformance.length === 0 ? (
                <p className="text-sm text-slate-500">No subject-wise data yet.</p>
              ) : (
                <div className="space-y-4">
                  {data.subjectPerformance.map((subject) => (
                    <div key={subject.subject}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{subject.subject}</span>
                        <span className="font-mono">{subject.accuracy}%</span>
                      </div>
                      <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className={`h-full rounded-full ${subjectColor(subject.subject)}`}
                          style={{ width: `${subject.accuracy}%` }}
                        />
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">{subject.solved} questions solved</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
                <div className="mb-4 flex items-center gap-2 font-semibold">
                  <TrendingUp className="h-4 w-4 text-atomic-orange" /> This week
                </div>
                <div className="flex h-32 items-end justify-between gap-2">
                  {data.weeklyVelocity.map((day) => {
                    const max = Math.max(1, ...data.weeklyVelocity.map((d) => d.count));
                    const heightPct = Math.max(4, Math.round((day.count / max) * 100));
                    return (
                      <div key={day.day} className="flex flex-1 flex-col items-center gap-2">
                        <div className="flex h-24 w-full items-end">
                          <div
                            className="w-full rounded-t-md bg-atomic-orange/80"
                            style={{ height: `${heightPct}%` }}
                            title={`${day.count} questions`}
                          />
                        </div>
                        <span className="text-[10px] font-bold uppercase text-slate-400">{day.day}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
                <div className="mb-4 flex items-center gap-2 font-semibold">
                  <Clock3 className="h-4 w-4 text-atomic-orange" /> Activity (last 90 days)
                </div>
                <div className="flex flex-wrap gap-1">
                  {data.heatmap.map((day) => (
                    <div
                      key={day.date}
                      title={`${day.date}: ${day.count} questions`}
                      className={`h-3 w-3 rounded-sm ${heatmapColor(day.count)}`}
                    />
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px] font-bold uppercase text-slate-400">
                  <span>Less</span>
                  <div className="flex items-center gap-1">
                    <div className="h-3 w-3 rounded-sm bg-slate-100 dark:bg-slate-800" />
                    <div className="h-3 w-3 rounded-sm bg-orange-200 dark:bg-orange-900/40" />
                    <div className="h-3 w-3 rounded-sm bg-orange-400 dark:bg-orange-700" />
                    <div className="h-3 w-3 rounded-sm bg-atomic-orange" />
                  </div>
                  <span>More</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2 rounded-2xl border border-slate-200 p-5 text-sm text-slate-500 dark:border-slate-700">
              <Trophy className="h-4 w-4 shrink-0 text-atomic-orange" />
              Based on your last {data.recentAttemptsCount} quiz attempts. Keep practicing to sharpen these stats.
            </div>
          </>
        )}
      </div>
    </main>
  );
}

