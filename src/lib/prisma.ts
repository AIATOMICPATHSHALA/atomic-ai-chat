import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

type PrismaGlobal = typeof globalThis & {
  atomicPrisma?: PrismaClient;
};

export class DatabaseUnavailableError extends Error {
  constructor() {
    super(
      "Server-backed accounts are not configured yet. Add DATABASE_URL and run the Prisma migration."
    );
    this.name = "DatabaseUnavailableError";
  }
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) return null;

  return new PrismaClient({
    adapter: new PrismaPg(connectionString),
  });
}

export function getPrisma(): PrismaClient {
  const globalForPrisma = globalThis as PrismaGlobal;

  if (!globalForPrisma.atomicPrisma) {
    const client = createPrismaClient();
    if (!client) throw new DatabaseUnavailableError();

    globalForPrisma.atomicPrisma = client;
  }

  return globalForPrisma.atomicPrisma;
}

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL?.trim());
}
