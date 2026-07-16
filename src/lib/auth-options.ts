import type { NextAuthOptions } from "next-auth";
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { credentialsSchema } from "@/lib/auth-schemas";
import {
  comparePassword,
  isProRole,
  nextAtomicId,
  normalizeEmail,
  publicUser,
  roleForNewUser,
} from "@/lib/auth-utils";
import { getPrisma } from "@/lib/prisma";
import { ensureBasicAccess } from "@/lib/access-service";
import { ensureInitialAdmin } from "@/lib/system-bootstrap";

const hasGoogleCredentials = Boolean(
  process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim()
);

async function findAuthUser(userId: string) {
  const prisma = getPrisma();
  return prisma.user.findUnique({ where: { id: userId } });
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  useSecureCookies: process.env.NODE_ENV === "production",
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        remember: { label: "Remember me", type: "checkbox" },
      },
      async authorize(credentials) {
        await ensureInitialAdmin();
        const parsed = credentialsSchema.safeParse({
          email: credentials?.email,
          password: credentials?.password,
          remember: credentials?.remember === "true",
        });
        if (!parsed.success) return null;

        const prisma = getPrisma();
        const user = await prisma.user.findUnique({
          where: { email: normalizeEmail(parsed.data.email) },
        });

        if (!user || !user.passwordHash || user.isSuspended) return null;

        const isValid = await comparePassword(parsed.data.password, user.passwordHash);
        if (!isValid) return null;

        const updatedUser = await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });
        await prisma.auditLog.create({
          data: {
            actorUserId: user.id,
            targetUserId: user.id,
            event: "USER_SIGNED_IN",
            metadata: { provider: "credentials" },
          },
        });

        return publicUser(updatedUser);
      },
    }),
    ...(hasGoogleCredentials
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            allowDangerousEmailAccountLinking: false,
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;
      if (!user.email) return false;

      await ensureInitialAdmin();

      const prisma = getPrisma();
      const email = normalizeEmail(user.email);
      let storedUser = await prisma.user.findUnique({ where: { email } });

      if (storedUser?.isSuspended) return false;

      if (!storedUser) {
        const atomicId = await nextAtomicId(prisma);
        const role = roleForNewUser(email);
        storedUser = await prisma.user.create({
          data: {
            atomicId,
            email,
            name: user.name,
            image: user.image,
            role,
            isPro: isProRole(role),
            lastLoginAt: new Date(),
            profile: { create: {} },
            preferences: { create: {} },
            aiMemory: { create: {} },
          },
        });
        await prisma.auditLog.create({
          data: {
            actorUserId: storedUser.id,
            targetUserId: storedUser.id,
            event: "USER_CREATED",
            metadata: { provider: "google" },
          },
        });
        await ensureBasicAccess(prisma, storedUser.id);
      } else {
        storedUser = await prisma.user.update({
          where: { id: storedUser.id },
          data: {
            name: user.name ?? storedUser.name,
            image: user.image ?? storedUser.image,
            lastLoginAt: new Date(),
          },
        });
      }

      await prisma.account.upsert({
        where: {
          provider_providerAccountId: {
            provider: account.provider,
            providerAccountId: account.providerAccountId,
          },
        },
        create: {
          userId: storedUser.id,
          type: account.type,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          refresh_token: account.refresh_token,
          access_token: account.access_token,
          expires_at: account.expires_at,
          token_type: account.token_type,
          scope: account.scope,
          id_token: account.id_token,
          session_state:
            typeof account.session_state === "string" ? account.session_state : undefined,
        },
        update: {
          userId: storedUser.id,
          refresh_token: account.refresh_token,
          access_token: account.access_token,
          expires_at: account.expires_at,
          token_type: account.token_type,
          scope: account.scope,
          id_token: account.id_token,
          session_state:
            typeof account.session_state === "string" ? account.session_state : undefined,
        },
      });

      user.id = storedUser.id;
      user.email = storedUser.email;
      user.name = storedUser.name;
      user.image = storedUser.image;
      user.atomicId = storedUser.atomicId;
      user.role = storedUser.role;
      user.isPro = storedUser.isPro || isProRole(storedUser.role);

      return true;
    },
    async jwt({ token, user }) {
      if (!user?.id) return token;

      const storedUser = await findAuthUser(user.id);
      if (!storedUser || storedUser.isSuspended) return token;

      token.sub = storedUser.id;
      token.email = storedUser.email;
      token.name = storedUser.name;
      token.picture = storedUser.image;
      token.atomicId = storedUser.atomicId;
      token.role = storedUser.role;
      token.isPro = storedUser.isPro || isProRole(storedUser.role);
      return token;
    },
    session({ session, token }) {
      if (!token.sub || !session.user) return session;

      session.user.id = token.sub;
      session.user.atomicId = token.atomicId;
      session.user.role = token.role;
      session.user.isPro = token.isPro;
      return session;
    },
  },
  events: {
    async signOut({ token }) {
      if (!token.sub) return;

      try {
        const prisma = getPrisma();
        await prisma.auditLog.create({
          data: {
            actorUserId: token.sub,
            targetUserId: token.sub,
            event: "USER_SIGNED_OUT",
          },
        });
      } catch {
        // Sign-out must still clear the secure session cookie when logging is unavailable.
      }
    },
  },
};

export const nextAuthHandler = NextAuth(authOptions);
