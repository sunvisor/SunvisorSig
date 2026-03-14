import { describe, expect, it } from "vitest";
import { serializeNotification } from "@/lib/notification-presenter";

describe("serializeNotification", () => {
  it("builds a notification list item with a post route", () => {
    const result = serializeNotification({
      id: "notification-1",
      message: "new notification",
      createdAt: new Date("2026-03-14T00:00:00Z"),
      postId: "post-1",
      post: {
        title: "Post title",
        channelId: "channel-1",
        channel: {
          name: "General",
          forumId: "forum-1",
          forum: {
            name: "Forum",
          },
        },
      },
    });

    expect(result.id).toBe("notification-1");
    expect(result.message).toBe("new notification");
    expect(result.href).toBe("/forums/forum-1/channels/channel-1/posts/post-1");
    expect(result.forumName).toBe("Forum");
    expect(result.channelName).toBe("General");
    expect(result.postTitle).toBe("Post title");
    expect(result.createdAtLabel.length).toBeGreaterThan(0);
  });
});
