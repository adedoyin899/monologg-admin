-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentStatus" ADD VALUE 'RELEASING';
ALTER TYPE "PaymentStatus" ADD VALUE 'REFUNDING';

-- AlterTable
ALTER TABLE "PaymentEvent" ADD COLUMN     "eventId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEvent_paymentId_type_eventId_key" ON "PaymentEvent"("paymentId", "type", "eventId");

