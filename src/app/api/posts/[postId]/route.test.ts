import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetCurrentUser = vi.fn();
const mockSerializePostDetails = vi.fn();
const mockPostFindUnique = vi.fn();
const mockForumMemberFindUnique = vi.fn();

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mockGetCurrentUser,
}));

vi.mock("@/lib/activity-presenter", () => ({
  serializePostDetails: mockSerializePostDetails,
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

describe("/api/posts/[postId]", () => {
  beforeEach(() => {
    vi.resetModules();
    mockGetCurrentUser.mockReset();
    mockSerializePostDetails.mockReset();
    mockPostFindUnique.mockReset();
    mockForumMemberFindUnique.mockReset();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const { GET } = await import("@/app/api/posts/[postId]/route");
    const response = await GET(new Request("http://localhost/api/posts/post-1"), {
      params: Promise.resolve({ postId: "post-1" }),
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ post: null });
  });

  it("returns 404 when the post does not exist", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockPostFindUnique.mockResolvedValue(null);

    const { GET } = await import("@/app/api/posts/[postId]/route");
    const response = await GET(new Request("http://localhost/api/posts/post-1"), {
      params: Promise.resolve({ postId: "post-1" }),
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ post: null });
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

    const { GET } = await import("@/app/api/posts/[postId]/route");
    const response = await GET(new Request("http://localhost/api/posts/post-1"), {
      params: Promise.resolve({ postId: "post-1" }),
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ post: null });
  });

  it("returns serialized post details for forum members", async () => {
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
    mockSerializePostDetails.mockReturnValue({
      id: "post-1",
      title: "hello",
    });

    const { GET } = await import("@/app/api/posts/[postId]/route");
    const response = await GET(new Request("http://localhost/api/posts/post-1"), {
      params: Promise.resolve({ postId: "post-1" }),
    });

    expect(mockPostFindUnique).toHaveBeenCalledWith({
      where: { id: "post-1" },
      include: {
        authorUser: true,
        attachments: true,
        comments: true,
        channel: true,
      },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      post: {
        id: "post-1",
        title: "hello",
      },
    });
  });
});
