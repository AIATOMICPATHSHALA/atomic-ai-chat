import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
    const prisma = getPrisma();
    const [users, proUsers, activeSubscriptions, conversations, messages, recentLogs] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { OR: [{ isPro: true }, { role: { in: ["PRO", "FACULTY", "ADMIN"] } }] } }),
        prisma.subscription.count({ where: { status: { in: ["ACTIVE", "TRIALING"] } } }),
        prisma.conversation.count({ where: { deletedAt: null } }),
        prisma.chatMessage.count(),
        prisma.auditLog.findMany({
          orderBy: { createdAt: "desc" },
          take: 12,
          select: { id: true, event: true, createdAt: true, metadata: true },
        }),
      ]);

    return NextResponse.json({
      metrics: { users, proUsers, activeSubscriptions, conversations, messages },
      recentLogs,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
    }
    console.error("[Admin analytics API]", error);
    return NextResponse.json({ error: "Could not load analytics." }, { status: 500 });
  }
}
