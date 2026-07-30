import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export const runtime = "nodejs";

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isYesterday(a: Date, b: Date) {
  const yesterday = new Date(b);
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(a, yesterday);
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
    }

    const body = (await request.json()) as {
      subject?: string;
      topic?: string;
      totalQuestions?: number;
      correct?: number;
      wrong?: number;
      unattempted?: number;
      score?: number;
      accuracy?: number;
      timeTakenSec?: number;
      breakdown?: Record<string, unknown>;
    };

    if (
      !body.subject ||
      body.totalQuestions === undefined ||
      body.correct === undefined ||
      body.wrong === undefined ||
      body.unattempted === undefined ||
      body.score === undefined ||
      body.accuracy === undefined
    ) {
      return NextResponse.json({ error: "Missing quiz attempt fields." }, { status: 400 });
    }

    const prisma = getPrisma();

    const attempt = await prisma.quizAttempt.create({
      data: {
        userId: user.id,
        subject: body.subject,
        topic: body.topic ?? null,
        totalQuestions: body.totalQuestions,
        correct: body.correct,
        wrong: body.wrong,
        unattempted: body.unattempted,
        score: body.score,
        accuracy: body.accuracy,
        timeTakenSec: body.timeTakenSec ?? null,
        breakdown: body.breakdown ? (body.breakdown as Prisma.InputJsonValue) : undefined,
      },
    });

    // Update streak + XP
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { currentStreak: true, longestStreak: true, lastActivityDate: true, totalXp: true },
    });

    const now = new Date();
    let nextStreak = 1;

    if (dbUser?.lastActivityDate) {
      if (isSameDay(dbUser.lastActivityDate, now)) {
        nextStreak = dbUser.currentStreak;
      } else if (isYesterday(dbUser.lastActivityDate, now)) {
        nextStreak = dbUser.currentStreak + 1;
      } else {
        nextStreak = 1;
      }
    }

    const xpGained = body.correct * 10 + body.wrong * 2;
    const nextLongest = Math.max(dbUser?.longestStreak ?? 0, nextStreak);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        currentStreak: nextStreak,
        longestStreak: nextLongest,
        lastActivityDate: now,
        totalXp: (dbUser?.totalXp ?? 0) + xpGained,
      },
    });

    return NextResponse.json({ attempt }, { status: 201 });
  } catch (error) {
    console.error("[Quiz attempt API]", error);
    return NextResponse.json({ error: "Could not save quiz attempt." }, { status: 500 });
  }
}