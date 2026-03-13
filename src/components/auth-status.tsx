import type { Route } from "next";
import { getCurrentUser, logoutAction } from "@/lib/auth";
import { NotificationBell } from "@/components/notification-bell";
import { PrimaryLink } from "@/components/forum-ui";
import { formatDateTime } from "@/lib/date-time";
import { getUnreadNotifications } from "@/lib/notification-service";
import { ui } from "@/lib/ui-classes";

export async function AuthStatus() {
  const user = await getCurrentUser();

  if (!user) {
    return <PrimaryLink href={"/login" as Route}>ログイン</PrimaryLink>;
  }

  const notifications = await getUnreadNotifications(user.id);

  return (
    <div className="flex items-center gap-3">
      <NotificationBell
        notifications={notifications.map((notification) => ({
          id: notification.id,
          message: notification.message,
          createdAtLabel: formatDateTime(notification.createdAt),
          href: `/forums/${notification.post.channel.forumId}/channels/${notification.post.channelId}/posts/${notification.postId}` as Route,
          forumName: notification.post.channel.forum.name,
          channelName: notification.post.channel.name,
          postTitle: notification.post.title,
        }))}
      />
      <div className={`${ui.surface.mutedCard} px-4 py-2`}>
        <p className="theme-text text-sm font-medium">{user.displayName}</p>
        <p className={ui.text.subtleMeta}>
          {user.mentionHandle ? `@${user.mentionHandle}` : user.email ?? "email unset"}
        </p>
      </div>
      <form action={logoutAction}>
        <button className={ui.button.secondary} type="submit">
          ログアウト
        </button>
      </form>
    </div>
  );
}
