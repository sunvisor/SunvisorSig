import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetCurrentUser = vi.fn();
const mockGetUnreadNotifications = vi.fn();
const mockMarkPostNotificationsAsRead = vi.fn();
const mockSerializeNotification = vi.fn();

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mockGetCurrentUser,
}));

vi.mock("@/lib/notification-service", () => ({
  getUnreadNotifications: mockGetUnreadNotifications,
  markPostNotificationsAsRead: mockMarkPostNotificationsAsRead,
}));

vi.mock("@/lib/notification-presenter", () => ({
  serializeNotification: mockSerializeNotification,
}));

describe("/api/notifications", () => {
  beforeEach(() => {
    mockGetCurrentUser.mockReset();
    mockGetUnreadNotifications.mockReset();
    mockMarkPostNotificationsAsRead.mockReset();
    mockSerializeNotification.mockReset();
  });

  it("returns 401 for GET when unauthenticated", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const { GET } = await import("@/app/api/notifications/route");
    const response = await GET();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ notifications: [] });
  });

  it("returns serialized unread notifications for GET", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockGetUnreadNotifications.mockResolvedValue([{ id: "notification-1" }]);
    mockSerializeNotification.mockReturnValue({ id: "notification-1", href: "/forums/x" });

    const { GET } = await import("@/app/api/notifications/route");
    const response = await GET();

    expect(mockGetUnreadNotifications).toHaveBeenCalledWith("user-1");
    expect(mockSerializeNotification).toHaveBeenCalledTimes(1);
    expect(mockSerializeNotification.mock.calls[0]?.[0]).toEqual({ id: "notification-1" });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      notifications: [{ id: "notification-1", href: "/forums/x" }],
    });
  });

  it("returns 401 for POST when unauthenticated", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const { POST } = await import("@/app/api/notifications/route");
    const response = await POST(
      new Request("http://localhost/api/notifications", {
        method: "POST",
        body: JSON.stringify({ postId: "post-1" }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false });
  });

  it("returns 400 for POST when postId is missing", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });

    const { POST } = await import("@/app/api/notifications/route");
    const response = await POST(
      new Request("http://localhost/api/notifications", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false });
    expect(mockMarkPostNotificationsAsRead).not.toHaveBeenCalled();
  });

  it("marks notifications as read for POST", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });

    const { POST } = await import("@/app/api/notifications/route");
    const response = await POST(
      new Request("http://localhost/api/notifications", {
        method: "POST",
        body: JSON.stringify({ postId: "post-1" }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(mockMarkPostNotificationsAsRead).toHaveBeenCalledWith("user-1", "post-1");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });
});
