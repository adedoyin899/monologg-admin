-- CreateEnum
CREATE TYPE "TaggingStatus" AS ENUM ('QUEUED', 'TAGGING', 'DONE', 'FAILED');

-- AlterTable
ALTER TABLE "MediaAsset" ADD COLUMN     "taggingStatus" "TaggingStatus" NOT NULL DEFAULT 'QUEUED';
