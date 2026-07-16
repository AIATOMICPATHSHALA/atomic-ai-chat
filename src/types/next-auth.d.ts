import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      atomicId?: string;
      role?: "GUEST" | "STUDENT" | "BASIC" | "PRO" | "FACULTY" | "ADMIN";
      isPro?: boolean;
    } & NonNullable<DefaultSession["user"]>;
  }

  interface User {
    atomicId?: string;
    role?: "GUEST" | "STUDENT" | "BASIC" | "PRO" | "FACULTY" | "ADMIN";
    isPro?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    atomicId?: string;
    role?: "GUEST" | "STUDENT" | "BASIC" | "PRO" | "FACULTY" | "ADMIN";
    isPro?: boolean;
  }
}
