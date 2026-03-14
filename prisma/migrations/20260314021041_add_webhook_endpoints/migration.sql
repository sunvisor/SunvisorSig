-- CreateEnum
CREATE TYPE "WebhookEndpointType" AS ENUM ('SLACK', 'DISCORD', 'TEAMS', 'GOOGLE_CHAT');

-- CreateEnum
CREATE TYPE "WebhookEventType" AS ENUM ('POST_CREATED', 'COMMENT_CREATED', 'MENTIONED', 'STATUS_CHANGED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditActionType" ADD VALUE 'WEBHOOK_CREATED';
ALTER TYPE "AuditActionType" ADD VALUE 'WEBHOOK_UPDATED';
ALTER TYPE "AuditActionType" ADD VALUE 'WEBHOOK_DELETED';
ALTER TYPE "AuditActionType" ADD VALUE 'WEBHOOK_TESTED';

-- AlterEnum
ALTER TYPE "AuditTargetType" ADD VALUE 'WEBHOOK';

-- CreateTable
CREATE TABLE "WebhookEndpoint" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "WebhookEndpointType" NOT NULL,
    "webhookUrl" TEXT NOT NULL,
    "events" "WebhookEventType"[],
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookEndpoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebhookEndpoint_enabled_type_idx" ON "WebhookEndpoint"("enabled", "type");

-- AddForeignKey
ALTER TABLE "WebhookEndpoint" ADD CONSTRAINT "WebhookEndpoint_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
