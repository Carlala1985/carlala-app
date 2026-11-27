-- CreateEnum
CREATE TYPE "public"."HandoverStage" AS ENUM ('PICKUP', 'RETURN');

-- CreateTable
CREATE TABLE "public"."Handover" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "stage" "public"."HandoverStage" NOT NULL,
    "submittedById" TEXT NOT NULL,
    "odometerKm" INTEGER NOT NULL,
    "fuelPercent" INTEGER NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedById" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "objection" TEXT,
    "objectionAt" TIMESTAMP(3),

    CONSTRAINT "Handover_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HandoverPhoto" (
    "id" TEXT NOT NULL,
    "handoverId" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HandoverPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Handover_bookingId_stage_key" ON "public"."Handover"("bookingId", "stage");

-- AddForeignKey
ALTER TABLE "public"."Handover" ADD CONSTRAINT "Handover_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HandoverPhoto" ADD CONSTRAINT "HandoverPhoto_handoverId_fkey" FOREIGN KEY ("handoverId") REFERENCES "public"."Handover"("id") ON DELETE CASCADE ON UPDATE CASCADE;

