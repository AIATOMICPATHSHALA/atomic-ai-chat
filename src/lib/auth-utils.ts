import { createHash, randomBytes } from "crypto";
import bcrypt from "bcrypt";
import type { User, UserRole } from "@/generated/prisma/client";
import type { StudentProfile } from "@/types/chat";

const ATOMIC_SEQUENCE_ID = "atomic-pathshala";
const PASSWORD_HASH_ROUNDS = 12;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
}

export function comparePassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createSecureToken() {
  return randomBytes(32).toString("hex");
}

export function isAdminEmail(email: string) {
  const allowedEmails = (process.env.ATOMIC_ADMIN_EMAILS ?? "")
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean);

  return allowedEmails.includes(normalizeEmail(email));
}

export function roleForNewUser(email: string): UserRole {
  return isAdminEmail(email) ? "ADMIN" : "BASIC";
}

export function isProRole(role: UserRole) {
  return role === "PRO" || role === "FACULTY" || role === "ADMIN";
}

export async function nextAtomicId(prisma: {
  atomicIdSequence: {
    upsert: (args: {
      where: { id: string };
      create: { id: string; nextValue: number };
      update: { nextValue: { increment: number } };
    }) => Promise<{ nextValue: number }>;
  };
}) {
  const sequence = await prisma.atomicIdSequence.upsert({
    where: { id: ATOMIC_SEQUENCE_ID },
    create: { id: ATOMIC_SEQUENCE_ID, nextValue: 2 },
    update: { nextValue: { increment: 1 } },
  });
  const sequenceNumber = sequence.nextValue - 1;
  const configuredYear = Number(process.env.ATOMIC_ID_YEAR ?? "2027");
  const year = Number.isInteger(configuredYear) ? configuredYear : 2027;

  return `AP${year}-${String(sequenceNumber).padStart(6, "0")}`;
}

export function userToStudentProfile(user: User & {
  profile?: {
    className: string | null;
    target: string;
    board: string | null;
    preferredLanguage: string;
  } | null;
}): StudentProfile {
  const language = user.profile?.preferredLanguage;

  return {
    name: user.name ?? undefined,
    className: user.profile?.className ?? undefined,
    target:
      user.profile?.target === "JEE" ||
      user.profile?.target === "Board" ||
      user.profile?.target === "Other"
        ? user.profile.target
        : "NEET",
    board: user.profile?.board ?? undefined,
    language:
      language === "english" || language === "hindi" || language === "hinglish"
        ? language
        : "hinglish",
  };
}

export function publicUser(user: Pick<User, "id" | "atomicId" | "email" | "name" | "role" | "isPro">) {
  return {
    id: user.id,
    atomicId: user.atomicId,
    email: user.email,
    name: user.name,
    role: user.role,
    isPro: user.isPro || isProRole(user.role),
  };
}
