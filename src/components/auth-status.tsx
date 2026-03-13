import type { Route } from "next";
import { getCurrentUser, logoutAction } from "@/lib/auth";
import { NotificationBell } from "@/components/notification-bell";
import { PrimaryLink } from "@/components/forum-ui";
import { serializeNotification } from "@/lib/notification-presenter";
import { getUnreadNotifications } from "@/lib/notification-service";
import { ui } from "@/lib/ui-classes";
import Link from "next/link";

export async function AuthStatus() {
  const user = await getCurrentUser();

  if (!user) {
    return <PrimaryLink href={"/login" as Route}>ログイン</PrimaryLink>;
  }

  const notifications = await getUnreadNotifications(user.id);

  return (
    <div className="flex items-center gap-3">
      <NotificationBell notifications={notifications.map(serializeNotification)} />
      <Link
        className={`${ui.surface.mutedCard} block px-4 py-2 no-underline transition hover:border-[color:var(--theme-accent)]`}
        href={"/profile" as Route}
      >
        <p className="theme-text text-sm font-medium">{user.displayName}</p>
        <p className={ui.text.subtleMeta}>
          {user.mentionHandle ? `@${user.mentionHandle}` : user.email ?? "email unset"}
        </p>
      </Link>
      <form action={logoutAction}>
        <button className={ui.button.secondary} type="submit">
          ログアウト
        </button>
      </form>
    </div>
  );
}
