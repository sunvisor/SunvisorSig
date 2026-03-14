import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetCurrentUser = vi.fn();
const mockSerializeComment = vi.fn();
const mockPostFindUnique = vi.fn();
const mockForumMemberFindUnique = vi.fn();
const mockCommentFindMany = vi.fn();

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mockGetCurrentUser,
}));

vi.mock("@/lib/activity-presenter", () => ({
  serializeComment: mockSerializeComment,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    post: {
      findUnique: mockPostFindUnique,
    },
    forumMember: {
      findUnique: mockForumMemberFindUnique,
    },
    comment: {
      findMany: mockCommentFindMany,
    },
  },
}));

describe("/api/posts/[postId]/comments", () => {
  beforeEach(() => {
    vi.resetModules();
    mockGetCurrentUser.mockReset();
    mockSerializeComment.mockReset();
    mockPostFindUnique.mockReset();
    mockForumMemberFindUnique.mockReset();
    mockCommentFindMany.mockReset();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const { GET } = await import("@/app/api/posts/[postId]/comments/route");
    const response = await GET(new Request("http://localhost/api/posts/post-1/comments"), {
      params: Promise.resolve({ postId: "post-1" }),
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ comments: [] });
  });

  it("returns 404 when the post does not exist", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    mockPostFindUnique.mockResolvedValue(null);

    const { GET } = await import("@/app/api/posts/[postId]/comments/route");
    const response = await GET(new Request("http://localhost/api/posts/post-1/comments"), {
      params: Promise.resolve({ postId: "post-1" }),
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ comments: [] });
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

    const { GET } = await import("@/app/api/posts/[postId]/comments/route");
    const response = await GET(new Request("http://localhost/api/posts/post-1/comments"), {
      params: Promise.resolve({ postId: "post-1" }),
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ comments: [] });
  });

  it("returns serialized comments for forum members", async () => {
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
    mockCommentFindMany.mockResolvedValue([{ id: "comment-1" }]);
    mockSerializeComment.mockReturnValue({
      id: "comment-1",
      bodyMarkdown: "hello",
    });

    const { GET } = await import("@/app/api/posts/[postId]/comments/route");
    const response = await GET(new Request("http://localhost/api/posts/post-1/comments"), {
      params: Promise.resolve({ postId: "post-1" }),
    });

    expect(mockCommentFindMany).toHaveBeenCalledWith({
      where: {
        postId: "post-1",
      },
      orderBy: {
        createdAt: "asc",
      },
      include: {
        authorUser: true,
        attachments: true,
      },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      comments: [
        {
          id: "comment-1",
          bodyMarkdown: "hello",
        },
      ],
    });
  });
});
