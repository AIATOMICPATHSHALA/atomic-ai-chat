-- AlterTable
ALTER TABLE "TestAttempt" ADD COLUMN     "subject" TEXT;

-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "currentStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastActiveDate" TIMESTAMP(3),
ADD COLUMN     "longestStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "xp" INTEGER NOT NULL DEFAULT 0;
