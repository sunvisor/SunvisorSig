import { EventEmitter } from "node:events";

const globalForNotifications = globalThis as typeof globalThis & {
  notificationEventBus?: EventEmitter;
};

const notificationEventBus =
  globalForNotifications.notificationEventBus ?? new EventEmitter();

notificationEventBus.setMaxListeners(100);
globalForNotifications.notificationEventBus = notificationEventBus;

function getChannelName(userId: string) {
  return `notifications:${userId}`;
}

export function publishNotificationRefresh(userIds: Iterable<string>) {
  const uniqueUserIds = new Set(userIds);

  for (const userId of uniqueUserIds) {
    notificationEventBus.emit(getChannelName(userId));
  }
}

export function subscribeToNotificationRefresh(
  userId: string,
  listener: () => void,
) {
  const channelName = getChannelName(userId);
  notificationEventBus.on(channelName, listener);

  return () => {
    notificationEventBus.off(channelName, listener);
  };
}
