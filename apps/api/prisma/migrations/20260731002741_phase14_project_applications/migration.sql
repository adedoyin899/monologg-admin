-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('APPLIED', 'SHORTLISTED', 'SELECTED', 'REJECTED', 'WITHDRAWN');

-- AlterTable
ALTER TABLE "Brief" ADD COLUMN     "applicantCap" INTEGER,
ADD COLUMN     "applicationsOpen" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "briefId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "pitch" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'APPLIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Application_briefId_idx" ON "Application"("briefId");

-- CreateIndex
CREATE INDEX "Application_creatorId_idx" ON "Application"("creatorId");

-- CreateIndex
CREATE UNIQUE INDEX "Application_briefId_creatorId_key" ON "Application"("briefId", "creatorId");

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "Brief"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
