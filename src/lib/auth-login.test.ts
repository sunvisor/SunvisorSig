import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindUnique = vi.fn();
const mockVerifyPassword = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mockFindUnique,
    },
  },
}));

vi.mock("@/lib/password", () => ({
  verifyPassword: mockVerifyPassword,
}));

describe("authenticateUser", () => {
  beforeEach(() => {
    mockFindUnique.mockReset();
    mockVerifyPassword.mockReset();
  });

  it("rejects empty credentials", async () => {
    const { authenticateUser } = await import("@/lib/auth");

    await expect(authenticateUser("", "")).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });
  });

  it("rejects unknown users", async () => {
    mockFindUnique.mockResolvedValue(null);
    const { authenticateUser } = await import("@/lib/auth");

    await expect(authenticateUser("user@example.com", "password123")).rejects.toMatchObject({
      code: "INVITATION_NOT_FOUND",
    });
  });

  it("rejects inactive users", async () => {
    mockFindUnique.mockResolvedValue({
      id: "user-1",
      passwordHash: "hash",
      status: "SUSPENDED",
    });
    const { authenticateUser } = await import("@/lib/auth");

    await expect(authenticateUser("user@example.com", "password123")).rejects.toMatchObject({
      code: "INVITATION_NOT_FOUND",
    });
  });

  it("rejects wrong passwords", async () => {
    mockFindUnique.mockResolvedValue({
      id: "user-1",
      passwordHash: "hash",
      status: "ACTIVE",
    });
    mockVerifyPassword.mockReturnValue(false);
    const { authenticateUser } = await import("@/lib/auth");

    await expect(authenticateUser("user@example.com", "wrong")).rejects.toMatchObject({
      code: "INVITATION_NOT_FOUND",
    });
  });

  it("returns the active user when credentials are valid", async () => {
    const user = {
      id: "user-1",
      email: "user@example.com",
      passwordHash: "hash",
      status: "ACTIVE",
    };
    mockFindUnique.mockResolvedValue(user);
    mockVerifyPassword.mockReturnValue(true);
    const { authenticateUser } = await import("@/lib/auth");

    await expect(authenticateUser("USER@example.com ", "password123")).resolves.toEqual(user);
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { email: "user@example.com" },
    });
    expect(mockVerifyPassword).toHaveBeenCalledWith("password123", "hash");
  });
});
