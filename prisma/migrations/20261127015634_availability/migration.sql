-- AlterTable
ALTER TABLE "public"."Car" ADD COLUMN     "hasAgenda" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "weeklyHours" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- CreateTable
CREATE TABLE "public"."AvailabilityException" (
    "id" TEXT NOT NULL,
    "carId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "hours" INTEGER[],

    CONSTRAINT "AvailabilityException_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AvailabilityException_carId_date_key" ON "public"."AvailabilityException"("carId", "date");

-- AddForeignKey
ALTER TABLE "public"."AvailabilityException" ADD CONSTRAINT "AvailabilityException_carId_fkey" FOREIGN KEY ("carId") REFERENCES "public"."Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;

