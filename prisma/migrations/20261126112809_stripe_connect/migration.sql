-- AlterTable
ALTER TABLE "public"."Booking" ADD COLUMN     "refundedAt" TIMESTAMP(3),
ADD COLUMN     "stripeChargeId" TEXT,
ADD COLUMN     "stripePaymentIntentId" TEXT,
ADD COLUMN     "stripeRefundId" TEXT,
ADD COLUMN     "stripeTransferId" TEXT,
ADD COLUMN     "transferredAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "payoutsReady" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripeAccountId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Booking_stripeTransferId_key" ON "public"."Booking"("stripeTransferId");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeAccountId_key" ON "public"."User"("stripeAccountId");

