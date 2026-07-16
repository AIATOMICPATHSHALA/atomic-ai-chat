import { NextResponse } from "next/server";
import { resetPasswordSchema } from "@/lib/auth-schemas";
import { hashPassword, hashToken } from "@/lib/auth-utils";
import { DatabaseUnavailableError, getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const parsed = resetPasswordSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid password reset details." },
        { status: 400 }
      );
    }

    const prisma = getPrisma();
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(parsed.data.token) },
    });
    if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= new Date()) {
      return NextResponse.json(
        { error: "This password reset link is invalid or has expired." },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash: await hashPassword(parsed.data.password) },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      prisma.auditLog.create({
        data: {
          actorUserId: resetToken.userId,
          targetUserId: resetToken.userId,
          event: "PASSWORD_RESET_COMPLETED",
        },
      }),
    ]);

    return NextResponse.json({ message: "Password updated. You can now sign in." });
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    console.error("[Reset password API]", error);
    return NextResponse.json({ error: "Could not reset the password." }, { status: 500 });
  }
}
