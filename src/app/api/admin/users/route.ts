import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { isProRole } from "@/lib/auth-utils";
import { getPrisma } from "@/lib/prisma";

const roleSchema = z.enum(["GUEST", "STUDENT", "PRO", "FACULTY", "ADMIN"]);
const updateSchema = z.object({
  userId: z.string().min(1),
  role: roleSchema.optional(),
  isPro: z.boolean().optional(),
  isSuspended: z.boolean().optional(),
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
    const search = new URL(request.url).searchParams.get("search")?.trim();
    const prisma = getPrisma();
    const users = await prisma.user.findMany({
      where: search
        ? {
            OR: [
              { email: { contains: search, mode: "insensitive" } },
              { name: { contains: search, mode: "insensitive" } },
              { atomicId: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        atomicId: true,
        email: true,
        name: true,
        role: true,
        isPro: true,
        isSuspended: true,
        lastLoginAt: true,
        createdAt: true,
        profile: { select: { target: true, className: true } },
      },
    });

    return NextResponse.json({ users });
  } catch (error) {
    const response = accessError(error);
    if (response) return response;
    console.error("[Admin users API]", error);
    return NextResponse.json({ error: "Could not load users." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin();
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid user update." },
        { status: 400 }
      );
    }

    const prisma = getPrisma();
    const role = parsed.data.role;
    const user = await prisma.user.update({
      where: { id: parsed.data.userId },
      data: {
        ...(role ? { role } : {}),
        ...(parsed.data.isPro !== undefined
          ? { isPro: parsed.data.isPro }
          : role
            ? { isPro: isProRole(role) }
            : {}),
        ...(parsed.data.isSuspended !== undefined
          ? { isSuspended: parsed.data.isSuspended }
          : {}),
      },
    });
    await prisma.auditLog.create({
      data: {
        actorUserId: admin.id,
        targetUserId: user.id,
        event: "ROLE_CHANGED",
        metadata: {
          role: user.role,
          isPro: user.isPro,
          isSuspended: user.isSuspended,
        },
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    const response = accessError(error);
    if (response) return response;
    console.error("[Admin user update API]", error);
    return NextResponse.json({ error: "Could not update user." }, { status: 500 });
  }
}
