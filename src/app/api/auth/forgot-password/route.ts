import { NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/lib/auth-schemas";
import { createSecureToken, hashToken, normalizeEmail } from "@/lib/auth-utils";
import { DatabaseUnavailableError, getPrisma } from "@/lib/prisma";

const RESET_TOKEN_LIFETIME_MS = 60 * 60 * 1000;

async function deliverResetLink(email: string, resetUrl: string) {
  const webhookUrl = process.env.PASSWORD_RESET_WEBHOOK_URL?.trim();

  if (webhookUrl) {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "password_reset", email, resetUrl }),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Password reset delivery failed.");
    return;
  }

  if (process.env.NODE_ENV !== "production") {
    console.info(`[Atomic AI] Password reset for ${email}: ${resetUrl}`);
  }
}

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const parsed = forgotPasswordSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Enter a valid email address." },
        { status: 400 }
      );
    }

    const prisma = getPrisma();
    const email = normalizeEmail(parsed.data.email);
    const user = await prisma.user.findUnique({ where: { email } });

    if (user && !user.isSuspended) {
      const token = createSecureToken();
      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id, OR: [{ usedAt: null }, { expiresAt: { lt: new Date() } }] },
      });
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + RESET_TOKEN_LIFETIME_MS),
        },
      });
      await prisma.auditLog.create({
        data: {
          actorUserId: user.id,
          targetUserId: user.id,
          event: "PASSWORD_RESET_REQUESTED",
        },
      });

      const origin = new URL(request.url).origin;
      await deliverResetLink(email, `${origin}/reset-password?token=${token}`);
    }

    return NextResponse.json({
      message: "If an account exists for this email, password reset instructions have been sent.",
    });
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    console.error("[Forgot password API]", error);
    return NextResponse.json({ error: "Could not process the reset request." }, { status: 500 });
  }
}
