import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetCurrentUser = vi.fn();
const mockSerializeChannelPost = vi.fn();
const mockChannelFindUnique = vi.fn();
const mockForumMemberFindUnique = vi.fn();
const mockPostFindMany = vi.fn();

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mockGetCurrentUser,
}));

vi.mock("@/lib/activity-presenter", () => ({
  serializeChannelPost: mockSerializeChannelPost,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    channel: {
      findUnique: mockChannelFindUnique,
    },
    forumMember: {
      findUnique: mockForumMemberFindUnique,
    },
    post: {
      findMany: mockPostFindMany,
    },
  },
}));

describe("/api/channels/[channelId]/posts", () => {
  beforeEach(() => {
    vi.resetModules();
    mockGetCurrentUser.mockReset();
    mockSerializeChannelPost.mockReset();
    mockChannelFindUnique.mockReset();
    mockForumMemberFindUnique.mockReset();
    mockPostFindMany.mockReset();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const { GET } = await import("@/app/api/channels/[channelId]/posts/route");
    const response = await GET(new Request("http://localhost/api/channels/channel-1/posts"), {
      params: Promise.resolve({ channelId: "channel-1" }),
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ posts: [] });
  });

  it("returns 404 when the channel does not exist", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockChannelFindUnique.mockResolvedValue(null);

    const { GET } = await import("@/app/api/channels/[channelId]/posts/route");
    const response = await GET(new Request("http://localhost/api/channels/channel-1/posts"), {
      params: Promise.resolve({ channelId: "channel-1" }),
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ posts: [] });
  });

  it("returns 404 when the viewer is not a forum member", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockChannelFindUnique.mockResolvedValue({
      id: "channel-1",
      forumId: "forum-1",
      forum: {
        id: "forum-1",
      },
    });
    mockForumMemberFindUnique.mockResolvedValue(null);

    const { GET } = await import("@/app/api/channels/[channelId]/posts/route");
    const response = await GET(new Request("http://localhost/api/channels/channel-1/posts"), {
      params: Promise.resolve({ channelId: "channel-1" }),
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ posts: [] });
  });

  it("returns serialized posts with search filters for forum members", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockChannelFindUnique.mockResolvedValue({
      id: "channel-1",
      forumId: "forum-1",
      forum: {
        id: "forum-1",
      },
    });
    mockForumMemberFindUnique.mockResolvedValue({
      forumId: "forum-1",
      userId: "user-1",
    });
    mockPostFindMany.mockResolvedValue([{ id: "post-1" }]);
    mockSerializeChannelPost.mockReturnValue({
      id: "post-1",
      title: "hello",
    });

    const { GET } = await import("@/app/api/channels/[channelId]/posts/route");
    const response = await GET(
      new Request("http://localhost/api/channels/channel-1/posts?q=hello&status=TODO"),
      {
        params: Promise.resolve({ channelId: "channel-1" }),
      },
    );

    expect(mockPostFindMany).toHaveBeenCalledWith({
      where: {
        channelId: "channel-1",
        OR: [
          {
            title: {
              contains: "hello",
              mode: "insensitive",
            },
          },
          {
            bodyMarkdown: {
              contains: "hello",
              mode: "insensitive",
            },
          },
        ],
        status: "TODO",
      },
      orderBy: {
        updatedAt: "desc",
      },
      include: {
        authorUser: true,
        attachments: true,
        comments: true,
      },
    });
    expect(mockSerializeChannelPost).toHaveBeenCalledWith({
      forumId: "forum-1",
      channelId: "channel-1",
      post: {
        id: "post-1",
      },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      posts: [
        {
          id: "post-1",
          title: "hello",
        },
      ],
    });
  });
});
