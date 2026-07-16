-- Additive access-management expansion. Existing roles, subscriptions, users,
-- and enrollment data remain intact; new access records are derived from them.

ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'BASIC';

DO $$ BEGIN
  CREATE TYPE "AccessPlan" AS ENUM ('FREE', 'BASIC', 'PRO', 'LIFETIME');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AccessType" AS ENUM ('FREE_TRIAL', 'BASIC_PLAN', 'PRO_PLAN', 'ATOMIC_BATCH_FREE', 'LIFETIME_ACCESS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AccessStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'SUSPENDED', 'REVOKED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Subscription"
  ADD COLUMN IF NOT EXISTS "plan" "AccessPlan" NOT NULL DEFAULT 'BASIC',
  ADD COLUMN IF NOT EXISTS "accessType" "AccessType" NOT NULL DEFAULT 'BASIC_PLAN',
  ADD COLUMN IF NOT EXISTS "accessStatus" "AccessStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS "grantedByUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "reason" TEXT,
  ADD COLUMN IF NOT EXISTS "batchId" TEXT,
  ADD COLUMN IF NOT EXISTS "courseId" TEXT,
  ADD COLUMN IF NOT EXISTS "enrollmentId" TEXT,
  ADD COLUMN IF NOT EXISTS "externalEnrollmentId" TEXT,
  ADD COLUMN IF NOT EXISTS "syncSource" TEXT,
  ADD COLUMN IF NOT EXISTS "metadata" JSONB;

ALTER TABLE "Enrollment"
  ADD COLUMN IF NOT EXISTS "externalEnrollmentId" TEXT,
  ADD COLUMN IF NOT EXISTS "syncSource" TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS "syncedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "UserAccess" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "subscriptionId" TEXT,
  "plan" "AccessPlan" NOT NULL DEFAULT 'FREE',
  "accessType" "AccessType" NOT NULL DEFAULT 'FREE_TRIAL',
  "status" "AccessStatus" NOT NULL DEFAULT 'EXPIRED',
  "startsAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "batchId" TEXT,
  "courseId" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserAccess_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserAccess_userId_key" ON "UserAccess"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "UserAccess_subscriptionId_key" ON "UserAccess"("subscriptionId");
CREATE INDEX IF NOT EXISTS "UserAccess_status_plan_expiresAt_idx" ON "UserAccess"("status", "plan", "expiresAt");
CREATE INDEX IF NOT EXISTS "UserAccess_batchId_idx" ON "UserAccess"("batchId");
CREATE INDEX IF NOT EXISTS "UserAccess_courseId_idx" ON "UserAccess"("courseId");
CREATE INDEX IF NOT EXISTS "Subscription_userId_accessStatus_endsAt_idx" ON "Subscription"("userId", "accessStatus", "endsAt");
CREATE INDEX IF NOT EXISTS "Subscription_batchId_accessStatus_idx" ON "Subscription"("batchId", "accessStatus");
CREATE INDEX IF NOT EXISTS "Subscription_courseId_accessStatus_idx" ON "Subscription"("courseId", "accessStatus");
CREATE INDEX IF NOT EXISTS "Subscription_externalEnrollmentId_idx" ON "Subscription"("externalEnrollmentId");
CREATE UNIQUE INDEX IF NOT EXISTS "Enrollment_syncSource_externalEnrollmentId_key" ON "Enrollment"("syncSource", "externalEnrollmentId");

ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_grantedByUserId_fkey" FOREIGN KEY ("grantedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserAccess" ADD CONSTRAINT "UserAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserAccess" ADD CONSTRAINT "UserAccess_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserAccess" ADD CONSTRAINT "UserAccess_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserAccess" ADD CONSTRAINT "UserAccess_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Materialize an effective access row for each current paid subscription if one
-- already existed before this migration. The newest eligible record wins.
INSERT INTO "UserAccess" (
  "id", "userId", "subscriptionId", "plan", "accessType", "status",
  "startsAt", "expiresAt", "batchId", "courseId", "updatedAt", "createdAt"
)
SELECT
  CONCAT('migrated-access-', ROW_NUMBER() OVER (ORDER BY ranked."userId")),
  ranked."userId", ranked."id", ranked."plan", ranked."accessType", ranked."accessStatus",
  ranked."startsAt", ranked."endsAt", ranked."batchId", ranked."courseId", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT ON ("userId") *
  FROM "Subscription"
  WHERE "accessStatus" = 'ACTIVE'
    AND ("endsAt" IS NULL OR "endsAt" > CURRENT_TIMESTAMP)
  ORDER BY "userId", "grantedAt" DESC, "createdAt" DESC
) AS ranked
ON CONFLICT ("userId") DO NOTHING;
