import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/app-url", () => ({
  getAppUrl: () => "http://localhost:3000",
}));

describe("buildWebhookRequest", () => {
  it("builds a Slack payload", async () => {
    const { buildWebhookRequest } = await import("@/lib/webhook-delivery");

    expect(
      buildWebhookRequest("SLACK", {
        type: "POST_CREATED",
        title: "新しい投稿",
        summary: "A user created a post.",
        actorDisplayName: "Admin",
        forumName: "Acme Forum",
        channelName: "general",
        postTitle: "Welcome",
        href: "/forums/f-1/channels/c-1/posts/p-1",
      }),
    ).toEqual({
      body: {
        text: [
          "新しい投稿",
          "A user created a post.",
          "",
          "フォーラム: Acme Forum",
          "チャンネル: general",
          "投稿: Welcome",
          "実行者: Admin",
          "URL: http://localhost:3000/forums/f-1/channels/c-1/posts/p-1",
        ].join("\n"),
      },
    });
  });

  it("builds a Discord payload", async () => {
    const { buildWebhookRequest } = await import("@/lib/webhook-delivery");

    const result = buildWebhookRequest("DISCORD", {
      type: "COMMENT_CREATED",
      title: "新しいコメント",
      summary: "A user commented on a post.",
      actorDisplayName: "Member",
      forumName: "Acme Forum",
    });

    expect(result.body).toHaveProperty("content");
    expect(result.body).not.toHaveProperty("text");
  });

  it("builds a Teams adaptive card payload", async () => {
    const { buildWebhookRequest } = await import("@/lib/webhook-delivery");

    const result = buildWebhookRequest("TEAMS", {
      type: "STATUS_CHANGED",
      title: "投稿状態の変更",
      summary: "A user changed the post status.",
      actorDisplayName: "Admin",
      forumName: "Acme Forum",
      postTitle: "Welcome",
    });

    expect(result.body).toHaveProperty("type", "message");
    expect(result.body).toHaveProperty("attachments.0.contentType");
    expect(result.body).toHaveProperty("attachments.0.content.body");
  });

  it("builds a Google Chat payload", async () => {
    const { buildWebhookRequest } = await import("@/lib/webhook-delivery");

    const result = buildWebhookRequest("GOOGLE_CHAT", {
      type: "MENTIONED",
      title: "コメントでメンション",
      summary: "A user mentioned someone in a comment.",
      actorDisplayName: "Member",
      forumName: "Acme Forum",
    });

    expect(result.body).toHaveProperty("text");
  });
});

