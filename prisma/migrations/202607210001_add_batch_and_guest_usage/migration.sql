-- Additive profile batch tracking and anonymous guest usage accounting.

DO $$ BEGIN
  CREATE TYPE "AtomicBatch" AS ENUM ('SELECTION_PRO', 'SELECTION_1_0', 'ARAMBH', 'MANZIL', 'NO_BATCH');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "UserProfile"
  ADD COLUMN IF NOT EXISTS "atomicBatch" "AtomicBatch" NOT NULL DEFAULT 'NO_BATCH';

CREATE TABLE IF NOT EXISTS "GuestUsage" (
  "id" TEXT NOT NULL,
  "guestId" TEXT NOT NULL,
  "ip" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GuestUsage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "GuestUsage_guestId_key" ON "GuestUsage"("guestId");
CREATE INDEX IF NOT EXISTS "GuestUsage_ip_idx" ON "GuestUsage"("ip");
