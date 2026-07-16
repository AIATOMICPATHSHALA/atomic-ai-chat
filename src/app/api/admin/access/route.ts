import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import {
  grantAccess,
  updateAccessStatus,
  updateSubscriptionExpiry,
} from "@/lib/access-service";
import { getPrisma } from "@/lib/prisma";

const planSchema = z.enum(["FREE", "BASIC", "PRO", "LIFETIME"]);
const accessTypeSchema = z.enum([
  "FREE_TRIAL",
  "BASIC_PLAN",
  "PRO_PLAN",
  "ATOMIC_BATCH_FREE",
  "LIFETIME_ACCESS",
]);
const actionSchema = z.object({
  action: z.enum(["grant", "revoke", "suspend", "extend", "change_expiry"]),
  userId: z.string().min(1).optional(),
  subscriptionId: z.string().min(1).optional(),
  plan: planSchema.optional(),
  accessType: accessTypeSchema.optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  extendDays: z.number().int().min(1).max(3650).optional(),
  batchId: z.string().min(1).nullable().optional(),
  courseId: z.string().min(1).nullable().optional(),
  reason: z.string().trim().max(1000).optional(),
});

function accessError(error: unknown) {
  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
  }
  if (error instanceof Error && error.message === "FORBIDDEN") {
    return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  }
  return null;
}

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const params = new URL(request.url).searchParams;
    const search = params.get("search")?.trim();
    const batchId = params.get("batchId")?.trim();
    const status = params.get("status")?.trim();
    const prisma = getPrisma();
    const users = await prisma.user.findMany({
      where: {
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { atomicId: { contains: search, mode: "insensitive" } },
                { profile: { phone: { contains: search, mode: "insensitive" } } },
                {
                  enrollments: {
                    some: {
                      batch: { title: { contains: search, mode: "insensitive" } },
                    },
                  },
                },
              ],
            }
          : {}),
        ...(batchId ? { enrollments: { some: { batchId } } } : {}),
        ...(status === "ACTIVE" || status === "EXPIRED" || status === "SUSPENDED" || status === "REVOKED"
          ? { access: { status } }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        profile: true,
        access: {
          include: {
            batch: { select: { id: true, title: true } },
            course: { select: { id: true, title: true } },
            subscription: {
              select: {
                id: true,
                grantedAt: true,
                reason: true,
                grantedBy: { select: { name: true, email: true, atomicId: true } },
              },
            },
          },
        },
        enrollments: {
          where: { status: "ACTIVE" },
          include: {
            batch: { select: { id: true, title: true } },
            course: { select: { id: true, title: true } },
          },
        },
        subscriptions: {
          orderBy: [{ grantedAt: "desc" }, { createdAt: "desc" }],
          take: 20,
          select: {
            id: true,
            plan: true,
            accessType: true,
            accessStatus: true,
            grantedAt: true,
            endsAt: true,
            reason: true,
            batch: { select: { title: true } },
            course: { select: { title: true } },
          },
        },
      },
    });

    return NextResponse.json({ users });
  } catch (error) {
    const response = accessError(error);
    if (response) return response;
    console.error("[Admin access API]", error);
    return NextResponse.json({ error: "Could not load student access." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const parsed = actionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid access action." },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const prisma = getPrisma();

    if (input.action === "grant") {
      if (!input.userId || !input.plan) {
        return NextResponse.json({ error: "Student and plan are required." }, { status: 400 });
      }
      const accessType =
        input.accessType ??
        (input.plan === "LIFETIME"
          ? "LIFETIME_ACCESS"
          : input.plan === "PRO"
            ? "PRO_PLAN"
            : "BASIC_PLAN");
      const result = await grantAccess(prisma, {
        userId: input.userId,
        grantedByUserId: admin.id,
        plan: input.plan,
        accessType,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        batchId: input.batchId,
        courseId: input.courseId,
        reason: input.reason,
      });
      return NextResponse.json(result, { status: 201 });
    }

    if (!input.subscriptionId) {
      return NextResponse.json({ error: "Subscription is required." }, { status: 400 });
    }

    if (input.action === "revoke" || input.action === "suspend") {
      const result = await updateAccessStatus(prisma, {
        subscriptionId: input.subscriptionId,
        status: input.action === "revoke" ? "REVOKED" : "SUSPENDED",
        grantedByUserId: admin.id,
        reason: input.reason,
      });
      return NextResponse.json(result);
    }

    let expiresAt: Date | null;
    if (input.action === "extend") {
      if (!input.extendDays) {
        return NextResponse.json({ error: "Extension days are required." }, { status: 400 });
      }
      const subscription = await prisma.subscription.findUnique({
        where: { id: input.subscriptionId },
        select: { endsAt: true },
      });
      if (!subscription) return NextResponse.json({ error: "Subscription not found." }, { status: 404 });
      const base = subscription.endsAt && subscription.endsAt > new Date() ? subscription.endsAt : new Date();
      expiresAt = new Date(base.getTime() + input.extendDays * 24 * 60 * 60 * 1000);
    } else {
      expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
    }

    return NextResponse.json(
      await updateSubscriptionExpiry(prisma, {
        subscriptionId: input.subscriptionId,
        expiresAt,
        grantedByUserId: admin.id,
        reason: input.reason,
      })
    );
  } catch (error) {
    const response = accessError(error);
    if (response) return response;
    console.error("[Admin access update API]", error);
    return NextResponse.json({ error: "Could not update access." }, { status: 500 });
  }
}
