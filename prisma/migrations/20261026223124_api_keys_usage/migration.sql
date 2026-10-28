-- CreateEnum
CREATE TYPE "SiteStatus" AS ENUM ('ACTIVE', 'WATCH', 'REVIEW', 'STASIS', 'DATA_GAP', 'PAUSED');

-- CreateEnum
CREATE TYPE "Confidence" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "QualityStatus" AS ENUM ('OK', 'LOW_QUALITY');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('STASIS_DETECTED', 'ACTIVITY_RESUMED', 'DATA_GAP', 'OBSERVATION_AVAILABLE');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'NOTICE', 'WARNING');

-- CreateEnum
CREATE TYPE "SubscriptionState" AS ENUM ('active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete', 'unknown');

-- CreateEnum
CREATE TYPE "MilestoneStage" AS ENUM ('SITE_PREP', 'EXCAVATION', 'FOUNDATION', 'STRUCTURAL_FRAMING', 'BUILDING_ENCLOSURE', 'EXTERIOR_COMPLETION', 'OTHER', 'UNKNOWN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "priceId" TEXT,
    "state" "SubscriptionState" NOT NULL DEFAULT 'unknown',
    "seats" INTEGER NOT NULL DEFAULT 1,
    "drawIntelligenceSeats" INTEGER NOT NULL DEFAULT 0,
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Site" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "geometryGeojson" JSONB NOT NULL,
    "areaAcres" DOUBLE PRECISION,
    "loanAmount" DECIMAL(14,2),
    "loanNumber" TEXT,
    "constructionStart" TIMESTAMP(3),
    "constructionEnd" TIMESTAMP(3),
    "status" "SiteStatus" NOT NULL DEFAULT 'DATA_GAP',
    "stasisScore" INTEGER NOT NULL DEFAULT 0,
    "confidence" "Confidence" NOT NULL DEFAULT 'LOW',
    "drawIntelligence" BOOLEAN NOT NULL DEFAULT false,
    "analysisVersion" TEXT,
    "thresholdsVersion" TEXT,
    "lastEvaluatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteMember" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteObservation" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerObservationId" TEXT NOT NULL,
    "observationDate" TIMESTAMP(3) NOT NULL,
    "cloudPercent" DOUBLE PRECISION,
    "usablePixelPercent" DOUBLE PRECISION,
    "qualityStatus" "QualityStatus" NOT NULL DEFAULT 'OK',
    "imageryUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteMetric" (
    "id" TEXT NOT NULL,
    "observationId" TEXT NOT NULL,
    "meanNdvi" DOUBLE PRECISION,
    "medianNdvi" DOUBLE PRECISION,
    "meanNdbi" DOUBLE PRECISION,
    "medianNdbi" DOUBLE PRECISION,
    "meanBsi" DOUBLE PRECISION,
    "medianBsi" DOUBLE PRECISION,
    "siteChangePercent" DOUBLE PRECISION,
    "changeVelocity" DOUBLE PRECISION,
    "baselineDeviation" DOUBLE PRECISION,
    "confidence" "Confidence" NOT NULL DEFAULT 'LOW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteAlert" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'NOTICE',
    "score" INTEGER NOT NULL,
    "confidence" "Confidence" NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "observationId" TEXT,
    "message" TEXT,
    "analysisVersion" TEXT,
    "thresholdsVersion" TEXT,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emailSentAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),

    CONSTRAINT "SiteAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailEvent" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerId" TEXT,
    "subject" TEXT,
    "delivered" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisRun" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "analysisVersion" TEXT NOT NULL,
    "thresholdsVersion" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "observationIds" TEXT[],
    "resultStatus" "SiteStatus",
    "resultScore" INTEGER,
    "resultConfidence" "Confidence",
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "AnalysisRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiLog" (
    "id" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "durationMs" INTEGER,
    "siteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteCheck" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "stripeSessionId" TEXT,
    "stripePaymentId" TEXT,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "siteName" TEXT,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "areaAcres" DOUBLE PRECISION,
    "geometryGeojson" JSONB,
    "status" "SiteStatus",
    "stasisScore" INTEGER,
    "confidence" "Confidence",
    "provider" TEXT,
    "resultJson" JSONB,
    "analyzedAt" TIMESTAMP(3),
    "upsellClickedAt" TIMESTAMP(3),
    "resultEmailedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteMilestone" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "reportedStage" "MilestoneStage" NOT NULL DEFAULT 'UNKNOWN',
    "expectedMilestone" TEXT,
    "targetDate" TIMESTAMP(3),
    "actualStageReported" TEXT,
    "drawReference" TEXT,
    "drawAmount" DECIMAL(14,2),
    "note" TEXT,
    "lastFindingCode" TEXT,
    "lastFindingAt" TIMESTAMP(3),
    "lastFindingJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "hashedKey" TEXT NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "apiKeyId" TEXT,
    "operation" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "outcome" TEXT NOT NULL,
    "billableUnits" INTEGER NOT NULL DEFAULT 0,
    "priceVersion" TEXT,
    "route" TEXT,
    "status" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "Site_userId_idx" ON "Site"("userId");

-- CreateIndex
CREATE INDEX "Site_status_idx" ON "Site"("status");

-- CreateIndex
CREATE INDEX "SiteMember_siteId_idx" ON "SiteMember"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "SiteMember_siteId_userId_key" ON "SiteMember"("siteId", "userId");

-- CreateIndex
CREATE INDEX "SiteObservation_siteId_observationDate_idx" ON "SiteObservation"("siteId", "observationDate");

-- CreateIndex
CREATE UNIQUE INDEX "SiteObservation_siteId_provider_providerObservationId_key" ON "SiteObservation"("siteId", "provider", "providerObservationId");

-- CreateIndex
CREATE UNIQUE INDEX "SiteMetric_observationId_key" ON "SiteMetric"("observationId");

-- CreateIndex
CREATE UNIQUE INDEX "SiteAlert_idempotencyKey_key" ON "SiteAlert"("idempotencyKey");

-- CreateIndex
CREATE INDEX "SiteAlert_siteId_triggeredAt_idx" ON "SiteAlert"("siteId", "triggeredAt");

-- CreateIndex
CREATE INDEX "EmailEvent_to_createdAt_idx" ON "EmailEvent"("to", "createdAt");

-- CreateIndex
CREATE INDEX "AnalysisRun_siteId_startedAt_idx" ON "AnalysisRun"("siteId", "startedAt");

-- CreateIndex
CREATE INDEX "ApiLog_route_createdAt_idx" ON "ApiLog"("route", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SiteCheck_token_key" ON "SiteCheck"("token");

-- CreateIndex
CREATE UNIQUE INDEX "SiteCheck_stripeSessionId_key" ON "SiteCheck"("stripeSessionId");

-- CreateIndex
CREATE INDEX "SiteCheck_email_createdAt_idx" ON "SiteCheck"("email", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SiteMilestone_siteId_key" ON "SiteMilestone"("siteId");

-- CreateIndex
CREATE INDEX "SiteMilestone_siteId_idx" ON "SiteMilestone"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_hashedKey_key" ON "ApiKey"("hashedKey");

-- CreateIndex
CREATE INDEX "ApiKey_userId_idx" ON "ApiKey"("userId");

-- CreateIndex
CREATE INDEX "UsageRecord_userId_createdAt_idx" ON "UsageRecord"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UsageRecord_apiKeyId_createdAt_idx" ON "UsageRecord"("apiKeyId", "createdAt");

-- CreateIndex
CREATE INDEX "UsageRecord_operation_createdAt_idx" ON "UsageRecord"("operation", "createdAt");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteMember" ADD CONSTRAINT "SiteMember_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteMember" ADD CONSTRAINT "SiteMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteObservation" ADD CONSTRAINT "SiteObservation_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteMetric" ADD CONSTRAINT "SiteMetric_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "SiteObservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteAlert" ADD CONSTRAINT "SiteAlert_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisRun" ADD CONSTRAINT "AnalysisRun_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteMilestone" ADD CONSTRAINT "SiteMilestone_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;
