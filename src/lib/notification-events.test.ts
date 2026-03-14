import { describe, expect, it, vi } from "vitest";
import {
  publishNotificationRefresh,
  subscribeToNotificationRefresh,
} from "@/lib/notification-events";

describe("notification event bus", () => {
  it("notifies a subscriber once even when duplicate user ids are published", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToNotificationRefresh("user-1", listener);

    publishNotificationRefresh(["user-1", "user-1"]);

    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("stops notifying after unsubscribe", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToNotificationRefresh("user-1", listener);

    unsubscribe();
    publishNotificationRefresh(["user-1"]);

    expect(listener).not.toHaveBeenCalled();
  });
});
