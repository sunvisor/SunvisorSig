import { EventEmitter } from "node:events";

const globalForNotifications = globalThis as typeof globalThis & {
  notificationEventBus?: EventEmitter;
};

const notificationEventBus =
  globalForNotifications.notificationEventBus ?? new EventEmitter();

notificationEventBus.setMaxListeners(100);
globalForNotifications.notificationEventBus = notificationEventBus;

function getNotificationChannelName(userId: string) {
  return `notifications:${userId}`;
}

function getPostActivityChannelName(postId: string) {
  return `post-activity:${postId}`;
}

function getChannelActivityChannelName(channelId: string) {
  return `channel-activity:${channelId}`;
}

export function publishNotificationRefresh(userIds: Iterable<string>) {
  const uniqueUserIds = new Set(userIds);

  for (const userId of uniqueUserIds) {
    notificationEventBus.emit(getNotificationChannelName(userId));
  }
}

export function subscribeToNotificationRefresh(
  userId: string,
  listener: () => void,
) {
  const channelName = getNotificationChannelName(userId);
  notificationEventBus.on(channelName, listener);

  return () => {
    notificationEventBus.off(channelName, listener);
  };
}

export function publishPostActivity(postId: string) {
  notificationEventBus.emit(getPostActivityChannelName(postId));
}

export function subscribeToPostActivity(postId: string, listener: () => void) {
  const channelName = getPostActivityChannelName(postId);
  notificationEventBus.on(channelName, listener);

  return () => {
    notificationEventBus.off(channelName, listener);
  };
}

export function publishChannelActivity(channelId: string) {
  notificationEventBus.emit(getChannelActivityChannelName(channelId));
}

export function subscribeToChannelActivity(
  channelId: string,
  listener: () => void,
) {
  const channelName = getChannelActivityChannelName(channelId);
  notificationEventBus.on(channelName, listener);

  return () => {
    notificationEventBus.off(channelName, listener);
  };
}
