-- CreateEnum
CREATE TYPE "AuditActionType" AS ENUM ('FORUM_CREATED', 'FORUM_UPDATED', 'FORUM_DELETED', 'CHANNEL_CREATED', 'CHANNEL_DELETED', 'FORUM_MEMBER_ADDED', 'FORUM_MEMBER_REMOVED', 'INVITATION_CREATED', 'INVITATION_CANCELED');

-- CreateEnum
CREATE TYPE "AuditTargetType" AS ENUM ('FORUM', 'CHANNEL', 'FORUM_MEMBER', 'INVITATION');

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorUserId" UUID NOT NULL,
    "actionType" "AuditActionType" NOT NULL,
    "targetType" "AuditTargetType" NOT NULL,
    "targetId" UUID NOT NULL,
    "targetLabel" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actionType_createdAt_idx" ON "AuditLog"("actionType", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
