-- Additive multi-batch membership model. Enrollment remains course-scoped for
-- compatibility, while this table permits a student to join any number of batches.

CREATE TABLE IF NOT EXISTS "BatchMembership" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "enrollmentId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "externalMemberId" TEXT,
  "syncSource" TEXT NOT NULL DEFAULT 'manual',
  "syncedAt" TIMESTAMP(3),
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BatchMembership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BatchMembership_userId_batchId_key" ON "BatchMembership"("userId", "batchId");
CREATE UNIQUE INDEX IF NOT EXISTS "BatchMembership_syncSource_externalMemberId_key" ON "BatchMembership"("syncSource", "externalMemberId");
CREATE INDEX IF NOT EXISTS "BatchMembership_batchId_status_idx" ON "BatchMembership"("batchId", "status");
CREATE INDEX IF NOT EXISTS "BatchMembership_userId_status_idx" ON "BatchMembership"("userId", "status");

ALTER TABLE "BatchMembership" ADD CONSTRAINT "BatchMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BatchMembership" ADD CONSTRAINT "BatchMembership_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BatchMembership" ADD CONSTRAINT "BatchMembership_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "BatchMembership" (
  "id", "userId", "batchId", "enrollmentId", "status", "syncSource", "joinedAt", "updatedAt"
)
SELECT
  CONCAT('migrated-membership-', ROW_NUMBER() OVER (ORDER BY "id")),
  "userId", "batchId", "id", "status", 'migration', "enrolledAt", CURRENT_TIMESTAMP
FROM "Enrollment"
WHERE "batchId" IS NOT NULL
ON CONFLICT ("userId", "batchId") DO NOTHING;
