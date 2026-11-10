-- CreateEnum
CREATE TYPE "MediaKitMode" AS ENUM ('AUTO', 'UPLOAD');

-- CreateEnum
CREATE TYPE "VerificationRecordingStatus" AS ENUM ('UPLOADED', 'IN_REVIEW', 'APPROVED', 'NEEDS_RERECORD');

-- CreateEnum
CREATE TYPE "HeightRange" AS ENUM ('UNDER_150CM', 'CM_150_160', 'CM_160_170', 'CM_170_180', 'CM_180_190', 'OVER_190CM');

-- CreateEnum
CREATE TYPE "WeightRange" AS ENUM ('UNDER_50KG', 'KG_50_65', 'KG_65_80', 'KG_80_95', 'OVER_95KG');

-- CreateEnum
CREATE TYPE "AgeRange" AS ENUM ('RANGE_18_25', 'RANGE_26_35', 'RANGE_36_45', 'RANGE_46_55', 'RANGE_56_65', 'OVER_65');

-- CreateEnum
CREATE TYPE "BuildType" AS ENUM ('SLIM', 'ATHLETIC', 'AVERAGE', 'CURVY', 'PLUS_SIZE', 'MUSCULAR');

-- CreateEnum
CREATE TYPE "Complexion" AS ENUM ('FAIR', 'LIGHT', 'MEDIUM', 'TAN', 'DARK', 'DEEP');

-- CreateEnum
CREATE TYPE "HairColor" AS ENUM ('BLACK', 'BROWN', 'BLONDE', 'RED', 'GREY', 'WHITE', 'DYED_OTHER');

-- CreateEnum
CREATE TYPE "EyeColor" AS ENUM ('BROWN', 'BLACK', 'HAZEL', 'GREEN', 'BLUE', 'GREY');

-- CreateEnum
CREATE TYPE "GenderPresentation" AS ENUM ('MASCULINE', 'FEMININE', 'ANDROGYNOUS', 'NON_BINARY');

-- CreateEnum
CREATE TYPE "ShoeSizeUnit" AS ENUM ('EU', 'US', 'UK');

-- CreateTable
CREATE TABLE "MediaKit" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "mode" "MediaKitMode" NOT NULL DEFAULT 'AUTO',
    "uploadUrl" TEXT,
    "uploadSizeBytes" INTEGER,
    "autoVersion" INTEGER NOT NULL DEFAULT 1,
    "autoLastRenderedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaKit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationRecording" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "durationSec" INTEGER NOT NULL,
    "guidelineAck" BOOLEAN NOT NULL,
    "status" "VerificationRecordingStatus" NOT NULL DEFAULT 'IN_REVIEW',
    "reviewerNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationRecording_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhysicalAttributes" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "heightRange" "HeightRange",
    "weightRange" "WeightRange",
    "ageRange" "AgeRange",
    "build" "BuildType",
    "complexion" "Complexion",
    "hairColor" "HairColor",
    "eyeColor" "EyeColor",
    "genderPresentation" "GenderPresentation",
    "shoeSize" TEXT,
    "shoeSizeUnit" "ShoeSizeUnit",
    "distinctiveFeatures" TEXT,
    "visibility" JSONB NOT NULL DEFAULT '{}',
    "consentVersion" TEXT NOT NULL,
    "consentedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhysicalAttributes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MediaKit_creatorId_key" ON "MediaKit"("creatorId");

-- CreateIndex
CREATE UNIQUE INDEX "PhysicalAttributes_creatorId_key" ON "PhysicalAttributes"("creatorId");

-- AddForeignKey
ALTER TABLE "MediaKit" ADD CONSTRAINT "MediaKit_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationRecording" ADD CONSTRAINT "VerificationRecording_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalAttributes" ADD CONSTRAINT "PhysicalAttributes_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill (features.md Phase 12A spec: "Every creator gets a MediaKit row on
-- creation (backfill for existing creators as part of the migration)"). Every
-- pre-existing Creator gets an AUTO-mode MediaKit at version 1 — the same
-- state a brand-new creator gets going forward (routes/auth.ts creates one
-- inline at registration from this migration onward). The id is built from
-- md5(random())/clock_timestamp() rather than gen_random_uuid() specifically
-- to avoid depending on the pgcrypto extension being enabled on every target
-- environment — only uniqueness matters for a one-time backfill id, not the
-- exact format, and this needs zero extensions on any stock Postgres.
INSERT INTO "MediaKit" ("id", "creatorId", "mode", "autoVersion", "updatedAt")
SELECT 'mk_' || substr(md5(random()::text || clock_timestamp()::text || "id"), 1, 24), "id", 'AUTO', 1, CURRENT_TIMESTAMP
FROM "Creator"
ON CONFLICT ("creatorId") DO NOTHING;
