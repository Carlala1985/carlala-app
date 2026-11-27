-- CreateTable
CREATE TABLE "public"."PageView" (
    "id" TEXT NOT NULL,
    "site" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "referrer" TEXT,
    "country" TEXT,
    "device" TEXT NOT NULL,
    "lang" TEXT,
    "visitor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AnalyticsSalt" (
    "day" TEXT NOT NULL,
    "salt" TEXT NOT NULL,

    CONSTRAINT "AnalyticsSalt_pkey" PRIMARY KEY ("day")
);

-- CreateIndex
CREATE INDEX "PageView_createdAt_idx" ON "public"."PageView"("createdAt");

-- CreateIndex
CREATE INDEX "PageView_site_createdAt_idx" ON "public"."PageView"("site", "createdAt");

