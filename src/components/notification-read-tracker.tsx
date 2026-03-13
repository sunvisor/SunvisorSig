"use client";

import { useEffect } from "react";

type NotificationReadTrackerProps = Readonly<{
  postId: string;
}>;

export function NotificationReadTracker({ postId }: NotificationReadTrackerProps) {
  useEffect(() => {
    let isCancelled = false;

    void fetch("/api/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ postId }),
      credentials: "same-origin",
    }).then(() => {
      if (isCancelled) {
        return;
      }

      window.dispatchEvent(new Event("notifications:refresh"));
    });

    return () => {
      isCancelled = true;
    };
  }, [postId]);

  return null;
}
