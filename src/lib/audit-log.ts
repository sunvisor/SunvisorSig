import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function createAuditLog(input: {
  actorUserId: string;
  actionType:
    | "FORUM_CREATED"
    | "FORUM_UPDATED"
    | "FORUM_DELETED"
    | "CHANNEL_CREATED"
    | "CHANNEL_DELETED"
    | "FORUM_MEMBER_ADDED"
    | "FORUM_MEMBER_REMOVED"
    | "INVITATION_CREATED"
    | "INVITATION_CANCELED";
  targetType: "FORUM" | "CHANNEL" | "FORUM_MEMBER" | "INVITATION";
  targetId: string;
  targetLabel: string;
  metadata?: Prisma.InputJsonValue;
}) {
  await prisma.auditLog.create({
    data: input,
  });
}

export async function getAuditLogs() {
  return prisma.auditLog.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
    include: {
      actorUser: {
        select: {
          displayName: true,
          email: true,
        },
      },
    },
  });
}
