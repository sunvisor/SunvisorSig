/*
  Warnings:

  - Added the required column `forumId` to the `WebhookEndpoint` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "WebhookEndpoint_enabled_type_idx";

-- AlterTable
ALTER TABLE "WebhookEndpoint" ADD COLUMN     "forumId" UUID NOT NULL;

-- CreateIndex
CREATE INDEX "WebhookEndpoint_forumId_enabled_type_idx" ON "WebhookEndpoint"("forumId", "enabled", "type");

-- AddForeignKey
ALTER TABLE "WebhookEndpoint" ADD CONSTRAINT "WebhookEndpoint_forumId_fkey" FOREIGN KEY ("forumId") REFERENCES "Forum"("id") ON DELETE CASCADE ON UPDATE CASCADE;
