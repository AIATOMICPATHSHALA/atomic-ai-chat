import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { profileUpdateSchema } from "@/lib/auth-schemas";
import { publicUser, userToStudentProfile } from "@/lib/auth-utils";
import { getPrisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

function unauthorized() {
  return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
}

function toNullableJson(value: unknown) {
  return value === null
    ? Prisma.JsonNull
    : (value as Prisma.InputJsonValue);
}

export const runtime = "nodejs";

export async function GET() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) return unauthorized();

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    include: {
      profile: true,
      preferences: true,
      aiMemory: true,
      access: {
        include: {
          batch: { select: { id: true, title: true } },
          course: { select: { id: true, title: true } },
          subscription: {
            select: {
              id: true,
              plan: true,
              accessType: true,
              accessStatus: true,
              grantedAt: true,
              endsAt: true,
              reason: true,
              grantedBy: { select: { atomicId: true, name: true, email: true } },
            },
          },
        },
      },
    },
  });
  if (!user) return unauthorized();

  return NextResponse.json({
    user: publicUser(user),
    studentProfile: userToStudentProfile(user),
    profile: user.profile,
    preferences: user.preferences,
    aiMemory: user.aiMemory,
    access: user.access,
  });
}

export async function PATCH(request: Request) {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) return unauthorized();

  const parsed = profileUpdateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid profile details." },
      { status: 400 }
    );
  }

  const { name, theme, language, emailNotifications, pushNotifications, privacyMode, ...profile } = parsed.data;
  const prisma = getPrisma();
  const profileUpdate: Prisma.UserProfileUpdateWithoutUserInput = {
    ...(profile.phone !== undefined ? { phone: profile.phone } : {}),
    ...(profile.className !== undefined ? { className: profile.className } : {}),
    ...(profile.target !== undefined ? { target: profile.target } : {}),
    ...(profile.board !== undefined ? { board: profile.board } : {}),
    ...(profile.preferredLanguage !== undefined
      ? { preferredLanguage: profile.preferredLanguage }
      : {}),
    ...(profile.preferredTeachers !== undefined
      ? { preferredTeachers: profile.preferredTeachers }
      : {}),
    ...(profile.strongChapters !== undefined ? { strongChapters: profile.strongChapters } : {}),
    ...(profile.weakChapters !== undefined ? { weakChapters: profile.weakChapters } : {}),
    ...(profile.favoriteSubject !== undefined ? { favoriteSubject: profile.favoriteSubject } : {}),
    ...(profile.learningPreferences !== undefined
      ? { learningPreferences: toNullableJson(profile.learningPreferences) }
      : {}),
    ...(profile.recentActivity !== undefined
      ? { recentActivity: toNullableJson(profile.recentActivity) }
      : {}),
  };

  const user = await prisma.user.update({
    where: { id: sessionUser.id },
    data: {
      ...(name !== undefined ? { name } : {}),
      profile: {
        upsert: {
          create: {
            className: profile.className ?? null,
            target: profile.target ?? "NEET",
            board: profile.board ?? null,
            preferredLanguage: profile.preferredLanguage ?? "hinglish",
            preferredTeachers: profile.preferredTeachers ?? [],
            strongChapters: profile.strongChapters ?? [],
            weakChapters: profile.weakChapters ?? [],
            favoriteSubject: profile.favoriteSubject ?? null,
            phone: profile.phone ?? null,
            ...(profile.learningPreferences !== undefined
              ? { learningPreferences: toNullableJson(profile.learningPreferences) }
              : {}),
            ...(profile.recentActivity !== undefined
              ? { recentActivity: toNullableJson(profile.recentActivity) }
              : {}),
          },
          update: profileUpdate,
        },
      },
      preferences: {
        upsert: {
          create: {
            theme: theme ?? "system",
            language: language ?? profile.preferredLanguage ?? "hinglish",
            emailNotifications: emailNotifications ?? true,
            pushNotifications: pushNotifications ?? true,
            privacyMode: privacyMode ?? false,
          },
          update: {
            ...(theme !== undefined ? { theme } : {}),
            ...(language !== undefined ? { language } : {}),
            ...(emailNotifications !== undefined ? { emailNotifications } : {}),
            ...(pushNotifications !== undefined ? { pushNotifications } : {}),
            ...(privacyMode !== undefined ? { privacyMode } : {}),
          },
        },
      },
    },
    include: { profile: true, preferences: true, access: true },
  });
  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      targetUserId: user.id,
      event: "USER_UPDATED",
    },
  });

  return NextResponse.json({
    user: publicUser(user),
    studentProfile: userToStudentProfile(user),
    profile: user.profile,
    preferences: user.preferences,
    access: user.access,
  });
}
