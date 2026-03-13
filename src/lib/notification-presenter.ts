import type { Route } from "next";
import { formatDateTime } from "@/lib/date-time";

export type NotificationListItem = {
  id: string;
  message: string;
  createdAtLabel: string;
  href: Route;
  forumName: string;
  channelName: string;
  postTitle: string;
};

export function serializeNotification(notification: {
  id: string;
  message: string;
  createdAt: Date;
  postId: string;
  post: {
    title: string;
    channelId: string;
    channel: {
      name: string;
      forumId: string;
      forum: {
        name: string;
      };
    };
  };
}): NotificationListItem {
  return {
    id: notification.id,
    message: notification.message,
    createdAtLabel: formatDateTime(notification.createdAt),
    href: `/forums/${notification.post.channel.forumId}/channels/${notification.post.channelId}/posts/${notification.postId}` as Route,
    forumName: notification.post.channel.forum.name,
    channelName: notification.post.channel.name,
    postTitle: notification.post.title,
  };
}
