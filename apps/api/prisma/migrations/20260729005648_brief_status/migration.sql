-- CreateEnum
CREATE TYPE "BriefStatus" AS ENUM ('DRAFT', 'ACTIVE', 'IN_REVIEW', 'CLOSED');

-- AlterTable
ALTER TABLE "Brief" ADD COLUMN     "status" "BriefStatus" NOT NULL DEFAULT 'DRAFT';
