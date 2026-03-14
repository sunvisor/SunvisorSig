import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreate = vi.fn();
const mockFindMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditLog: {
      create: mockCreate,
      findMany: mockFindMany,
    },
  },
}));

describe("audit log helpers", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockFindMany.mockReset();
  });

  it("creates an audit log with the provided payload", async () => {
    const { createAuditLog } = await import("@/lib/audit-log");

    await createAuditLog({
      actorUserId: "user-1",
      actionType: "FORUM_CREATED",
      targetType: "FORUM",
      targetId: "forum-1",
      targetLabel: "Acme Forum",
      metadata: {
        themeName: "Ocean",
      },
    });

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        actorUserId: "user-1",
        actionType: "FORUM_CREATED",
        targetType: "FORUM",
        targetId: "forum-1",
        targetLabel: "Acme Forum",
        metadata: {
          themeName: "Ocean",
        },
      },
    });
  });

  it("fetches the latest audit logs with actor display info", async () => {
    const logs = [{ id: "log-1" }];
    mockFindMany.mockResolvedValue(logs);

    const { getAuditLogs } = await import("@/lib/audit-log");
    const result = await getAuditLogs();

    expect(mockFindMany).toHaveBeenCalledWith({
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
    expect(result).toBe(logs);
  });
});
