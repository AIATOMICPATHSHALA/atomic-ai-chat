import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";

interface TopicBreakdownEntry {
  topic: string;
  subject: string;
  correct: number;
  wrong: number;
  unattempted: number;
}

function levelFromXp(xp: number) {
  const level = Math.floor(xp / 500) + 1;
  const currentLevelBase = (level - 1) * 500;
  const nextLevelBase = level * 500;
  return { level, currentLevelBase, nextLevelBase };
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
    }

    const prisma = getPrisma();

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        name: true,
        atomicId: true,
        currentStreak: true,
        longestStreak: true,
        totalXp: true,
        image: true,
      },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const attempts = await prisma.quizAttempt.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 300,
    });

    // Overall stats
    const totalSolved = attempts.reduce((sum, a) => sum + a.correct + a.wrong, 0);
    const totalCorrect = attempts.reduce((sum, a) => sum + a.correct, 0);
    const overallAccuracy = totalSolved > 0 ? Math.round((totalCorrect / totalSolved) * 100) : 0;
    const totalSeconds = attempts.reduce((sum, a) => sum + (a.timeTakenSec ?? 0), 0);
    const hoursSpent = Math.round((totalSeconds / 3600) * 10) / 10;

    // Subject-wise accuracy
    const subjectMap = new Map<string, { correct: number; total: number }>();
    for (const attempt of attempts) {
      if (attempt.subject === "Full NEET") continue; // full mixes subjects, skip for subject cards
      const entry = subjectMap.get(attempt.subject) ?? { correct: 0, total: 0 };
      entry.correct += attempt.correct;
      entry.total += attempt.correct + attempt.wrong;
      subjectMap.set(attempt.subject, entry);
    }
    const subjectPerformance = Array.from(subjectMap.entries()).map(([subject, stats]) => ({
      subject,
      accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
      solved: stats.total,
    }));

    // Topic-wise weak/strong analysis from breakdown JSON
    const topicMap = new Map<string, { topic: string; subject: string; correct: number; total: number }>();
    for (const attempt of attempts) {
      const breakdown = attempt.breakdown as { topics?: TopicBreakdownEntry[] } | null;
      const topics = breakdown?.topics ?? [];
      for (const t of topics) {
        const key = `${t.subject}::${t.topic}`;
        const entry = topicMap.get(key) ?? { topic: t.topic, subject: t.subject, correct: 0, total: 0 };
        entry.correct += t.correct;
        entry.total += t.correct + t.wrong;
        topicMap.set(key, entry);
      }
    }
    const topicStats = Array.from(topicMap.values())
      .filter((t) => t.total >= 2) // ignore near-zero-sample topics
      .map((t) => ({ ...t, accuracy: Math.round((t.correct / t.total) * 100) }));

    const weakTopics = [...topicStats].sort((a, b) => a.accuracy - b.accuracy).slice(0, 5);
    const strongTopics = [...topicStats].sort((a, b) => b.accuracy - a.accuracy).slice(0, 5);

    // Activity heatmap: last 90 days attempt counts
    const heatmapMap = new Map<string, number>();
    for (const attempt of attempts) {
      const dateKey = attempt.createdAt.toISOString().slice(0, 10);
      heatmapMap.set(dateKey, (heatmapMap.get(dateKey) ?? 0) + 1);
    }
    const heatmap: { date: string; count: number }[] = [];
    for (let i = 89; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      heatmap.push({ date: key, count: heatmapMap.get(key) ?? 0 });
    }

    // Weekly velocity: last 7 days question counts
    const weeklyVelocity: { day: string; count: number }[] = [];
    const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const dayAttempts = attempts.filter((a) => a.createdAt.toISOString().slice(0, 10) === key);
      const count = dayAttempts.reduce((sum, a) => sum + a.correct + a.wrong, 0);
      weeklyVelocity.push({ day: dayLabels[d.getDay()], count });
    }

    const { level, currentLevelBase, nextLevelBase } = levelFromXp(dbUser.totalXp);

    return NextResponse.json({
      name: dbUser.name,
      atomicId: dbUser.atomicId,
      image: dbUser.image,
      currentStreak: dbUser.currentStreak,
      longestStreak: dbUser.longestStreak,
      totalXp: dbUser.totalXp,
      level,
      xpIntoLevel: dbUser.totalXp - currentLevelBase,
      xpForNextLevel: nextLevelBase - currentLevelBase,
      overallAccuracy,
      totalSolved,
      hoursSpent,
      subjectPerformance,
      weakTopics,
      strongTopics,
      heatmap,
      weeklyVelocity,
      recentAttemptsCount: attempts.length,
    });
  } catch (error) {
    console.error("[Dashboard API]", error);
    return NextResponse.json({ error: "Could not load dashboard." }, { status: 500 });
  }
}