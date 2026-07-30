import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { computeDashboardStats } from "@/lib/dashboardStats";

export const runtime = "nodejs";

function accessError(error: unknown) {
  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
  }
  if (error instanceof Error && error.message === "FORBIDDEN") {
    return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  }
  return null;
}

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const params = new URL(request.url).searchParams;
    const userId = params.get("userId");

    const prisma = getPrisma();

    // Single-student detailed view
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, atomicId: true, role: true },
      });
      if (!user) {
        return NextResponse.json({ error: "Student not found." }, { status: 404 });
      }
      const stats = await computeDashboardStats(userId);
      return NextResponse.json({ user, stats });
    }

    // List view — all students with a lightweight summary
    const users = await prisma.user.findMany({
      where: { role: { in: ["STUDENT", "PRO", "BASIC"] } },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        name: true,
        email: true,
        atomicId: true,
        profile: { select: { xp: true, currentStreak: true } },
      },
    });

    const summaries = await Promise.all(
      users.map(async (user) => {
        const stats = await computeDashboardStats(user.id);
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          atomicId: user.atomicId,
          xp: stats.xp,
          level: stats.level,
          currentStreak: stats.currentStreak,
          accuracy: stats.accuracy,
          healthScore: stats.healthScore,
        };
      })
    );

    return NextResponse.json({ students: summaries });
  } catch (error) {
    const response = accessError(error);
    if (response) return response;
    console.error("[Admin Student Performance API]", error);
    return NextResponse.json({ error: "Could not load student performance." }, { status: 500 });
  }
}