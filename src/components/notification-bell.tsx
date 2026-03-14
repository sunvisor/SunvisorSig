"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NotificationListItem } from "@/lib/notification-presenter";
import { ui } from "@/lib/ui-classes";

type NotificationBellProps = Readonly<{
  notifications: NotificationListItem[];
}>;

export function NotificationBell({ notifications }: NotificationBellProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState(notifications);

  useEffect(() => {
    setItems(notifications);
  }, [notifications]);

  const refreshNotifications = useCallback(async () => {
    const response = await fetch("/api/notifications", {
      credentials: "same-origin",
      cache: "no-store",
    });

    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as {
      notifications: NotificationListItem[];
    };

    setItems(data.notifications);
  }, []);

  useEffect(() => {
    void refreshNotifications();
  }, [pathname, refreshNotifications]);

  useEffect(() => {
    const eventSource = new EventSource("/api/notifications/stream");
    const handleRefresh = () => {
      void refreshNotifications();
    };

    eventSource.addEventListener("refresh", handleRefresh);
    window.addEventListener("notifications:refresh", handleRefresh);

    return () => {
      eventSource.removeEventListener("refresh", handleRefresh);
      eventSource.close();
      window.removeEventListener("notifications:refresh", handleRefresh);
    };
  }, [refreshNotifications]);

  const visibleNotifications = items.filter(
    (notification) => notification.href !== pathname,
  );

  return (
    <div className="relative">
      <button
        aria-label="通知を表示"
        className={`${ui.button.iconSecondary} relative`}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <Bell aria-hidden="true" size={16} />
        {visibleNotifications.length > 0 ? (
          <span className="absolute -top-1 -right-1 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            {visibleNotifications.length}
          </span>
        ) : null}
      </button>
      {isOpen ? (
        <div className="theme-card absolute right-0 z-50 mt-3 w-[24rem] rounded-3xl border p-4 shadow-2xl shadow-slate-900/15">
          <div className="flex items-center justify-between gap-3">
            <h3 className="theme-text text-sm font-semibold">未読通知</h3>
            <span className={ui.text.meta}>{visibleNotifications.length} items</span>
          </div>
          {visibleNotifications.length === 0 ? (
            <p className="theme-text-muted mt-4 text-sm">未読通知はありません。</p>
          ) : (
            <div className="mt-4 grid gap-2">
              {visibleNotifications.map((notification) => (
                <Link
                  key={notification.id}
                  className="theme-muted-card block rounded-2xl border p-4 transition hover:border-(--theme-accent)"
                  href={notification.href}
                  onClick={() => setIsOpen(false)}
                >
                  <p className="theme-text text-sm font-medium">{notification.message}</p>
                  <p className="theme-text-muted mt-2 text-sm">
                    {notification.postTitle}
                  </p>
                  <p className={`${ui.text.subtleMeta} mt-2`}>
                    {notification.forumName} / {notification.channelName} / {notification.createdAtLabel}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
