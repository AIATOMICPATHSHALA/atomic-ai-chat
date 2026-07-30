import { NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/lib/auth-schemas";
import { createSecureToken, hashToken, normalizeEmail } from "@/lib/auth-utils";
import { DatabaseUnavailableError, getPrisma } from "@/lib/prisma";
import { Resend } from "resend";

const RESET_TOKEN_LIFETIME_MS = 60 * 60 * 1000;

async function deliverResetLink(email: string, resetUrl: string) {
  const resendApiKey = process.env.RESEND_API_KEY?.trim();

  if (resendApiKey) {
    const resend = new Resend(resendApiKey);
    const { error } = await resend.emails.send({
      from: "Atomic Pathshala <onboarding@resend.dev>",
      to: email,
      subject: "Reset your Atomic Pathshala password",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>Password reset requested</h2>
          <p>Click the button below to reset your password. This link expires in 1 hour.</p>
          <a href="${resetUrl}" style="display:inline-block;background:#f97316;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0;">
            Reset Password
          </a>
          <p style="color:#666;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });
    if (error) throw new Error("Password reset delivery failed: " + error.message);
    return;
  }

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
    console.info(`[Atomic Guru] Password reset for ${email}: ${resetUrl}`);
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

