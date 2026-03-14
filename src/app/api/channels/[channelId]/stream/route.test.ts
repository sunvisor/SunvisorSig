import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetCurrentUser = vi.fn();
const mockSubscribeToChannelActivity = vi.fn();
const mockChannelFindUnique = vi.fn();
const mockForumMemberFindUnique = vi.fn();

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mockGetCurrentUser,
}));

vi.mock("@/lib/notification-events", () => ({
  subscribeToChannelActivity: mockSubscribeToChannelActivity,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    channel: {
      findUnique: mockChannelFindUnique,
    },
    forumMember: {
      findUnique: mockForumMemberFindUnique,
    },
  },
}));

describe("/api/channels/[channelId]/stream", () => {
  beforeEach(() => {
    vi.resetModules();
    mockGetCurrentUser.mockReset();
    mockSubscribeToChannelActivity.mockReset();
    mockChannelFindUnique.mockReset();
    mockForumMemberFindUnique.mockReset();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const { GET } = await import("@/app/api/channels/[channelId]/stream/route");
    const response = await GET(new Request("http://localhost/api/channels/channel-1/stream"), {
      params: Promise.resolve({ channelId: "channel-1" }),
    });

    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Unauthorized");
  });

  it("returns 404 when the channel does not exist", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockChannelFindUnique.mockResolvedValue(null);

    const { GET } = await import("@/app/api/channels/[channelId]/stream/route");
    const response = await GET(new Request("http://localhost/api/channels/channel-1/stream"), {
      params: Promise.resolve({ channelId: "channel-1" }),
    });

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Not found");
  });

  it("returns 404 when the viewer is not a forum member", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockChannelFindUnique.mockResolvedValue({
      id: "channel-1",
      forumId: "forum-1",
    });
    mockForumMemberFindUnique.mockResolvedValue(null);

    const { GET } = await import("@/app/api/channels/[channelId]/stream/route");
    const response = await GET(new Request("http://localhost/api/channels/channel-1/stream"), {
      params: Promise.resolve({ channelId: "channel-1" }),
    });

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Not found");
  });

  it("opens an event stream and emits refresh events", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockChannelFindUnique.mockResolvedValue({
      id: "channel-1",
      forumId: "forum-1",
    });
    mockForumMemberFindUnique.mockResolvedValue({
      forumId: "forum-1",
      userId: "user-1",
    });

    let listener: (() => void) | undefined;
    const unsubscribe = vi.fn();
    mockSubscribeToChannelActivity.mockImplementation(
      (_channelId, callback: () => void) => {
        listener = callback;
        return unsubscribe;
      },
    );

    const { GET } = await import("@/app/api/channels/[channelId]/stream/route");
    const response = await GET(new Request("http://localhost/api/channels/channel-1/stream"), {
      params: Promise.resolve({ channelId: "channel-1" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
    expect(mockSubscribeToChannelActivity).toHaveBeenCalledWith(
      "channel-1",
      expect.any(Function),
    );

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
