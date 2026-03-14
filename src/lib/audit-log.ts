import type { AuditActionType, AuditTargetType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function createAuditLog(input: {
  actorUserId: string;
  actionType: AuditActionType;
  targetType: AuditTargetType;
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
