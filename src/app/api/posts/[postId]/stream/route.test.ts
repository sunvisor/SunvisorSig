import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetCurrentUser = vi.fn();
const mockSubscribeToPostActivity = vi.fn();
const mockPostFindUnique = vi.fn();
const mockForumMemberFindUnique = vi.fn();

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mockGetCurrentUser,
}));

vi.mock("@/lib/notification-events", () => ({
  subscribeToPostActivity: mockSubscribeToPostActivity,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    post: {
      findUnique: mockPostFindUnique,
    },
    forumMember: {
      findUnique: mockForumMemberFindUnique,
    },
  },
}));

describe("/api/posts/[postId]/stream", () => {
  beforeEach(() => {
    vi.resetModules();
    mockGetCurrentUser.mockReset();
    mockSubscribeToPostActivity.mockReset();
    mockPostFindUnique.mockReset();
    mockForumMemberFindUnique.mockReset();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const { GET } = await import("@/app/api/posts/[postId]/stream/route");
    const response = await GET(new Request("http://localhost/api/posts/post-1/stream"), {
      params: Promise.resolve({ postId: "post-1" }),
    });

    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Unauthorized");
  });

  it("returns 404 when the post does not exist", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockPostFindUnique.mockResolvedValue(null);

    const { GET } = await import("@/app/api/posts/[postId]/stream/route");
    const response = await GET(new Request("http://localhost/api/posts/post-1/stream"), {
      params: Promise.resolve({ postId: "post-1" }),
    });

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Not found");
  });

  it("returns 404 when the viewer is not a forum member", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockPostFindUnique.mockResolvedValue({
      id: "post-1",
      channel: {
        forumId: "forum-1",
      },
    });
    mockForumMemberFindUnique.mockResolvedValue(null);

    const { GET } = await import("@/app/api/posts/[postId]/stream/route");
    const response = await GET(new Request("http://localhost/api/posts/post-1/stream"), {
      params: Promise.resolve({ postId: "post-1" }),
    });

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Not found");
  });

  it("opens an event stream and emits refresh events", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockPostFindUnique.mockResolvedValue({
      id: "post-1",
      channel: {
        forumId: "forum-1",
      },
    });
    mockForumMemberFindUnique.mockResolvedValue({
      forumId: "forum-1",
      userId: "user-1",
    });

    let listener: (() => void) | undefined;
    const unsubscribe = vi.fn();
    mockSubscribeToPostActivity.mockImplementation((_postId, callback: () => void) => {
      listener = callback;
      return unsubscribe;
    });

    const { GET } = await import("@/app/api/posts/[postId]/stream/route");
    const response = await GET(new Request("http://localhost/api/posts/post-1/stream"), {
      params: Promise.resolve({ postId: "post-1" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
    expect(mockSubscribeToPostActivity).toHaveBeenCalledWith("post-1", expect.any(Function));

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
