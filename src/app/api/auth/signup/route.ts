import { NextResponse } from "next/server";
import { signUpSchema } from "@/lib/auth-schemas";
import {
  hashPassword,
  isProRole,
  nextAtomicId,
  normalizeEmail,
  publicUser,
  roleForNewUser,
} from "@/lib/auth-utils";
import { DatabaseUnavailableError, getPrisma } from "@/lib/prisma";
import { ensureBasicAccess } from "@/lib/access-service";
import { ensureInitialAdmin } from "@/lib/system-bootstrap";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const parsed = signUpSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid sign-up details." },
        { status: 400 }
      );
    }

    const prisma = getPrisma();
    await ensureInitialAdmin();
    const email = normalizeEmail(parsed.data.email);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account already exists for this email. Please sign in." },
        { status: 409 }
      );
    }

    const atomicId = await nextAtomicId(prisma);
    const role = roleForNewUser(email);
    const user = await prisma.user.create({
      data: {
        atomicId,
        email,
        passwordHash: await hashPassword(parsed.data.password),
        name: parsed.data.name,
        role,
        isPro: isProRole(role),
        profile: {
          create: {
            className: parsed.data.className || null,
            target: parsed.data.target,
            preferredLanguage: parsed.data.language,
          },
        },
        preferences: { create: { language: parsed.data.language } },
        aiMemory: { create: {} },
      },
    });
    await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        targetUserId: user.id,
        event: "USER_CREATED",
        metadata: { provider: "credentials" },
      },
    });
    await ensureBasicAccess(prisma, user.id);

    return NextResponse.json({ user: publicUser(user) }, { status: 201 });
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    console.error("[Sign-up API]", error);
    return NextResponse.json({ error: "Could not create the account." }, { status: 500 });
  }
}
