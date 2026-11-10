-- CreateEnum
CREATE TYPE "AccountOrigin" AS ENUM ('SIGNUP', 'AUTO_CHECKOUT');

-- CreateEnum
CREATE TYPE "BookingOrigin" AS ENUM ('INTERNAL', 'PUBLIC_LINK');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "contextNote" TEXT,
ADD COLUMN     "origin" "BookingOrigin" NOT NULL DEFAULT 'INTERNAL',
ADD COLUMN     "slotHoldExpiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accountOrigin" "AccountOrigin" NOT NULL DEFAULT 'SIGNUP',
ADD COLUMN     "passwordSet" BOOLEAN NOT NULL DEFAULT true;
