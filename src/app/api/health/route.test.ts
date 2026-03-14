import { beforeEach, describe, expect, it, vi } from "vitest";

const mockQueryRaw = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: mockQueryRaw,
  },
}));

describe("/api/health", () => {
  beforeEach(() => {
    mockQueryRaw.mockReset();
  });

  it("returns app and db up when the database responds", async () => {
    mockQueryRaw.mockResolvedValue([{ "?column?": 1 }]);

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      app: "up",
      db: "up",
    });
  });

  it("returns 503 when the database check fails", async () => {
    mockQueryRaw.mockRejectedValue(new Error("db down"));

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      app: "up",
      db: "down",
    });
  });
});
