-- CreateEnum
CREATE TYPE "public"."DriverStatus" AS ENUM ('NONE', 'PROCESSING', 'VERIFIED', 'REQUIRES_INPUT');

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "driverError" TEXT,
ADD COLUMN     "driverName" TEXT,
ADD COLUMN     "driverStatus" "public"."DriverStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "driverVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "identitySessionId" TEXT,
ADD COLUMN     "licenceCountry" TEXT,
ADD COLUMN     "licenceExpiresOn" DATE;

-- CreateIndex
CREATE UNIQUE INDEX "User_identitySessionId_key" ON "public"."User"("identitySessionId");

