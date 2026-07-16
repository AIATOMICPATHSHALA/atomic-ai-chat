import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { grantAccess } from "@/lib/access-service";
import { getPrisma } from "@/lib/prisma";

const batchGrantSchema = z.object({
  userIds: z.array(z.string().min(1)).max(10_000).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  reason: z.string().trim().max(1_000).optional(),
});

async function inChunks<T>(items: T[], size: number, callback: (item: T) => Promise<void>) {
  for (let index = 0; index < items.length; index += size) {
    await Promise.all(items.slice(index, index + size).map(callback));
  }
}

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const parsed = batchGrantSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid batch access details." },
        { status: 400 }
      );
    }

    const { id: batchId } = await context.params;
    const prisma = getPrisma();
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        enrollments: {
          where: {
            status: "ACTIVE",
            ...(parsed.data.userIds?.length ? { userId: { in: parsed.data.userIds } } : {}),
          },
        },
      },
    });
    if (!batch) return NextResponse.json({ error: "Batch not found." }, { status: 404 });

    const expiresAt = parsed.data.expiresAt
      ? new Date(parsed.data.expiresAt)
      : batch.endsAt;
    await inChunks(batch.enrollments, 25, async (enrollment) => {
      await grantAccess(prisma, {
        userId: enrollment.userId,
        grantedByUserId: admin.id,
        plan: "PRO",
        accessType: "ATOMIC_BATCH_FREE",
        expiresAt,
        batchId: batch.id,
        courseId: batch.courseId,
        enrollmentId: enrollment.id,
        reason: parsed.data.reason ?? `Complimentary Atomic AI access from ${batch.title}`,
      });
    });

    return NextResponse.json({ granted: batch.enrollments.length, batchId: batch.id });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
    }
    console.error("[Batch access API]", error);
    return NextResponse.json({ error: "Could not grant batch access." }, { status: 500 });
  }
}
