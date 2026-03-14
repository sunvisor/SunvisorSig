import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetCurrentUser = vi.fn();
const mockSubscribeToNotificationRefresh = vi.fn();

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mockGetCurrentUser,
}));

vi.mock("@/lib/notification-events", () => ({
  subscribeToNotificationRefresh: mockSubscribeToNotificationRefresh,
}));

describe("/api/notifications/stream", () => {
  beforeEach(() => {
    mockGetCurrentUser.mockReset();
    mockSubscribeToNotificationRefresh.mockReset();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const { GET } = await import("@/app/api/notifications/stream/route");
    const response = await GET(new Request("http://localhost/api/notifications/stream"));

    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Unauthorized");
  });

  it("opens an event stream and emits refresh events", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });

    let listener: (() => void) | undefined;
    const unsubscribe = vi.fn();
    mockSubscribeToNotificationRefresh.mockImplementation((_userId, callback: () => void) => {
      listener = callback;
      return unsubscribe;
    });

    const { GET } = await import("@/app/api/notifications/stream/route");
    const response = await GET(new Request("http://localhost/api/notifications/stream"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
    expect(mockSubscribeToNotificationRefresh).toHaveBeenCalledWith("user-1", expect.any(Function));

    const reader = response.body?.getReader();
    expect(reader).toBeDefined();

    const decoder = new TextDecoder();
    const firstChunk = await reader!.read();
    expect(decoder.decode(firstChunk.value)).toContain("retry: 3000");

    listener?.();

    const secondChunk = await reader!.read();
    expect(decoder.decode(secondChunk.value)).toContain("event: refresh");

    await reader!.cancel();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
