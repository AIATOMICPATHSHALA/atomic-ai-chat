import { ensureBasicAccess, grantAccess } from "@/lib/access-service";
import { hashPassword, isProRole, nextAtomicId, normalizeEmail } from "@/lib/auth-utils";
import { isDatabaseConfigured, getPrisma } from "@/lib/prisma";

let initialization: Promise<void> | null = null;

export function ensureInitialAdmin() {
  if (!isDatabaseConfigured()) return Promise.resolve();
  if (initialization) return initialization;

  initialization = (async () => {
    const email = process.env.ADMIN_EMAIL?.trim();
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password || password.length < 8) return;

    const prisma = getPrisma();
    const existingAdmin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    if (existingAdmin) return;

    const normalizedEmail = normalizeEmail(email);
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    const admin = user
      ? await prisma.user.update({
          where: { id: user.id },
          data: {
            role: "ADMIN",
            isPro: true,
            passwordHash: user.passwordHash ?? (await hashPassword(password)),
          },
        })
      : await prisma.user.create({
          data: {
            atomicId: await nextAtomicId(prisma),
            email: normalizedEmail,
            passwordHash: await hashPassword(password),
            name: "Atomic Administrator",
            role: "ADMIN",
            isPro: true,
            profile: { create: {} },
            preferences: { create: {} },
            aiMemory: { create: {} },
          },
        });

    await ensureBasicAccess(prisma, admin.id);
    await grantAccess(prisma, {
      userId: admin.id,
      grantedByUserId: admin.id,
      plan: "LIFETIME",
      accessType: "LIFETIME_ACCESS",
      reason: "Initial administrator access",
    });
    await prisma.auditLog.create({
      data: {
        actorUserId: admin.id,
        targetUserId: admin.id,
        event: "USER_CREATED",
        metadata: { bootstrap: true, role: "ADMIN", isPro: isProRole(admin.role) },
      },
    });
  })().catch((error) => {
    initialization = null;
    throw error;
  });

  return initialization;
}
